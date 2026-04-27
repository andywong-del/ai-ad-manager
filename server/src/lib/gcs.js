// Google Cloud Storage — signed upload URL helper
//
// Bucket is shared with other PressLogic projects. All writes MUST go under
// GCS_PREFIX (default `ai-ad-manager/`). Object keys are built server-side;
// clients never specify paths.
//
// Auth:
//   - Local dev: set GCP_KEY_FILE to the service account JSON path
//   - Cloud Run: attach the service account via --service-account flag.
//     Leave GCP_KEY_FILE unset; SDK auto-discovers via metadata server.

import { Storage } from '@google-cloud/storage';
import crypto from 'node:crypto';
import path from 'node:path';

const DEFAULT_PREFIX = 'ai-ad-manager/';

// One kind per high-level surface. Adding a new kind requires updating this
// list — guards against typo'd paths and makes audit queries trivial.
const ALLOWED_KINDS = new Set(['chat', 'skills', 'brand', 'creative']);

// Small, explicit mime allow-list. Everything else is rejected at /sign time.
// Callers can pass variants (e.g. `image/jpg` → `image/jpeg`) and we normalize.
const ALLOWED_MIME = new Set([
  // images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  // videos
  'video/mp4',
  'video/quicktime',
  'video/webm',
  // docs (skill uploads)
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const MIME_ALIASES = {
  'image/jpg': 'image/jpeg',
  'image/pjpeg': 'image/jpeg',
};

// Extension by mime — authoritative, not derived from user filename.
const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
};

let _storage = null;

function getStorage() {
  if (_storage) return _storage;
  const projectId = process.env.GCP_PROJECT_ID;
  const keyFilename = process.env.GCP_KEY_FILE || undefined;
  if (!projectId) {
    throw new Error('[gcs] GCP_PROJECT_ID not configured');
  }
  _storage = new Storage({ projectId, keyFilename });
  return _storage;
}

export function getPrefix() {
  const p = process.env.GCS_PREFIX || DEFAULT_PREFIX;
  return p.endsWith('/') ? p : `${p}/`;
}

export function getBucketName() {
  const name = process.env.GCS_BUCKET_NAME;
  if (!name) throw new Error('[gcs] GCS_BUCKET_NAME not configured');
  return name;
}

export function normalizeMime(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  const canonical = MIME_ALIASES[lower] || lower;
  return ALLOWED_MIME.has(canonical) ? canonical : null;
}

// Derive a safe extension, preferring mime-authoritative mapping over the
// user-supplied filename. Falls back to the filename's extension only for
// mimes we don't know (should not happen after normalizeMime).
export function deriveExtension(mime, filename) {
  if (mime && EXT_BY_MIME[mime]) return EXT_BY_MIME[mime];
  const ext = path.extname(filename || '').toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(ext) ? ext : '';
}

function sanitizeIdSegment(v) {
  // Keep alphanumerics + dash/underscore. Collapse everything else.
  const s = String(v || '').replace(/[^a-zA-Z0-9_-]+/g, '').slice(0, 64);
  return s || 'anon';
}

/**
 * Build the canonical object key for a new upload.
 * Clients MUST NOT provide this — they only tell us kind + userId + filename.
 *
 *   ai-ad-manager/<kind>/<userId>/<yyyy-mm>/<uuid><ext>
 */
export function buildObjectKey({ kind, userId, mime, filename }) {
  if (!ALLOWED_KINDS.has(kind)) {
    throw new Error(`[gcs] invalid kind: ${kind}`);
  }
  const uid = sanitizeIdSegment(userId);
  const ext = deriveExtension(mime, filename);
  const yyyymm = new Date().toISOString().slice(0, 7); // 2026-04
  const uuid = crypto.randomUUID();
  return `${getPrefix()}${kind}/${uid}/${yyyymm}/${uuid}${ext}`;
}

// Defensive check — any code path that touches a GCS object must pass this
// first. Prevents a future bug from writing/reading outside our prefix.
export function assertOwnedKey(objectKey) {
  const prefix = getPrefix();
  if (typeof objectKey !== 'string' || !objectKey.startsWith(prefix)) {
    throw new Error(`[gcs] objectKey not owned by this project: ${objectKey}`);
  }
  if (objectKey.includes('..') || objectKey.includes('//')) {
    throw new Error(`[gcs] suspicious objectKey: ${objectKey}`);
  }
}

/**
 * Sign a V4 PUT URL for direct-browser upload.
 * Expires in 15 minutes. Client PUTs raw bytes with matching Content-Type.
 */
export async function signUploadUrl({ objectKey, contentType, expiresInSeconds = 15 * 60 }) {
  assertOwnedKey(objectKey);
  const mime = normalizeMime(contentType);
  if (!mime) throw new Error(`[gcs] unsupported contentType: ${contentType}`);

  const file = getStorage().bucket(getBucketName()).file(objectKey);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + expiresInSeconds * 1000,
    contentType: mime,
  });
  return { url, contentType: mime, expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString() };
}

/**
 * Sign a resumable session URL for large files (videos).
 * Returns the initial POST URL; client then uploads in chunks with standard
 * GCS resumable protocol (supports pause/resume).
 */
export async function signResumableUrl({ objectKey, contentType, expiresInSeconds = 60 * 60 }) {
  assertOwnedKey(objectKey);
  const mime = normalizeMime(contentType);
  if (!mime) throw new Error(`[gcs] unsupported contentType: ${contentType}`);

  const file = getStorage().bucket(getBucketName()).file(objectKey);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'resumable',
    expires: Date.now() + expiresInSeconds * 1000,
    contentType: mime,
  });
  return { url, contentType: mime, expiresAt: new Date(Date.now() + expiresInSeconds * 1000).toISOString() };
}

/**
 * Commit-time verification. Confirms the object exists and returns server-side
 * truth (size, contentType, md5Hash, generation) — we trust this over anything
 * the client self-reported.
 */
export async function getObjectMetadata(objectKey) {
  assertOwnedKey(objectKey);
  const file = getStorage().bucket(getBucketName()).file(objectKey);
  const [meta] = await file.getMetadata();
  return {
    name: meta.name,
    size: Number(meta.size),
    contentType: meta.contentType,
    md5Hash: meta.md5Hash,
    etag: meta.etag,
    generation: meta.generation,
    updated: meta.updated,
  };
}

/**
 * Public URL the client/Meta can fetch — uses the CDN domain if configured,
 * else falls back to gs:// for internal handlers.
 */
export function buildPublicUrl(objectKey) {
  assertOwnedKey(objectKey);
  const cdn = process.env.GCS_CDN_DOMAIN;
  if (cdn) {
    const base = cdn.endsWith('/') ? cdn.slice(0, -1) : cdn;
    return `${base}/${objectKey}`;
  }
  // No CDN → return gs:// (handlers needing HTTP can sign a GET URL instead).
  return `gs://${getBucketName()}/${objectKey}`;
}

/**
 * Signed GET URL — for cases where we need a time-limited HTTPS URL even
 * without CDN (e.g. internal handlers passing to Meta bytes endpoint).
 */
export async function signReadUrl({ objectKey, expiresInSeconds = 10 * 60 }) {
  assertOwnedKey(objectKey);
  const file = getStorage().bucket(getBucketName()).file(objectKey);
  const [url] = await file.getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiresInSeconds * 1000,
  });
  return url;
}

export const __internals = {
  ALLOWED_KINDS,
  ALLOWED_MIME,
  EXT_BY_MIME,
  sanitizeIdSegment,
};
