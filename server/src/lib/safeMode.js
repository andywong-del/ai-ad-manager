// SAFE_MODE — hard guardrails for AI write operations.
//
// Two mechanisms:
//
// 1. DRY RUN (SAFE_MODE_DRY_RUN=true): all write tools short-circuit and
//    return a synthetic [DRY RUN] payload. Nothing is sent to Meta/Google.
//
// 2. Out-of-band confirmation for high-risk writes. The AI cannot approve
//    itself — approval must come from an authenticated HTTP call the user
//    initiates (POST /api/confirmations/:id/approve).
//    Flow:
//      - Risk detected → insert pending_confirmations row (approved=false)
//      - Return pending_id to AI in the CONFIRMATION_REQUIRED payload
//      - User hits /approve endpoint → row flipped to approved=true
//      - AI retries with confirm_id = pending_id
//      - Server verifies: exists, approved, not consumed, not expired, and
//        args_hash matches → consume row, execute tool
//
// Both Meta and Google tool wrappers plug into this via assessRisk + the
// pending-confirmation helpers.

import crypto from 'crypto';
import { supabase } from './supabase.js';
import { resolveFbUserId } from './auditLog.js';

const HIGH_RISK_NAME_PATTERNS = [
  /^delete_/,                      // delete_campaign, delete_ad_set, delete_ad
  /_bulk$/,                        // bulk update/create
  /^google_apply_recommendation$/, // applies a Google recommendation
];

const DANGEROUS_STATUSES = new Set(['PAUSED', 'DELETED', 'ARCHIVED', 'REMOVED']);
const BUDGET_FIELDS = ['daily_budget', 'lifetime_budget'];

export function isDryRun() {
  return process.env.SAFE_MODE_DRY_RUN === 'true';
}

export function assessRisk(toolName, args = {}) {
  if (HIGH_RISK_NAME_PATTERNS.some((re) => re.test(toolName))) {
    return { high: true, reason: `${toolName} is destructive or bulk.` };
  }
  const isUpdate = /^update_/.test(toolName) || /^google_update_/.test(toolName);
  if (isUpdate) {
    for (const field of BUDGET_FIELDS) {
      if (args?.[field] != null) {
        return { high: true, reason: `Budget change detected (${field}=${args[field]}).` };
      }
    }
    const status = args?.status && String(args.status).toUpperCase();
    if (status && DANGEROUS_STATUSES.has(status)) {
      return { high: true, reason: `Status change to ${status}.` };
    }
  }
  return { high: false };
}

export function buildConfirmationRequiredResponse({ toolName, args, reason, pendingId }) {
  return {
    error: 'CONFIRMATION_REQUIRED',
    risk: 'high',
    reason,
    action: toolName,
    args,
    pending_id: pendingId,
    approval_endpoint: `/api/confirmations/${pendingId}/approve`,
    how_to_proceed:
      `This is a high-risk action. AI CANNOT self-approve. Tell the user EXACTLY what will change, then STOP and wait for them to approve at ${`/api/confirmations/${pendingId}/approve`}. The UI will handle this automatically when the user confirms. Only after the user has approved out-of-band may you retry this exact tool call with \`confirm_id\` set to "${pendingId}". Do NOT retry immediately — passing confirm_id without server-side approval will be rejected and logged.`,
  };
}

export function buildDryRunResponse({ toolName, args }) {
  return {
    dry_run: true,
    action: toolName,
    args,
    message: `[DRY RUN] Would have called ${toolName}. No external API call was made because SAFE_MODE_DRY_RUN=true.`,
  };
}

// Strip internal guardrail fields before handing args to the real API.
export function stripConfirm(args) {
  if (!args || typeof args !== 'object') return args;
  const { confirm, confirm_id, ...rest } = args;
  return rest;
}

// Canonical hash of the args we're about to execute — used to ensure AI
// can't get a confirmation for { budget: 100 } and then execute { budget: 10000 }.
function hashArgs(args) {
  const clean = stripConfirm(args || {});
  const keys = Object.keys(clean).sort();
  const canonical = JSON.stringify(clean, keys);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

/**
 * Create a pending_confirmations row and return its id.
 * Fire-and-forget on supabase failure (returns null so caller can degrade).
 */
export async function createPendingConfirmation({ toolName, args, reason, ctx }) {
  const id = crypto.randomUUID();
  if (!supabase || typeof supabase.from !== 'function') {
    console.warn('[safeMode] supabase unavailable — cannot persist pending confirmation');
    return id; // still return id so AI sees something; but approval will fail
  }
  const fbUserId = await resolveFbUserId(ctx).catch(() => null);
  const sessionId = ctx?.session?.id || null;
  const argsHash = hashArgs(args);
  const { error } = await supabase.from('pending_confirmations').insert({
    id,
    fb_user_id: fbUserId,
    session_id: sessionId,
    tool_name: toolName,
    args: stripConfirm(args || {}),
    args_hash: argsHash,
    reason: reason || null,
  });
  if (error) console.error('[safeMode] createPendingConfirmation error:', error.message);
  return id;
}

/**
 * Verify the AI's retry. Must match: exists, approved, not consumed, not
 * expired, same tool, same args. On success, mark row consumed atomically.
 * Returns { valid, reason? }.
 */
export async function verifyConfirmation({ toolName, args, ctx }) {
  const confirmId = args?.confirm_id;
  if (!confirmId || typeof confirmId !== 'string') return { valid: false, reason: 'missing_confirm_id' };
  if (!supabase || typeof supabase.from !== 'function') return { valid: false, reason: 'no_supabase' };

  const { data, error } = await supabase
    .from('pending_confirmations')
    .select('id, tool_name, args_hash, approved, consumed, expires_at, session_id')
    .eq('id', confirmId)
    .maybeSingle();

  if (error) { console.error('[safeMode] verify error:', error.message); return { valid: false, reason: 'lookup_failed' }; }
  if (!data) return { valid: false, reason: 'unknown_id' };
  if (data.consumed) return { valid: false, reason: 'already_used' };
  if (!data.approved) return { valid: false, reason: 'not_approved' };
  if (new Date(data.expires_at) < new Date()) return { valid: false, reason: 'expired' };
  if (data.tool_name !== toolName) return { valid: false, reason: 'tool_mismatch' };
  if (data.args_hash !== hashArgs(args)) return { valid: false, reason: 'args_mismatch' };

  // Bind to session if the pending was created in one — prevents cross-session replay.
  const sessionId = ctx?.session?.id || null;
  if (data.session_id && sessionId && data.session_id !== sessionId) {
    return { valid: false, reason: 'session_mismatch' };
  }

  // Mark consumed. If the update fails we still allow the call — don't block
  // legitimate work on a DB hiccup — but log loudly.
  const { error: updateErr } = await supabase
    .from('pending_confirmations')
    .update({ consumed: true, consumed_at: new Date().toISOString() })
    .eq('id', confirmId)
    .eq('consumed', false);
  if (updateErr) console.error('[safeMode] consume error:', updateErr.message);

  return { valid: true };
}
