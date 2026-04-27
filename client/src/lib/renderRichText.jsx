// Lightweight markdown-ish renderer.
//
// Extracted from ChatInterface so other surfaces (StrategistConfig preview,
// SavedItemView, etc.) can render the same flavour of markdown without
// pulling in a real parser. Supports: ## / ### headings, **bold**, `code`,
// - / * bullet lists, 1. numbered lists, ![alt](url) inline images, bare
// image URLs on their own line, blank-line spacing.

import React from 'react';

export const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`|!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\))/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i} className="text-slate-800 font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`'))  return <code key={i} className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    const imgMatch = part.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgMatch) return <img key={i} src={imgMatch[2]} alt={imgMatch[1]} className="max-w-full max-h-[300px] rounded-xl border border-slate-200 my-2 object-cover" loading="lazy" />;
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) return <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline decoration-indigo-200 hover:decoration-indigo-500">{linkMatch[1]}</a>;
    return <span key={i}>{part}</span>;
  });

export const renderRichText = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let listBuf = [];
  let listType = null;
  let quoteBuf = [];

  const flushList = () => {
    if (!listBuf.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    const cls = listType === 'ol'
      ? 'list-decimal list-inside space-y-1 my-1.5 ml-1 text-slate-600'
      : 'list-disc list-inside space-y-1 my-1.5 ml-1 text-slate-600';
    elements.push(<Tag key={`list-${elements.length}`} className={cls}>{listBuf.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</Tag>);
    listBuf = []; listType = null;
  };
  const flushQuote = () => {
    if (!quoteBuf.length) return;
    elements.push(
      <blockquote key={`q-${elements.length}`} className="border-l-2 border-indigo-200 pl-3 my-2 text-slate-500 italic">
        {quoteBuf.map((q, i) => <p key={i}>{renderInline(q)}</p>)}
      </blockquote>
    );
    quoteBuf = [];
  };
  const flushAll = () => { flushList(); flushQuote(); };

  for (const line of lines) {
    const imgLine = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
    if (imgLine) { flushAll(); elements.push(<img key={elements.length} src={imgLine[2]} alt={imgLine[1]} className="max-w-full max-h-[300px] rounded-xl border border-slate-200 my-2 object-cover" loading="lazy" />); continue; }
    const bareImg = line.trim().match(/^(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)(\?[^\s]*)?)$/i);
    if (bareImg) { flushAll(); elements.push(<img key={elements.length} src={bareImg[1]} alt="" className="max-w-full max-h-[300px] rounded-xl border border-slate-200 my-2 object-cover" loading="lazy" />); continue; }
    if (line.startsWith('### ')) { flushAll(); elements.push(<p key={elements.length} className="text-sm font-bold text-slate-800 mt-3 mb-1">{renderInline(line.slice(4))}</p>); continue; }
    if (line.startsWith('## '))  { flushAll(); elements.push(<p key={elements.length} className="text-base font-bold text-slate-800 mt-3 mb-1">{renderInline(line.slice(3))}</p>); continue; }
    if (line.startsWith('# '))   { flushAll(); elements.push(<p key={elements.length} className="text-lg font-bold text-slate-900 mt-3 mb-1">{renderInline(line.slice(2))}</p>); continue; }
    const quote = line.match(/^>\s?(.*)/);
    if (quote) { flushList(); quoteBuf.push(quote[1]); continue; }
    const bullet = line.match(/^[\-\*]\s+(.*)/);
    if (bullet) { flushQuote(); if (listType && listType !== 'ul') flushList(); listType = 'ul'; listBuf.push(bullet[1]); continue; }
    const numbered = line.match(/^\d+\.\s+(.*)/);
    if (numbered) { flushQuote(); if (listType && listType !== 'ol') flushList(); listType = 'ol'; listBuf.push(numbered[1]); continue; }
    flushAll();
    if (!line.trim()) { elements.push(<div key={elements.length} className="h-2" />); continue; }
    elements.push(<p key={elements.length} className="text-slate-600 leading-relaxed">{renderInline(line)}</p>);
  }
  flushAll();
  return elements;
};
