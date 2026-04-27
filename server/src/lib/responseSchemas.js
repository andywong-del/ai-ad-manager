// Zod schemas for every structured block the AI can emit inside an SSE text
// chunk (```metrics, ```setupcard, ```options, ...). Used by chat.js to
// validate fenced JSON before streaming to the client. Field shapes were
// reverse-engineered from client/src/components/ChatInterface.jsx renderers.
//
// Design notes:
//   - Every schema uses .passthrough() so the AI adding extra fields never
//     fails validation — we only care that REQUIRED fields are present and
//     typed. Strict mode would break backwards compat every time the
//     renderer adds an optional field.
//   - Unknown block types (`dashboard`, audience cards living in separate
//     files) fall through to a permissive passthrough schema so we still
//     catch JSON parse errors without blocking unmapped renderers.

import { z } from 'zod';

// ── Shared helpers ──────────────────────────────────────────────────────────
// value fields accept string|number — charts call parseNum() anyway
const numOrStr = z.union([z.string(), z.number()]);
const trendEnum = z.enum(['up', 'down', 'flat']).optional();
const severityEnum = z.enum(['critical', 'warning', 'success', 'info']).optional();
const scoreStatus = z.enum(['good', 'warning', 'bad']).optional();

// ── Block schemas ──────────────────────────────────────────────────────────

// ```metrics\n[ { label, value, change?, trend?, vs?, desc? }, ... ]\n```
const metricsSchema = z.array(
  z.object({
    label: z.string().min(1),
    value: numOrStr,
    change: numOrStr.optional(),
    trend: trendEnum,
    vs: z.string().optional(),
    desc: z.string().optional(),
  }).passthrough()
);

// ```options\n{ title?, subtitle?, layout?, options: [...] }\n```
const optionsSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  layout: z.enum(['dropdown', 'grid', 'list']).optional(),
  options: z.array(
    z.object({
      id: numOrStr.optional(),
      title: z.string().min(1),
      description: z.string().optional(),
      desc: z.string().optional(),
      tag: z.string().optional(),
    }).passthrough()
  ).min(1),
}).passthrough();

// ```quickreplies\n["A", "B", "C"]\n```
const quickrepliesSchema = z.array(z.string().min(1)).min(1);

// ```setupcard\n{ phase?, status?, collapsed?, subtitle?, items: [...] }\n```
const setupcardSchema = z.object({
  phase: z.number().optional(),
  status: z.enum(['done', 'active', 'pending']).optional(),
  collapsed: z.boolean().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  items: z.array(
    z.object({
      label: z.string().min(1),
      value: numOrStr.optional(),
      detail: z.string().optional(),
      icon: z.string().optional(),
      editable: z.boolean().optional(),
      type: z.enum(['select', 'text']).optional(),
      options: z.array(
        z.object({
          id: numOrStr.optional(),
          title: z.string(),
          description: z.string().optional(),
        }).passthrough()
      ).optional(),
    }).passthrough()
  ),
}).passthrough();

// ```mediagrid\n{ title?, media_type?, items: [{ id, title?, caption?, thumbnail?, ...}] }\n```
const mediagridSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  media_type: z.enum(['video', 'post', 'ad']).optional(),
  items: z.array(
    z.object({
      id: numOrStr,
      title: z.string().optional(),
      caption: z.string().optional(),
      thumbnail: z.string().optional(),
      metric_value: z.number().optional(),
      date: z.string().optional(),
    }).passthrough()
  ).min(1),
}).passthrough();

// ```copyvariations\n{ label?, image_url?, thumbnail?, variations: [{id, headline, primary, cta?}] }\n```
const copyvariationsSchema = z.object({
  label: z.string().optional(),
  image_url: z.string().optional(),
  thumbnail: z.string().optional(),
  variations: z.array(
    z.object({
      id: numOrStr,
      headline: z.string().min(1),
      primary: z.string().min(1),
      cta: z.string().optional(),
    }).passthrough()
  ).min(1),
}).passthrough();

// ```postpicker\n{ title?, posts: [{id, thumbnail?, caption?, likes?, ...}] }\n```
const postpickerSchema = z.object({
  title: z.string().optional(),
  posts: z.array(
    z.object({
      id: numOrStr,
      thumbnail: z.string().optional(),
      caption: z.string().optional(),
      likes: z.number().optional(),
      comments: z.number().optional(),
      shares: z.number().optional(),
      media_type: z.string().optional(),
      permalink: z.string().optional(),
      recommendation: z.string().optional(),
    }).passthrough()
  ).min(1),
}).passthrough();

// ```adpreview\n{ html, format? }\n```   OR   [ {...}, {...} ]
const adpreviewItem = z.object({
  html: z.string().min(1),
  format: z.string().optional(),
}).passthrough();
const adpreviewSchema = z.union([adpreviewItem, z.array(adpreviewItem).min(1)]);

// ```insights\n[ { title, desc, severity?, action? }, ... ]\n```
const insightsSchema = z.array(
  z.object({
    title: z.string().min(1),
    desc: z.string().min(1),
    severity: severityEnum,
    action: z.string().optional(),
  }).passthrough()
).min(1);

// ```score\n{ score, max?, label?, items?: [{text, status?}] }\n```
const scoreSchema = z.object({
  score: z.number(),
  max: z.number().optional(),
  label: z.string().optional(),
  items: z.array(
    z.object({
      text: z.string().min(1),
      status: scoreStatus,
    }).passthrough()
  ).optional(),
}).passthrough();

// ```funnel\n{ title?, stages: [{ label, value, color? }] }\n```
const funnelSchema = z.object({
  title: z.string().optional(),
  stages: z.array(
    z.object({
      label: z.string().min(1),
      value: numOrStr,
      color: z.string().optional(),
    }).passthrough()
  ).min(1),
}).passthrough();

// ```comparison\n{ title?, a_label?, b_label?, metrics: [{ label, a, b }] }\n```
const comparisonSchema = z.object({
  title: z.string().optional(),
  a_label: z.string().optional(),
  b_label: z.string().optional(),
  metrics: z.array(
    z.object({
      label: z.string().min(1),
      a: numOrStr,
      b: numOrStr,
    }).passthrough()
  ).min(1),
}).passthrough();

// ```budget\n{ title?, total_budget?, items: [{ name, spend?, percentage?, roas? }] }\n```
const budgetSchema = z.object({
  title: z.string().optional(),
  total_budget: numOrStr.optional(),
  items: z.array(
    z.object({
      name: z.string().min(1),
      spend: numOrStr.optional(),
      percentage: numOrStr.optional(),
      roas: numOrStr.optional(),
    }).passthrough()
  ).min(1),
}).passthrough();

// ```trend\n{ title?, yLabel?, series: [{ name, data: [{ date, value }] }] }\n```
const trendSchema = z.object({
  title: z.string().optional(),
  yLabel: z.string().optional(),
  series: z.array(
    z.object({
      name: z.string().min(1),
      data: z.array(
        z.object({
          date: z.string().min(1),
          value: numOrStr,
        }).passthrough()
      ).min(1),
    }).passthrough()
  ).min(1),
}).passthrough();

// ```adlib\n[ { page_name, headline?, body?, platforms?, ... } ]\n```
const adlibSchema = z.array(
  z.object({
    snapshot_url: z.string().optional(),
    page_name: z.string().optional(),
    platforms: z.array(z.string()).optional(),
    started: z.string().optional(),
    status: z.string().optional(),
    headline: z.string().optional(),
    body: z.string().optional(),
  }).passthrough()
).min(1);

// ```steps\n[ "...", "..." ]\n```  OR  [ {text, done?} ]
const stepsSchema = z.union([
  z.array(z.string().min(1)).min(1),
  z.array(z.object({ text: z.string().min(1), done: z.boolean().optional() }).passthrough()).min(1),
]);

// Passthrough fallback for blocks without dedicated schemas (audience cards
// in separate files, dashboard). Still catches JSON parse errors.
const passthroughSchema = z.any();

// ── Registry ───────────────────────────────────────────────────────────────
export const BLOCK_SCHEMAS = {
  metrics: metricsSchema,
  options: optionsSchema,
  quickreplies: quickrepliesSchema,
  setupcard: setupcardSchema,
  mediagrid: mediagridSchema,
  copyvariations: copyvariationsSchema,
  postpicker: postpickerSchema,
  adpreview: adpreviewSchema,
  insights: insightsSchema,
  score: scoreSchema,
  funnel: funnelSchema,
  comparison: comparisonSchema,
  budget: budgetSchema,
  trend: trendSchema,
  adlib: adlibSchema,
  steps: stepsSchema,
  // Passthrough — validated for JSON parseability only:
  dashboard: passthroughSchema,
  videoaudience: passthroughSchema,
  engagementaudience: passthroughSchema,
  lookalikeaudience: passthroughSchema,
  savedaudience: passthroughSchema,
  websiteaudience: passthroughSchema,
};

// Aliases the client parser recognises (from BLOCK_ALIASES in ChatInterface).
// Same block content, different fenced tag.
const ALIASES = {
  option: 'options',
  quickreplie: 'quickreplies',
  quickreply: 'quickreplies',
  copyvariation: 'copyvariations',
  metric: 'metrics',
  step: 'steps',
  videogrid: 'mediagrid',
  postgrid: 'mediagrid',
};

/** Canonicalise a fenced-tag string (after stripping backticks/whitespace). */
export function canonicalBlockType(tag) {
  const t = String(tag || '').trim().toLowerCase();
  if (BLOCK_SCHEMAS[t]) return t;
  if (ALIASES[t]) return ALIASES[t];
  return null;
}

export function listBlockTypes() {
  return Object.keys(BLOCK_SCHEMAS);
}

/**
 * validateBlock(type, rawJsonString)
 *   Parse + schema-check a fenced block payload.
 *   Returns { ok: true, data } or { ok: false, reason, issues, raw }.
 *     reason ∈ 'parse_error' | 'schema_error' | 'unknown_type'
 */
export function validateBlock(type, rawJsonString) {
  const canonical = canonicalBlockType(type);
  if (!canonical) {
    return { ok: false, reason: 'unknown_type', type, raw: rawJsonString };
  }
  let parsed;
  try {
    parsed = JSON.parse(rawJsonString);
  } catch (err) {
    return {
      ok: false,
      reason: 'parse_error',
      type: canonical,
      issues: [{ message: err.message }],
      raw: rawJsonString,
    };
  }
  const schema = BLOCK_SCHEMAS[canonical];
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      reason: 'schema_error',
      type: canonical,
      issues: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      raw: rawJsonString,
    };
  }
  return { ok: true, type: canonical, data: result.data };
}
