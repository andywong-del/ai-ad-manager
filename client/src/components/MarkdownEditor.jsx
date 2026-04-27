// Markdown editor with toolbar + Edit/Preview tabs.
//
// Why not a real WYSIWYG? Skill instructions feed an LLM prompt — the source
// must stay markdown so the model reads it natively. A toolbar that wraps
// selected text with markdown syntax + a Preview tab gives "rich" feel
// without lying about the storage format.

import { useRef, useState, useCallback } from 'react';
import { Bold, Italic, Code, Heading2, Heading3, List, ListOrdered, Quote, Link as LinkIcon, Eye, Pencil } from 'lucide-react';
import { renderRichText } from '../lib/renderRichText.jsx';

// Wrap the current selection with `before`/`after` strings. If nothing is
// selected, insert `placeholder` and select it so the user can immediately
// type to replace.
const wrapSelection = (textarea, before, after, placeholder = '') => {
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  const selected = value.slice(s, e) || placeholder;
  const next = value.slice(0, s) + before + selected + after + value.slice(e);
  textarea.value = next;
  // Re-select what we just inserted (or the placeholder we filled in).
  textarea.selectionStart = s + before.length;
  textarea.selectionEnd = s + before.length + selected.length;
  textarea.focus();
  // Trigger React's onChange via the input event.
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
};

// Prefix every line in the selection with `prefix` (toggles off if already there).
const prefixLines = (textarea, prefix) => {
  const { selectionStart: s, selectionEnd: e, value } = textarea;
  // Expand selection to full lines.
  const lineStart = value.lastIndexOf('\n', s - 1) + 1;
  const lineEnd = value.indexOf('\n', e);
  const block = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
  const lines = block.split('\n');
  const allPrefixed = lines.every(l => l.startsWith(prefix) || l.trim() === '');
  const next = lines
    .map((l, i) => {
      if (l.trim() === '') return l;
      if (allPrefixed) return l.slice(prefix.length);
      // For numbered lists, reset numbering each call.
      if (prefix === '1. ') return `${i + 1}. ${l}`;
      return prefix + l;
    })
    .join('\n');
  const replaced = value.slice(0, lineStart) + next + value.slice(lineEnd === -1 ? value.length : lineEnd);
  textarea.value = replaced;
  textarea.selectionStart = lineStart;
  textarea.selectionEnd = lineStart + next.length;
  textarea.focus();
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
};

const ToolbarBtn = ({ onClick, title, children }) => (
  <button
    type="button"
    onMouseDown={(e) => e.preventDefault() /* keep textarea focus */}
    onClick={onClick}
    title={title}
    className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 active:bg-indigo-100 transition-colors"
  >
    {children}
  </button>
);

const Sep = () => <div className="w-px h-5 bg-slate-200 mx-0.5" />;

export const MarkdownEditor = ({
  value,
  onChange,
  placeholder = '',
  rows = 12,
  helperText = '',
}) => {
  const taRef = useRef(null);
  const [tab, setTab] = useState('edit'); // 'edit' | 'preview'

  const exec = useCallback((fn) => () => {
    const ta = taRef.current;
    if (!ta) return;
    fn(ta);
    // The dispatched 'input' event makes React pick up the new value, but
    // some controlled-input setups need an explicit onChange call too.
    onChange(ta.value);
  }, [onChange]);

  const insertLink = useCallback(() => {
    const ta = taRef.current;
    if (!ta) return;
    const url = window.prompt('URL:');
    if (!url) return;
    const { selectionStart: s, selectionEnd: e, value: v } = ta;
    const label = v.slice(s, e) || 'link text';
    const next = v.slice(0, s) + `[${label}](${url})` + v.slice(e);
    ta.value = next;
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    onChange(ta.value);
  }, [onChange]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
      {/* Top bar — toolbar (left) + tabs (right) */}
      <div className="flex items-center justify-between gap-2 px-2 py-1.5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-0.5 flex-wrap">
          <ToolbarBtn onClick={exec((ta) => wrapSelection(ta, '**', '**', 'bold text'))} title="Bold (Cmd/Ctrl+B)">
            <Bold size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={exec((ta) => wrapSelection(ta, '*', '*', 'italic text'))} title="Italic (Cmd/Ctrl+I)">
            <Italic size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={exec((ta) => wrapSelection(ta, '`', '`', 'code'))} title="Inline code">
            <Code size={14} />
          </ToolbarBtn>
          <Sep />
          <ToolbarBtn onClick={exec((ta) => prefixLines(ta, '## '))} title="Heading 2">
            <Heading2 size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={exec((ta) => prefixLines(ta, '### '))} title="Heading 3">
            <Heading3 size={14} />
          </ToolbarBtn>
          <Sep />
          <ToolbarBtn onClick={exec((ta) => prefixLines(ta, '- '))} title="Bullet list">
            <List size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={exec((ta) => prefixLines(ta, '1. '))} title="Numbered list">
            <ListOrdered size={14} />
          </ToolbarBtn>
          <ToolbarBtn onClick={exec((ta) => prefixLines(ta, '> '))} title="Quote">
            <Quote size={14} />
          </ToolbarBtn>
          <Sep />
          <ToolbarBtn onClick={insertLink} title="Insert link">
            <LinkIcon size={14} />
          </ToolbarBtn>
        </div>

        <div className="flex items-center gap-0.5 bg-slate-100 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              tab === 'edit' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Pencil size={11} /> Edit
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
              tab === 'preview' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye size={11} /> Preview
          </button>
        </div>
      </div>

      {/* Body */}
      {tab === 'edit' ? (
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            const meta = e.metaKey || e.ctrlKey;
            if (!meta) return;
            if (e.key === 'b') { e.preventDefault(); exec((ta) => wrapSelection(ta, '**', '**', 'bold text'))(); }
            else if (e.key === 'i') { e.preventDefault(); exec((ta) => wrapSelection(ta, '*', '*', 'italic text'))(); }
            else if (e.key === 'k') { e.preventDefault(); insertLink(); }
          }}
          rows={rows}
          placeholder={placeholder}
          className="w-full px-4 py-3 text-sm text-slate-700 font-mono leading-relaxed focus:outline-none resize-y placeholder:text-slate-300"
          spellCheck={false}
        />
      ) : (
        <div className="px-4 py-3 prose-sm min-h-[260px] text-sm text-slate-600 leading-relaxed">
          {value?.trim() ? renderRichText(value) : (
            <p className="text-slate-300 italic text-sm">Nothing to preview yet.</p>
          )}
        </div>
      )}

      {/* Footer — char counter + helper text */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-400">
        <span>{helperText}</span>
        <span className="font-mono">{value?.length || 0} chars</span>
      </div>
    </div>
  );
};
