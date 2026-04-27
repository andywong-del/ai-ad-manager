// Client-side GCS direct-upload helper.
//
// Flow per file:
//   1. POST /api/uploads/sign  → get { uploadUrl, objectKey, publicUrl }
//   2. PUT bytes to uploadUrl  (XHR, so we get real progress events)
//   3. POST /api/uploads/commit → server verifies + registers
//
// Large files (>= 32MB) should use uploadToGcsResumable instead, which handles
// chunked resumable session uploads.
//
// Returns { objectKey, publicUrl, size, contentType, md5Hash }.

import { useCallback, useRef, useState } from 'react';

const RESUMABLE_THRESHOLD = 32 * 1024 * 1024; // keep in sync with server

// Auth used to be a Bearer header pulled from localStorage; it now rides on
// the HttpOnly aam_session cookie, which fetch sends automatically when
// `credentials: 'include'` is set. fetchJson injects that for us.

async function fetchJson(url, init) {
  const res = await fetch(url, { credentials: 'include', ...init });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { error: text }; }
  if (!res.ok) throw new Error(data?.error || `${url} → HTTP ${res.status}`);
  return data;
}

/**
 * PUT `file` to a signed URL with progress reporting via XHR.
 * Resolves when upload completes; rejects on non-2xx.
 */
function putWithProgress({ uploadUrl, file, contentType, onProgress, signal }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', contentType);

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`GCS PUT failed: ${xhr.status} ${xhr.responseText?.slice(0, 200)}`));
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));

    if (signal) {
      if (signal.aborted) { xhr.abort(); return; }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }

    xhr.send(file);
  });
}

/**
 * Resumable session uploader — for files > RESUMABLE_THRESHOLD.
 * Uses the GCS XML resumable protocol: initiate session → upload in chunks →
 * server tells us how much it received so we can resume on disconnect.
 *
 * This is the "honest" path for 4GB videos. For M2 we only trigger it above
 * 32MB; below that, direct PUT is simpler.
 */
async function putResumableWithProgress({ sessionUrl, file, contentType, onProgress, signal }) {
  // Step A: initiate — POST with 0-byte body asks GCS to give us an upload URL
  //         (the signed URL IS the session-init URL from server /sign-resumable).
  const initRes = await fetch(sessionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'x-goog-resumable': 'start',
      'Content-Length': '0',
    },
    signal,
  });
  if (!initRes.ok) {
    throw new Error(`resumable init failed: ${initRes.status}`);
  }
  const sessionLocation = initRes.headers.get('Location');
  if (!sessionLocation) throw new Error('resumable init: no Location header');

  // Step B: PUT the bytes in one shot with progress (simple path).
  // GCS supports chunked PUT with Content-Range, but 32MB+ single PUT works
  // fine up to ~5GB; chunking only matters for pause/resume-across-reload
  // which we can layer on later.
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', sessionLocation);
    xhr.setRequestHeader('Content-Type', contentType);
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.round((evt.loaded / evt.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`resumable PUT failed: ${xhr.status}`));
    };
    xhr.onerror = () => reject(new Error('Network error during resumable upload'));
    xhr.onabort = () => reject(new DOMException('Upload aborted', 'AbortError'));
    if (signal) {
      if (signal.aborted) { xhr.abort(); return; }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(file);
  });
}

/**
 * Core function: upload one file to GCS, returns GCS metadata.
 * Callable outside React (tests, utility code).
 */
export async function uploadToGcs(file, {
  kind = 'chat',          // chat | skills | brand | creative
  contentType,            // optional override; defaults to file.type
  onProgress,             // (percent) => void
  signal,                 // AbortSignal
} = {}) {
  const mime = contentType || file.type;
  if (!mime) throw new Error('file has no MIME type');

  const isResumable = file.size >= RESUMABLE_THRESHOLD;
  const endpoint = isResumable ? '/api/uploads/sign-resumable' : '/api/uploads/sign';

  // Step 1 — get signed URL
  const signed = await fetchJson(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      kind,
      filename: file.name,
      contentType: mime,
      size: file.size,
    }),
    signal,
  });

  // Step 2 — PUT to GCS (or resumable session)
  if (isResumable) {
    await putResumableWithProgress({
      sessionUrl: signed.sessionUrl,
      file,
      contentType: signed.contentType,
      onProgress,
      signal,
    });
  } else {
    await putWithProgress({
      uploadUrl: signed.uploadUrl,
      file,
      contentType: signed.contentType,
      onProgress,
      signal,
    });
  }

  // Step 3 — commit (server verifies existence + records)
  const committed = await fetchJson('/api/uploads/commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ objectKey: signed.objectKey }),
    signal,
  });

  return {
    objectKey: committed.objectKey,
    publicUrl: committed.publicUrl,
    size: committed.size,
    contentType: committed.contentType,
    md5Hash: committed.md5Hash,
    etag: committed.etag,
  };
}

/**
 * React hook — tracks per-file state in a Map and exposes a cancel API.
 * Suitable for M2 attachment bar / upload preview bubble.
 *
 * Usage:
 *   const { items, enqueue, cancel, remove, reset } = useGcsUpload();
 *   <input onChange={e => enqueue(Array.from(e.target.files), { kind: 'chat' })}/>
 *
 * Each item:
 *   { id, file, status: 'queued'|'uploading'|'done'|'error'|'canceled',
 *     progress, result?, error?, preview? }
 */
export function useGcsUpload() {
  const [items, setItems] = useState([]);
  const controllers = useRef(new Map()); // id -> AbortController

  const update = useCallback((id, patch) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...patch } : it));
  }, []);

  const startOne = useCallback(async (item, opts) => {
    const controller = new AbortController();
    controllers.current.set(item.id, controller);

    update(item.id, { status: 'uploading', progress: 0, error: null });

    try {
      const result = await uploadToGcs(item.file, {
        kind: opts.kind || 'chat',
        contentType: item.file.type,
        signal: controller.signal,
        onProgress: (p) => update(item.id, { progress: p }),
      });
      update(item.id, { status: 'done', progress: 100, result });
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      update(item.id, {
        status: isAbort ? 'canceled' : 'error',
        error: isAbort ? null : err.message,
      });
    } finally {
      controllers.current.delete(item.id);
    }
  }, [update]);

  const enqueue = useCallback((files, opts = {}) => {
    const newItems = files.map((file) => {
      const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const preview = file.type?.startsWith('image/') ? URL.createObjectURL(file) : null;
      return { id, file, preview, status: 'queued', progress: 0, result: null, error: null };
    });
    setItems(prev => [...prev, ...newItems]);
    // Kick off each immediately. Server is stateless so parallelism is fine;
    // real-world bottleneck is user's upload bandwidth.
    newItems.forEach(it => startOne(it, opts));
    return newItems.map(i => i.id);
  }, [startOne]);

  const cancel = useCallback((id) => {
    controllers.current.get(id)?.abort();
  }, []);

  const retry = useCallback((id, opts = {}) => {
    const it = items.find(x => x.id === id);
    if (!it) return;
    startOne(it, opts);
  }, [items, startOne]);

  const remove = useCallback((id) => {
    cancel(id);
    setItems(prev => {
      const found = prev.find(x => x.id === id);
      if (found?.preview) URL.revokeObjectURL(found.preview);
      return prev.filter(x => x.id !== id);
    });
  }, [cancel]);

  const reset = useCallback(() => {
    controllers.current.forEach(c => c.abort());
    controllers.current.clear();
    setItems(prev => {
      prev.forEach(it => { if (it.preview) URL.revokeObjectURL(it.preview); });
      return [];
    });
  }, []);

  return { items, enqueue, cancel, retry, remove, reset };
}
