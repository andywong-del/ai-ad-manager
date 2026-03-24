import { createHash } from 'crypto';

/**
 * Meta Custom Audience data normalization & SHA256 hashing.
 * All customer data must be normalized then hashed before upload.
 * See: https://developers.facebook.com/docs/marketing-api/audiences/guides/custom-audiences#hash
 */

export const sha256 = (str) =>
  createHash('sha256').update(str).digest('hex');

export const normalizeEmail = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || !trimmed.includes('@')) return null;
  return trimmed;
};

export const normalizePhone = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  // Strip everything except digits and leading +
  let cleaned = raw.trim().replace(/[^\d+]/g, '');
  if (!cleaned) return null;
  // Ensure E.164: must start with +
  if (!cleaned.startsWith('+')) {
    // If starts with country code digits (e.g. 852, 1, 44), add +
    // If it's a local number without country code, we can't reliably format it
    // Meta requires country code, so prepend + and let Meta validate
    cleaned = '+' + cleaned;
  }
  // E.164: 7-15 digits after +
  const digits = cleaned.replace('+', '');
  if (digits.length < 7 || digits.length > 15) return null;
  return cleaned;
};

export const normalizeName = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed || null;
};

export const normalizeField = (value, fieldType) => {
  switch (fieldType) {
    case 'EMAIL': return normalizeEmail(value);
    case 'PHONE': return normalizePhone(value);
    case 'FN':
    case 'LN': return normalizeName(value);
    case 'MADID': return value?.trim() || null; // MADIDs: no hashing, pass raw
    case 'PAGEUID': return value?.trim() || null; // PSIDs: no hashing, pass raw
    case 'ZIP':
    case 'CT':
    case 'ST':
    case 'COUNTRY': return value?.trim()?.toLowerCase() || null;
    default: return value?.trim()?.toLowerCase() || null;
  }
};

// Fields that should NOT be hashed (sent raw per Meta docs)
const NO_HASH_FIELDS = new Set(['MADID', 'PAGEUID']);

/**
 * Process customer data rows into Meta-ready payload.
 * @param {string[][]} rows - Array of row arrays, e.g. [["john@example.com"], ["+85212345678"]]
 * @param {string[]} schema - Meta schema array, e.g. ["EMAIL"] or ["EMAIL", "PHONE", "FN", "LN"]
 * @returns {{ schema: string[], data: string[][] }} Ready for Meta API payload
 */
export const processCustomerData = (rows, schema) => {
  const processed = [];

  for (const row of rows) {
    const hashedRow = [];
    let hasValidField = false;

    for (let i = 0; i < schema.length; i++) {
      const fieldType = schema[i];
      const rawValue = row[i] || '';
      const normalized = normalizeField(rawValue, fieldType);

      if (normalized) {
        hasValidField = true;
        // MADID and PAGEUID are sent raw, everything else is SHA256 hashed
        hashedRow.push(NO_HASH_FIELDS.has(fieldType) ? normalized : sha256(normalized));
      } else {
        hashedRow.push(''); // Empty string for missing/invalid fields
      }
    }

    if (hasValidField) {
      processed.push(hashedRow);
    }
  }

  return { schema, data: processed };
};

/**
 * Build a complete Meta audience upload payload.
 * @param {string[][]} rows - Raw customer data rows
 * @param {string[]} schema - Field types, e.g. ["EMAIL"]
 * @returns {object} Complete payload for POST /{audience_id}/users
 */
export const buildAudiencePayload = (rows, schema) => {
  const { schema: processedSchema, data } = processCustomerData(rows, schema);
  return {
    schema: processedSchema,
    data,
  };
};
