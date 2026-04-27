// Streaming-filter tests. Focus on:
//   - plain text passes through unchanged
//   - valid blocks are emitted in a canonical, closed form
//   - bad blocks (trailing comma / bad schema) are dropped
//   - chunks split across boundaries still work
//   - unclosed blocks surface via flush()

import { describe, it, expect, vi } from 'vitest';
import { createBlockFilter } from '../streamFilter.js';

function collect() {
  const out = [];
  const fails = [];
  const filter = createBlockFilter({
    emit: (t) => out.push(t),
    onValidationFail: (r) => fails.push(r),
  });
  return { filter, out, fails };
}

describe('streamFilter — plain text', () => {
  it('passes through text with newlines unchanged', () => {
    const { filter, out } = collect();
    filter.feed('hello\n');
    filter.feed('world\n');
    filter.flush();
    expect(out.join('')).toBe('hello\nworld\n');
  });
  it('buffers partial last line until newline arrives', () => {
    const { filter, out } = collect();
    filter.feed('hel');
    filter.feed('lo\n');
    expect(out.join('')).toBe('hello\n');
  });
});

describe('streamFilter — valid block passthrough', () => {
  it('emits well-formed metrics block as a single canonical chunk', () => {
    const { filter, out, fails } = collect();
    filter.feed('Here:\n');
    filter.feed('```metrics\n');
    filter.feed('[{"label":"ROAS","value":"2.4x","trend":"up"}]\n');
    filter.feed('```\n');
    filter.feed('Done.\n');
    filter.flush();
    expect(fails).toHaveLength(0);
    const joined = out.join('');
    expect(joined).toContain('```metrics\n');
    expect(joined).toContain('"ROAS"');
    expect(joined).toMatch(/```\n/);
    expect(joined).toContain('Done.');
  });
});

describe('streamFilter — bad blocks are dropped', () => {
  it('drops a metrics block with a trailing comma', () => {
    const { filter, out, fails } = collect();
    filter.feed('Before\n');
    filter.feed('```metrics\n[\n  { "label": "ROAS", "value": "2.4x" },\n  { "label": "CTR", "value": "1.8%" },\n]\n```\n');
    filter.feed('After\n');
    filter.flush();
    const joined = out.join('');
    expect(joined).not.toContain('```metrics');
    expect(joined).toContain('Before');
    expect(joined).toContain('After');
    expect(fails).toHaveLength(1);
    expect(fails[0].reason).toBe('parse_error');
    expect(fails[0].type).toBe('metrics');
  });

  it('drops a block that fails schema check (options with no options)', () => {
    const { filter, out, fails } = collect();
    filter.feed('```options\n{"title":"X","options":[]}\n```\n');
    filter.flush();
    expect(out.join('')).toBe('');
    expect(fails[0].reason).toBe('schema_error');
  });
});

describe('streamFilter — boundary handling', () => {
  it('handles fence split across chunks', () => {
    const { filter, out, fails } = collect();
    filter.feed('``');
    filter.feed('`quickreplies\n');
    filter.feed('["A","B"]\n');
    filter.feed('```\n');
    filter.flush();
    expect(fails).toHaveLength(0);
    expect(out.join('')).toContain('["A","B"]');
  });
  it('emits placeholder when debugPlaceholder=true and block is bad', () => {
    const out = [];
    const filter = createBlockFilter({
      emit: (t) => out.push(t),
      debugPlaceholder: true,
    });
    filter.feed('```metrics\n[,]\n```\n');
    filter.flush();
    expect(out.join('')).toContain('rich block skipped');
  });
});

describe('streamFilter — flush edge cases', () => {
  it('reports unclosed_block when stream ends inside a block', () => {
    const { filter, fails } = collect();
    filter.feed('```metrics\n[{"label":"x","value":1}]\n');
    filter.flush();
    expect(fails[0].reason).toBe('unclosed_block');
  });
  it('flushes trailing text without a newline', () => {
    const { filter, out } = collect();
    filter.feed('tail');
    filter.flush();
    expect(out.join('')).toBe('tail\n');
  });
});

describe('streamFilter — ignores unknown fences', () => {
  it('treats an unrecognized fence tag as plain text (passes through)', () => {
    const { filter, out, fails } = collect();
    filter.feed('```bash\necho hi\n```\n');
    filter.flush();
    // Plain fenced code blocks with non-registered tags are NOT validated —
    // they pass through literally so the markdown renderer shows them.
    expect(out.join('')).toContain('```bash');
    expect(out.join('')).toContain('echo hi');
    expect(fails).toHaveLength(0);
  });
});
