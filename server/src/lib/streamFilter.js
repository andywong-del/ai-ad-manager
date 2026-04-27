// SSE stream filter: buffers fenced structured blocks (```metrics / ```setupcard / ...)
// and validates them via responseSchemas.validateBlock before releasing them
// to the client. Plain prose passes through at its natural token cadence so
// there's no perceived latency — only rich blocks are held for validation.
//
// Design:
//   - Line-oriented. Fences always appear on their own line (that's how AI
//     emits them and how ChatInterface.parseMarkdownTable detects them).
//   - State: OUTSIDE (pass-through) / INSIDE_BLOCK (buffering).
//   - feed(chunk) ingests arbitrary-size chunks; emit() fires only on
//     complete lines (outside blocks) or whole validated blocks.
//   - flush() handles end-of-stream: outputs pending tail; if a block never
//     closed, reports an 'unclosed_block' validation failure.

import { canonicalBlockType, validateBlock } from './responseSchemas.js';

const FENCE_RE = /^(`{2,3})(.*)$/;

/**
 * @param {Object} opts
 * @param {(text: string) => void} opts.emit        Called for every piece of
 *   cleaned output ready to go to the client. Concatenating all emits yields
 *   the validated stream.
 * @param {(result: object) => void} [opts.onValidationFail]  Called when a
 *   block fails parse/schema check. Result shape comes from validateBlock().
 * @param {boolean} [opts.debugPlaceholder]  If true, replace dropped blocks
 *   with "⚠️ (rich block skipped: <reason>)". Off by default.
 */
export function createBlockFilter({ emit, onValidationFail, debugPlaceholder = false }) {
  let pending = '';        // unprocessed tail (last partial line)
  let inBlock = false;     // currently buffering a fenced rich block
  let blockType = null;    // canonical block type
  let blockLines = [];     // raw lines collected between open/close fence
  let openFence = '```';   // fence marker of the currently open block

  function handleLine(line) {
    const trimmed = line.trim();

    if (!inBlock) {
      // Detect opening fence — only enter block mode for known block types
      const match = trimmed.match(FENCE_RE);
      const tag = match ? match[2].trim().toLowerCase() : '';
      const canonical = tag ? canonicalBlockType(tag) : null;
      if (canonical) {
        inBlock = true;
        blockType = canonical;
        blockLines = [];
        openFence = match[1];
        return;
      }
      // Plain line — pass through unchanged (with trailing newline)
      emit(line + '\n');
      return;
    }

    // Inside block: detect closing fence (```-only line)
    if (trimmed.startsWith(openFence.slice(0, 2)) && !trimmed.match(FENCE_RE)?.[2]?.trim()) {
      const rawJson = blockLines.join('\n');
      const result = validateBlock(blockType, rawJson);
      if (result.ok) {
        // Re-emit as a complete, syntactically-canonical fenced block.
        // Client parser reads the content verbatim.
        emit('```' + blockType + '\n' + rawJson + '\n```\n');
      } else {
        onValidationFail?.(result);
        if (debugPlaceholder) {
          emit(`⚠️ (rich block skipped: ${result.reason}${result.type ? ' · ' + result.type : ''})\n`);
        }
      }
      inBlock = false;
      blockType = null;
      blockLines = [];
      return;
    }

    blockLines.push(line);
  }

  function feed(chunk) {
    if (!chunk) return;
    pending += chunk;
    let nlIdx;
    while ((nlIdx = pending.indexOf('\n')) !== -1) {
      const line = pending.slice(0, nlIdx);
      pending = pending.slice(nlIdx + 1);
      handleLine(line);
    }
    // Any tail without a newline waits in `pending`. We do NOT flush partial
    // lines early — that would risk emitting "```me" and causing the client
    // parser to open a block prematurely.
  }

  function flush() {
    if (pending) {
      handleLine(pending);
      pending = '';
    }
    if (inBlock) {
      onValidationFail?.({
        ok: false,
        reason: 'unclosed_block',
        type: blockType,
        raw: blockLines.join('\n'),
      });
      if (debugPlaceholder) {
        emit(`⚠️ (rich block skipped: unclosed · ${blockType})\n`);
      }
      inBlock = false;
      blockType = null;
      blockLines = [];
    }
  }

  return { feed, flush };
}
