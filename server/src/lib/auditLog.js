import axios from 'axios';
import { supabase } from './supabase.js';

// Meta + Google write-tool detection.
//
// Explicit allowlist (was a regex on tool-name prefixes). The regex silently
// missed any write tool that didn't follow the create_/update_/delete_/copy_
// naming convention — most notably apply_campaign_template, setup_ab_test,
// add_users_to_audience, assign_label — so those bypassed both the audit log
// AND the safe-mode confirmation gate. An allowlist makes "is this a write?"
// reviewable at a glance and forces anyone adding a new write tool to
// register it here on purpose.
//
// Anything not in this set is treated as read-only: no audit row, no
// confirmation prompt. Internal-state tools (load_skill, get_workflow_context,
// update_workflow_context, etc.) are deliberately excluded.
const WRITE_TOOLS = new Set([
  // Meta — campaigns / ad sets / ads (CRUD + bulk)
  'create_campaign', 'update_campaign', 'delete_campaign', 'copy_campaign',
  'create_ad_set', 'update_ad_set', 'delete_ad_set', 'copy_ad_set',
  'create_ad', 'update_ad', 'delete_ad', 'copy_ad',
  'create_ads_bulk', 'update_campaigns_bulk', 'update_ad_sets_bulk', 'update_ads_bulk',
  // Creatives + media
  'create_ad_creative', 'update_ad_creative', 'delete_ad_creative',
  'upload_ad_image', 'upload_ad_video', 'delete_ad_image',
  // Audiences (membership writes are real spend-adjacent operations)
  'create_custom_audience', 'update_custom_audience', 'delete_custom_audience',
  'create_lookalike_audience',
  'create_saved_audience', 'delete_saved_audience',
  'add_users_to_audience', 'remove_users_from_audience',
  // Rules / labels / pixels
  'create_ad_rule', 'update_ad_rule', 'delete_ad_rule',
  'create_ad_label', 'assign_label',
  'create_pixel', 'update_pixel',
  // Conversions / lead forms
  'send_conversion_event', 'create_custom_conversion',
  'create_lead_form',
  // Templates / experiments — apply_campaign_template actually creates a
  // campaign and setup_ab_test deep-copies one, so they MUST gate.
  'save_campaign_template', 'delete_campaign_template', 'apply_campaign_template',
  'setup_ab_test',
  // Google Ads
  'google_create_campaign', 'google_update_campaign',
  'google_add_keywords', 'google_add_negative_keywords',
  'google_set_campaign_targeting', 'google_apply_recommendation',
  'google_create_custom_audience', 'google_create_website_visitors_audience',
]);

export function isWriteTool(name) {
  return !!name && WRITE_TOOLS.has(name);
}

export function platformOf(name) {
  return name.startsWith('google_') ? 'google' : 'meta';
}

// Avoid blowing up the row on huge payloads (bulk ops can be large).
const MAX_JSON_CHARS = 20_000;
function truncate(obj) {
  if (obj == null) return null;
  try {
    const s = JSON.stringify(obj);
    if (s.length <= MAX_JSON_CHARS) return obj;
    return { _truncated: true, _size: s.length, preview: s.slice(0, MAX_JSON_CHARS) };
  } catch {
    return { _unserializable: true };
  }
}

// Resolve fb_user_id from the FB token in the agent context.
// Cached per-token so we don't hit Graph API on every write call.
const _fbUserCache = new Map();
export async function resolveFbUserId(ctx) {
  const token = ctx?.state?.get?.('token');
  if (!token) return null;
  if (_fbUserCache.has(token)) return _fbUserCache.get(token);
  try {
    const { data } = await axios.get(
      `https://graph.facebook.com/v25.0/me?fields=id&access_token=${token}`,
      { timeout: 3000 }
    );
    if (data?.id) { _fbUserCache.set(token, data.id); return data.id; }
  } catch {}
  return null;
}

/**
 * Fire-and-forget audit write. Never throws — audit must not break the tool call.
 */
export async function logAudit({ toolName, ctx, args, result, success, errorMessage, durationMs }) {
  try {
    if (!supabase || typeof supabase.from !== 'function') return;

    const fbUserId = await resolveFbUserId(ctx);
    const sessionId = ctx?.session?.id || null;
    const platform = platformOf(toolName);
    const adAccountId = platform === 'google'
      ? (args?.accountId || ctx?.state?.get?.('googleCustomerId') || null)
      : (ctx?.state?.get?.('adAccountId') || null);

    const { error } = await supabase.from('audit_log').insert({
      fb_user_id: fbUserId,
      session_id: sessionId,
      platform,
      tool_name: toolName,
      ad_account_id: adAccountId,
      args: truncate(args),
      result: success ? truncate(result) : null,
      success,
      error_message: errorMessage || null,
      duration_ms: durationMs ?? null,
    });
    if (error) console.error('[audit] insert error:', error.message);
  } catch (e) {
    console.error('[audit] unexpected error:', e.message);
  }
}
