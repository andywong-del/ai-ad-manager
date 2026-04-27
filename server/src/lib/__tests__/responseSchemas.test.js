// Unit tests for responseSchemas.validateBlock.
// Each block has at least 1 valid sample + 1 invalid (parse or schema).
// Keep samples small so failures point at a single issue.

import { describe, it, expect } from 'vitest';
import { validateBlock, canonicalBlockType, listBlockTypes, BLOCK_SCHEMAS } from '../responseSchemas.js';

describe('canonicalBlockType / aliases', () => {
  it('resolves direct type', () => {
    expect(canonicalBlockType('metrics')).toBe('metrics');
    expect(canonicalBlockType('METRICS')).toBe('metrics');
    expect(canonicalBlockType('  setupcard  ')).toBe('setupcard');
  });
  it('resolves aliases', () => {
    expect(canonicalBlockType('metric')).toBe('metrics');
    expect(canonicalBlockType('quickreply')).toBe('quickreplies');
    expect(canonicalBlockType('videogrid')).toBe('mediagrid');
  });
  it('returns null for unknown', () => {
    expect(canonicalBlockType('never-heard-of-this')).toBeNull();
  });
});

describe('listBlockTypes', () => {
  it('includes all registered block types', () => {
    const types = listBlockTypes();
    expect(types).toContain('metrics');
    expect(types).toContain('setupcard');
    expect(types).toContain('adpreview');
    expect(types).toContain('dashboard');
  });
});

describe('validateBlock — unknown_type', () => {
  it('returns unknown_type for unregistered block', () => {
    const r = validateBlock('bogus', '{}');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('unknown_type');
  });
});

describe('validateBlock — parse errors', () => {
  it('flags trailing comma (the classic LLM-JSON bug)', () => {
    const bad = `[
      { "label": "ROAS", "value": "2.4x", "trend": "up" },
      { "label": "Spend", "value": "$1,200", "trend": "up" },
    ]`;
    const r = validateBlock('metrics', bad);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('parse_error');
  });
  it('flags unquoted key', () => {
    const r = validateBlock('metrics', '[{ label: "x", value: 1 }]');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('parse_error');
  });
});

// ── Per-block happy-path + one failure case ─────────────────────────────────

describe('metrics', () => {
  it('accepts valid array of metric objects', () => {
    const good = JSON.stringify([
      { label: 'ROAS', value: '2.4x', trend: 'up' },
      { label: 'Spend', value: 1200, change: '+5%' },
    ]);
    const r = validateBlock('metrics', good);
    expect(r.ok).toBe(true);
    expect(r.data).toHaveLength(2);
  });
  it('rejects non-array payload', () => {
    const r = validateBlock('metrics', '{ "label": "x" }');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('schema_error');
  });
  it('rejects missing label', () => {
    const r = validateBlock('metrics', JSON.stringify([{ value: 1 }]));
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('schema_error');
  });
});

describe('options', () => {
  it('accepts minimal payload', () => {
    const r = validateBlock('options', JSON.stringify({
      title: 'Pick one',
      options: [{ title: 'A' }, { title: 'B' }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects empty options array', () => {
    const r = validateBlock('options', JSON.stringify({ options: [] }));
    expect(r.ok).toBe(false);
  });
});

describe('quickreplies', () => {
  it('accepts string array', () => {
    const r = validateBlock('quickreplies', '["Top campaigns", "Export CSV"]');
    expect(r.ok).toBe(true);
  });
  it('rejects object payload', () => {
    const r = validateBlock('quickreplies', '{"a": 1}');
    expect(r.ok).toBe(false);
  });
  it('rejects empty array', () => {
    const r = validateBlock('quickreplies', '[]');
    expect(r.ok).toBe(false);
  });
});

describe('setupcard', () => {
  it('accepts items with editable select', () => {
    const r = validateBlock('setupcard', JSON.stringify({
      phase: 1,
      status: 'active',
      items: [
        { label: 'Objective', value: 'OUTCOME_SALES' },
        { label: 'Budget', value: 200, editable: true, type: 'select', options: [{ id: '1', title: '$100/day' }] },
      ],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects invalid status enum', () => {
    const r = validateBlock('setupcard', JSON.stringify({ status: 'in_progress', items: [] }));
    expect(r.ok).toBe(false);
  });
});

describe('mediagrid', () => {
  it('accepts video items', () => {
    const r = validateBlock('mediagrid', JSON.stringify({
      media_type: 'video',
      items: [{ id: '123', title: 'Clip A', thumbnail: 'https://x' }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects bad media_type enum', () => {
    const r = validateBlock('mediagrid', JSON.stringify({ media_type: 'reel', items: [{ id: '1' }] }));
    expect(r.ok).toBe(false);
  });
});

describe('copyvariations', () => {
  it('accepts valid variations', () => {
    const r = validateBlock('copyvariations', JSON.stringify({
      variations: [{ id: 1, headline: 'H', primary: 'P', cta: 'SHOP_NOW' }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects missing primary', () => {
    const r = validateBlock('copyvariations', JSON.stringify({
      variations: [{ id: 1, headline: 'H' }],
    }));
    expect(r.ok).toBe(false);
  });
});

describe('postpicker', () => {
  it('accepts basic posts', () => {
    const r = validateBlock('postpicker', JSON.stringify({
      posts: [{ id: '9_1', thumbnail: 'https://x', likes: 10, media_type: 'IMAGE' }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects missing id', () => {
    const r = validateBlock('postpicker', JSON.stringify({ posts: [{ caption: 'x' }] }));
    expect(r.ok).toBe(false);
  });
});

describe('adpreview', () => {
  it('accepts single object', () => {
    const r = validateBlock('adpreview', JSON.stringify({ html: '<iframe src="..." />', format: 'MOBILE_FEED_STANDARD' }));
    expect(r.ok).toBe(true);
  });
  it('accepts array', () => {
    const r = validateBlock('adpreview', JSON.stringify([{ html: '<iframe/>' }, { html: '<iframe/>' }]));
    expect(r.ok).toBe(true);
  });
  it('rejects missing html', () => {
    const r = validateBlock('adpreview', '{}');
    expect(r.ok).toBe(false);
  });
});

describe('insights', () => {
  it('accepts severity variants', () => {
    const r = validateBlock('insights', JSON.stringify([
      { title: 'High CPA', desc: 'CPA doubled last week', severity: 'warning', action: 'Investigate' },
    ]));
    expect(r.ok).toBe(true);
  });
  it('rejects bad severity', () => {
    const r = validateBlock('insights', JSON.stringify([{ title: 'x', desc: 'y', severity: 'nuclear' }]));
    expect(r.ok).toBe(false);
  });
});

describe('score', () => {
  it('accepts numeric score + items', () => {
    const r = validateBlock('score', JSON.stringify({
      score: 8, max: 10, items: [{ text: 'Pixel OK', status: 'good' }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects string score', () => {
    const r = validateBlock('score', '{"score":"8"}');
    expect(r.ok).toBe(false);
  });
});

describe('funnel', () => {
  it('accepts stages', () => {
    const r = validateBlock('funnel', JSON.stringify({
      stages: [{ label: 'Impressions', value: 10000 }, { label: 'Clicks', value: 500 }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects empty stages', () => {
    const r = validateBlock('funnel', '{"stages":[]}');
    expect(r.ok).toBe(false);
  });
});

describe('comparison', () => {
  it('accepts metrics payload', () => {
    const r = validateBlock('comparison', JSON.stringify({
      a_label: 'Last week', b_label: 'This week',
      metrics: [{ label: 'ROAS', a: 2.1, b: 2.5 }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects metric without b', () => {
    const r = validateBlock('comparison', JSON.stringify({ metrics: [{ label: 'ROAS', a: 2 }] }));
    expect(r.ok).toBe(false);
  });
});

describe('budget', () => {
  it('accepts items', () => {
    const r = validateBlock('budget', JSON.stringify({
      total_budget: 5000,
      items: [{ name: 'Campaign A', spend: 1200, roas: '2.4' }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects item without name', () => {
    const r = validateBlock('budget', JSON.stringify({ items: [{ spend: 100 }] }));
    expect(r.ok).toBe(false);
  });
});

describe('trend', () => {
  it('accepts series with points', () => {
    const r = validateBlock('trend', JSON.stringify({
      series: [{ name: 'ROAS', data: [{ date: '2025-01-01', value: 2.1 }] }],
    }));
    expect(r.ok).toBe(true);
  });
  it('rejects series without data', () => {
    const r = validateBlock('trend', JSON.stringify({ series: [{ name: 'x', data: [] }] }));
    expect(r.ok).toBe(false);
  });
});

describe('passthrough blocks (dashboard, audience*)', () => {
  it('accepts any JSON for dashboard', () => {
    const r = validateBlock('dashboard', JSON.stringify({ anything: [1, 2], goes: { here: true } }));
    expect(r.ok).toBe(true);
  });
  it('still catches parse errors on passthrough blocks', () => {
    const r = validateBlock('dashboard', '{ broken json,, }');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('parse_error');
  });
});
