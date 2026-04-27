// Unit tests for pure helpers in gcs.js (no network).
// Storage client / signing is integration-tested separately.

import { describe, it, expect, beforeAll } from 'vitest';

beforeAll(() => {
  // Ensure helper defaults work without touching real env
  process.env.GCP_PROJECT_ID = process.env.GCP_PROJECT_ID || 'test-project';
  process.env.GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'assets-presslogic';
  process.env.GCS_PREFIX = process.env.GCS_PREFIX || 'ai-ad-manager/';
});

const mod = await import('../gcs.js');
const {
  buildObjectKey,
  getPrefix,
  normalizeMime,
  deriveExtension,
  assertOwnedKey,
  buildPublicUrl,
  __internals,
} = mod;

describe('getPrefix', () => {
  it('appends trailing slash when missing', () => {
    const saved = process.env.GCS_PREFIX;
    process.env.GCS_PREFIX = 'foo';
    expect(getPrefix()).toBe('foo/');
    process.env.GCS_PREFIX = saved;
  });
});

describe('normalizeMime', () => {
  it('accepts canonical jpeg', () => {
    expect(normalizeMime('image/jpeg')).toBe('image/jpeg');
  });
  it('resolves aliases', () => {
    expect(normalizeMime('image/jpg')).toBe('image/jpeg');
    expect(normalizeMime('IMAGE/JPG')).toBe('image/jpeg');
  });
  it('rejects unknown types', () => {
    expect(normalizeMime('application/x-evil')).toBeNull();
    expect(normalizeMime('')).toBeNull();
    expect(normalizeMime(null)).toBeNull();
  });
});

describe('deriveExtension', () => {
  it('prefers mime-derived extension', () => {
    expect(deriveExtension('image/jpeg', 'photo.JPEG')).toBe('.jpg');
    expect(deriveExtension('video/quicktime', 'clip.mov')).toBe('.mov');
  });
  it('falls back to filename ext when mime unknown', () => {
    expect(deriveExtension(null, 'data.csv')).toBe('.csv');
  });
  it('returns empty when neither available', () => {
    expect(deriveExtension(null, '')).toBe('');
    expect(deriveExtension(null, 'noext')).toBe('');
  });
  it('rejects malformed extensions', () => {
    expect(deriveExtension(null, 'thing.with.very-long-wrong-ext')).toBe('');
  });
});

describe('buildObjectKey', () => {
  it('uses canonical prefix + kind + userId + month + uuid + ext', () => {
    const key = buildObjectKey({
      kind: 'chat',
      userId: '1234567890',
      mime: 'image/png',
      filename: 'foo.png',
    });
    expect(key).toMatch(/^ai-ad-manager\/chat\/1234567890\/\d{4}-\d{2}\/[a-f0-9-]+\.png$/);
  });

  it('rejects invalid kind', () => {
    expect(() => buildObjectKey({ kind: 'evil', userId: '1', mime: 'image/png', filename: 'a.png' }))
      .toThrow(/invalid kind/);
  });

  it('sanitizes userId', () => {
    const key = buildObjectKey({
      kind: 'skills',
      userId: '../../etc/passwd',
      mime: 'application/pdf',
      filename: 'doc.pdf',
    });
    // no slashes / dots leaked into userId segment
    expect(key.split('/')[2]).toBe('etcpasswd');
  });

  it('empty userId collapses to "anon"', () => {
    const key = buildObjectKey({
      kind: 'chat',
      userId: '***',
      mime: 'image/png',
      filename: 'a.png',
    });
    expect(key.split('/')[2]).toBe('anon');
  });

  it('does not trust filename extension', () => {
    const key = buildObjectKey({
      kind: 'chat',
      userId: '1',
      mime: 'image/png',
      filename: 'tricky.exe.php', // try to sneak a bad ext
    });
    expect(key.endsWith('.png')).toBe(true);
  });
});

describe('assertOwnedKey', () => {
  it('accepts keys with our prefix', () => {
    expect(() => assertOwnedKey('ai-ad-manager/chat/1/2026-04/x.png')).not.toThrow();
  });
  it('rejects keys outside prefix', () => {
    expect(() => assertOwnedKey('other-project/foo.png')).toThrow(/not owned/);
    expect(() => assertOwnedKey('ai-ad-manager2/foo.png')).toThrow(/not owned/);
  });
  it('rejects path traversal attempts', () => {
    expect(() => assertOwnedKey('ai-ad-manager/../../etc/passwd')).toThrow(/suspicious|not owned/);
    expect(() => assertOwnedKey('ai-ad-manager//foo')).toThrow(/suspicious/);
  });
  it('rejects non-string inputs', () => {
    expect(() => assertOwnedKey(null)).toThrow();
    expect(() => assertOwnedKey(undefined)).toThrow();
    expect(() => assertOwnedKey(42)).toThrow();
  });
});

describe('buildPublicUrl', () => {
  it('uses CDN domain when set', () => {
    const saved = process.env.GCS_CDN_DOMAIN;
    process.env.GCS_CDN_DOMAIN = 'https://assets.presslogic.com';
    expect(buildPublicUrl('ai-ad-manager/chat/1/2026-04/abc.png'))
      .toBe('https://assets.presslogic.com/ai-ad-manager/chat/1/2026-04/abc.png');
    process.env.GCS_CDN_DOMAIN = saved;
  });

  it('strips trailing slash on CDN domain', () => {
    const saved = process.env.GCS_CDN_DOMAIN;
    process.env.GCS_CDN_DOMAIN = 'https://cdn.example.com/';
    expect(buildPublicUrl('ai-ad-manager/chat/1/2026-04/abc.png'))
      .toBe('https://cdn.example.com/ai-ad-manager/chat/1/2026-04/abc.png');
    process.env.GCS_CDN_DOMAIN = saved;
  });

  it('falls back to gs:// when no CDN', () => {
    const saved = process.env.GCS_CDN_DOMAIN;
    delete process.env.GCS_CDN_DOMAIN;
    expect(buildPublicUrl('ai-ad-manager/chat/1/2026-04/abc.png'))
      .toBe('gs://assets-presslogic/ai-ad-manager/chat/1/2026-04/abc.png');
    process.env.GCS_CDN_DOMAIN = saved;
  });

  it('refuses unowned keys', () => {
    expect(() => buildPublicUrl('other-project/x.png')).toThrow();
  });
});

describe('__internals.sanitizeIdSegment', () => {
  it('keeps alphanumerics + dash/underscore', () => {
    expect(__internals.sanitizeIdSegment('abc_123-XYZ')).toBe('abc_123-XYZ');
  });
  it('strips everything else', () => {
    expect(__internals.sanitizeIdSegment('a.b/c\\d:e')).toBe('abcde');
  });
  it('truncates to 64 chars', () => {
    const long = 'a'.repeat(200);
    expect(__internals.sanitizeIdSegment(long).length).toBe(64);
  });
});
