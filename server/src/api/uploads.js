// GCS upload endpoints — signed-URL direct-to-GCS flow.
//
// Flow:
//   1. Client POST /api/uploads/sign        { kind, filename, contentType, size }
//                  → { objectKey, uploadUrl, expiresAt, publicUrl }
//   2. Client PUT  <uploadUrl>  (raw bytes, Content-Type must match)
//   3. Client POST /api/uploads/commit      { objectKey, clientMeta? }
//                  → { publicUrl, size, contentType, md5Hash, etag }
//
// For videos > 20MB, step 1 goes to /sign-resumable and client uses GCS
// resumable session upload protocol instead (supports pause/resume).

import { Router } from 'express';
import axios from 'axios';
import {
  buildObjectKey,
  signUploadUrl,
  signResumableUrl,
  getObjectMetadata,
  buildPublicUrl,
  normalizeMime,
  assertOwnedKey,
} from '../lib/gcs.js';
import { supabase } from '../lib/supabase.js';

const router = Router();

// ── Size caps (soft gate at /sign; GCS enforces at upload via precondition) ──
const MAX_SIZE_BY_KIND = {
  chat: 200 * 1024 * 1024,      // 200MB — images/short video in chat
  skills: 25 * 1024 * 1024,     // 25MB — skill docs (PDF/DOC/XLS)
  brand: 50 * 1024 * 1024,      // 50MB — brand assets
  creative: 4 * 1024 * 1024 * 1024, // 4GB — Meta ad videos ceiling
};

// Resumable required above this — PUT doesn't scale for huge uploads.
const RESUMABLE_THRESHOLD = 32 * 1024 * 1024; // 32MB

// ── Auth middleware (same shape as skills.js) ────────────────────────────────
// Identity comes from the shared resolver (cookie session or Bearer
// fallback). Uploads is gated though — it must know who you are before
// signing GCS URLs — so we add an explicit guard on top.
import { resolveUser } from '../middleware/resolveUser.js';

router.use(resolveUser);
router.use((req, res, next) => {
  if (!req.fbUserId) return res.status(401).json({ error: 'Authentication required' });
  next();
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function validateSignBody(body) {
  const { kind, filename, contentType, size } = body || {};
  if (!kind || typeof kind !== 'string') {
    return { error: 'kind is required' };
  }
  if (!filename || typeof filename !== 'string') {
    return { error: 'filename is required' };
  }
  const mime = normalizeMime(contentType);
  if (!mime) {
    return { error: `unsupported contentType: ${contentType}` };
  }
  const declaredSize = Number(size);
  if (!Number.isFinite(declaredSize) || declaredSize <= 0) {
    return { error: 'size must be a positive integer' };
  }
  const cap = MAX_SIZE_BY_KIND[kind];
  if (!cap) {
    return { error: `unknown kind: ${kind}` };
  }
  if (declaredSize > cap) {
    return { error: `file exceeds ${kind} size cap (${cap} bytes)` };
  }
  return { kind, filename, mime, size: declaredSize };
}

async function recordPendingUpload({ objectKey, userId, kind, mime, declaredSize, filename }) {
  if (!supabase) return;
  try {
    await supabase.from('uploads').insert({
      object_key: objectKey,
      fb_user_id: userId,
      kind,
      content_type: mime,
      declared_size: declaredSize,
      original_filename: String(filename).slice(0, 255),
      status: 'pending',
    });
  } catch (err) {
    // Non-fatal — the upload can still proceed; commit will upsert.
    console.warn('[uploads] pending insert failed', err.message);
  }
}

async function markCommitted({ objectKey, userId, meta }) {
  if (!supabase) return;
  try {
    await supabase.from('uploads').upsert({
      object_key: objectKey,
      fb_user_id: userId,
      status: 'committed',
      actual_size: meta.size,
      content_type: meta.contentType,
      md5_hash: meta.md5Hash,
      etag: meta.etag,
      generation: String(meta.generation ?? ''),
      committed_at: new Date().toISOString(),
    }, { onConflict: 'object_key' });
  } catch (err) {
    console.warn('[uploads] commit upsert failed', err.message);
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/uploads/sign
 * Body: { kind, filename, contentType, size }
 * Returns: { objectKey, uploadUrl, expiresAt, publicUrl, resumableRequired? }
 *
 * If size >= 32MB, responds with { resumableRequired: true } — client should
 * re-request via /sign-resumable. Keeps simple PUT path on the fast lane.
 */
router.post('/sign', async (req, res) => {
  const v = validateSignBody(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  if (v.size >= RESUMABLE_THRESHOLD) {
    return res.status(413).json({
      error: 'file too large for PUT — use /sign-resumable',
      resumableRequired: true,
      threshold: RESUMABLE_THRESHOLD,
    });
  }

  try {
    const objectKey = buildObjectKey({
      kind: v.kind,
      userId: req.fbUserId,
      mime: v.mime,
      filename: v.filename,
    });
    const { url, expiresAt } = await signUploadUrl({
      objectKey,
      contentType: v.mime,
    });
    await recordPendingUpload({
      objectKey,
      userId: req.fbUserId,
      kind: v.kind,
      mime: v.mime,
      declaredSize: v.size,
      filename: v.filename,
    });
    res.json({
      objectKey,
      uploadUrl: url,
      contentType: v.mime,
      expiresAt,
      publicUrl: buildPublicUrl(objectKey),
    });
  } catch (err) {
    console.error('[uploads] /sign failed', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/uploads/sign-resumable
 * Same body as /sign. Returns a GCS resumable session initiation URL.
 * Client initiates session with POST then uploads chunks per the GCS protocol.
 */
router.post('/sign-resumable', async (req, res) => {
  const v = validateSignBody(req.body);
  if (v.error) return res.status(400).json({ error: v.error });

  try {
    const objectKey = buildObjectKey({
      kind: v.kind,
      userId: req.fbUserId,
      mime: v.mime,
      filename: v.filename,
    });
    const { url, expiresAt } = await signResumableUrl({
      objectKey,
      contentType: v.mime,
    });
    await recordPendingUpload({
      objectKey,
      userId: req.fbUserId,
      kind: v.kind,
      mime: v.mime,
      declaredSize: v.size,
      filename: v.filename,
    });
    res.json({
      objectKey,
      sessionUrl: url,
      contentType: v.mime,
      expiresAt,
      publicUrl: buildPublicUrl(objectKey),
    });
  } catch (err) {
    console.error('[uploads] /sign-resumable failed', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/uploads/commit
 * Body: { objectKey }
 * Verifies the object actually exists in GCS, records final metadata.
 */
router.post('/commit', async (req, res) => {
  const { objectKey } = req.body || {};
  if (!objectKey) return res.status(400).json({ error: 'objectKey required' });

  try {
    assertOwnedKey(objectKey);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    const meta = await getObjectMetadata(objectKey);
    await markCommitted({ objectKey, userId: req.fbUserId, meta });
    res.json({
      objectKey,
      publicUrl: buildPublicUrl(objectKey),
      size: meta.size,
      contentType: meta.contentType,
      md5Hash: meta.md5Hash,
      etag: meta.etag,
    });
  } catch (err) {
    // Most likely 404 — client PUT hasn't actually landed yet.
    const status = err.code === 404 ? 404 : 500;
    console.error('[uploads] /commit failed', err.message);
    res.status(status).json({ error: err.message });
  }
});

export default router;
