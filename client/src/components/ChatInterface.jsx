import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Paperclip } from 'lucide-react';

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ thinkingText }) => (
  <div className="flex items-end gap-3 mb-6">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
      <Bot size={15} className="text-white" />
    </div>
    <div className="bg-[#1a2236] border border-[#1e293b] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2.5">
      <div className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
      {thinkingText && <span className="text-xs text-blue-400 italic">{thinkingText}</span>}
    </div>
  </div>
);

// ── Inline markdown: **bold** and `code` ─────────────────────────────────────
const renderText = (text) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('`'))  return <code key={i} className="bg-[#1e293b] text-slate-300 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });

const fmtTime = (date) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

// ── Quick reply chips ────────────────────────────────────────────────────────
const QuickReplies = ({ actions, onSend, disabled }) => (
  <div className="flex justify-end flex-wrap gap-2 mt-3 mb-1 pr-1">
    {actions.map(({ label, value, variant = 'default' }) => (
      <button
        key={value}
        onClick={() => onSend(value)}
        disabled={disabled}
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
          ${variant === 'confirm' ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-600 shadow-sm' :
            variant === 'danger'  ? 'bg-[#1a2236] hover:bg-red-900/30 text-red-400 border-red-800' :
            'bg-[#1a2236] hover:bg-blue-900/30 text-blue-400 border-blue-800 shadow-sm'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

// ── Report renderer ──────────────────────────────────────────────────────────
const roasColor = (r) => r >= 3 ? 'text-emerald-400' : r >= 2 ? 'text-amber-400' : r > 0 ? 'text-red-400' : 'text-slate-500';
const truncate = (s, n = 28) => s.length > n ? s.slice(0, n) + '…' : s;
const fmtUSD = (n) => n > 0 ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
const fmtNum = (n) => n > 0 ? n.toLocaleString() : '—';

const SummaryCard = ({ label, value, sub }) => (
  <div className="flex flex-col gap-0.5 bg-[#141b2d] rounded-xl px-3 py-2.5 flex-1 min-w-0">
    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
    <p className="text-lg font-bold text-white leading-tight">{value}</p>
    {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
  </div>
);

const ReportMessage = ({ message, timestamp }) => {
  const { campaigns = [], insights, adAccountId } = message;

  const totSpend   = insights?.totalSpend   ?? campaigns.reduce((s, c) => s + c.spend, 0);
  const totImp     = insights?.impressions  ?? campaigns.reduce((s, c) => s + c.impressions, 0);
  const totClicks  = insights?.clicks       ?? campaigns.reduce((s, c) => s + c.clicks, 0);
  const avgRoas    = insights?.roas         ?? (() => {
    const active = campaigns.filter(c => c.roas > 0);
    return active.length ? active.reduce((s, c) => s + c.roas, 0) / active.length : 0;
  })();

  return (
    <div className="flex items-end gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
        <Bot size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-[#141b2d] border border-[#1e293b] rounded-2xl rounded-bl-sm overflow-hidden">

          {/* Report header */}
          <div className="bg-[#1a2236] border-b border-[#1e293b] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-white">Campaign Performance Report</p>
              <p className="text-xs text-slate-500 mt-0.5">Last 7 days · <span className="font-mono">{adAccountId}</span></p>
            </div>
            <span className="text-xs bg-blue-900/40 text-blue-400 border border-blue-800 px-2 py-0.5 rounded font-medium">Meta Ads API</span>
          </div>

          {/* Summary cards */}
          <div className="px-3 py-3 flex gap-2 border-b border-[#1e293b]">
            <SummaryCard label="Total Spend"   value={fmtUSD(totSpend)}   sub="Last 7 days" />
            <SummaryCard label="Impressions"   value={fmtNum(totImp)}     sub="Last 7 days" />
            <SummaryCard label="Clicks"        value={fmtNum(totClicks)}  sub="Last 7 days" />
            <SummaryCard label="Avg ROAS"      value={avgRoas > 0 ? `${avgRoas.toFixed(1)}x` : '—'} sub="Across campaigns" />
          </div>

          {/* Campaign table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#1a2236] border-b border-[#1e293b]">
                  <th className="px-4 py-2.5 text-left font-semibold text-slate-400">Campaign</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-slate-400">Delivery</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-400">Budget</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-400">Spend</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-400">ROAS</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-400">Impressions</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-400">Clicks</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-slate-400">CTR</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id} className={`border-b border-[#1e293b] last:border-0 ${i % 2 === 1 ? 'bg-[#141b2d]' : 'bg-[#161d2f]'}`}>
                    <td className="px-4 py-2.5 max-w-[180px]">
                      <p className="font-medium text-slate-200" title={c.name}>{truncate(c.name)}</p>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">{c.id}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      {c.status === 'ACTIVE'
                        ? <span className="inline-flex items-center gap-1 bg-emerald-900/30 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded-full font-medium text-[10px]"><span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />Active</span>
                        : <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded-full font-medium text-[10px]">⏸ Paused</span>
                      }
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-400">${(c.daily_budget / 100).toFixed(0)}/day</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-200">{fmtUSD(c.spend)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${roasColor(c.roas)}`}>
                      {c.roas > 0 ? `${c.roas}x` : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{fmtNum(c.impressions)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{fmtNum(c.clicks)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* API source footer */}
          <div className="px-4 py-2.5 border-t border-[#1e293b] bg-[#141b2d] flex items-center gap-1.5">
            <span className="text-slate-500">📡</span>
            <code className="text-[10px] text-slate-500 font-mono">GET /{adAccountId}/insights</code>
            <span className="text-slate-600">·</span>
            <code className="text-[10px] text-emerald-400 bg-emerald-900/30 px-1 py-0.5 rounded font-mono">ads_read</code>
            <span className="ml-auto text-[10px] text-slate-500">{fmtTime(timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Table renderer ────────────────────────────────────────────────────────────
const TableMessage = ({ message }) => (
  <div className="flex items-end gap-3 mb-2">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
      <Bot size={15} className="text-white" />
    </div>
    <div className="max-w-[95%] w-full">
      <div className="bg-[#141b2d] border border-[#1e293b] rounded-2xl rounded-bl-sm overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-[#1a2236] border-b border-[#1e293b]">
              {message.columns.map((col) => (
                <th key={col} className="px-3 py-2.5 text-left font-semibold text-slate-400 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {message.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-[#141b2d]' : 'bg-[#161d2f]'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2.5 text-slate-300 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {message.summary && (
          <div className="px-4 py-2.5 border-t border-[#1e293b] text-xs text-slate-400 italic">
            {renderText(message.summary)}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-500 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
    </div>
  </div>
);

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isLatest, onSend, isTyping }) => {
  if (message.type === 'report') {
    return (
      <>
        <ReportMessage message={message} timestamp={message.timestamp} />
        <div className="mb-2" />
      </>
    );
  }

  if (message.type === 'table') {
    return (
      <>
        <TableMessage message={message} />
        {isLatest && message.actions?.length > 0 && (
          <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />
        )}
        <div className="mb-6" />
      </>
    );
  }

  const isAgent = message.role === 'agent';
  if (isAgent) {
    return (
      <>
        <div className="flex items-end gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
            <Bot size={15} className="text-white" />
          </div>
          <div className="max-w-[80%]">
            <div className="bg-[#1a2236] border border-[#1e293b] text-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {renderText(message.text)}
            </div>
            <p className="text-xs text-slate-500 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
          </div>
        </div>
        {isLatest && message.actions?.length > 0 && (
          <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />
        )}
        <div className="mb-6" />
      </>
    );
  }

  return (
    <div className="flex items-end justify-end gap-3 mb-6">
      <div className="max-w-[75%]">
        <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed">
          {message.text}
        </div>
        <p className="text-xs text-slate-500 mt-1 text-right mr-1">{fmtTime(message.timestamp)}</p>
      </div>
    </div>
  );
};

// ── Mode toggle (Fast / Deep Research) ───────────────────────────────────────
const ModeToggle = ({ mode, setMode }) => (
  <div className="flex items-center gap-1 bg-[#1a2236] rounded-full p-0.5">
    {['Fast', 'Deep Research'].map((m) => (
      <button
        key={m}
        onClick={() => setMode(m)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
          ${mode === m
            ? 'bg-[#2a3548] text-white'
            : 'text-slate-400 hover:text-slate-300'
          }`}
      >
        {m}
      </button>
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ChatInterface = ({ messages, isTyping, thinkingText, onSend, suggestedActions = [] }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState('Fast');
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const lastId   = messages[messages.length - 1]?.id;
  const isEmptyState = messages.length <= 1;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback((text) => {
    const t = (typeof text === 'string' ? text : input).trim();
    if (!t || isTyping) return;
    onSend(t);
    setInput('');
    inputRef.current?.focus();
  }, [input, isTyping, onSend]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full">

      {/* Empty State — centered heading */}
      {isEmptyState && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h1 className="text-3xl font-bold text-white mb-10 text-center">
            Ask anything about your ads
          </h1>

          {/* Input area */}
          <div className="w-full max-w-2xl">
            <div className="bg-[#141b2d] border border-[#1e293b] rounded-2xl overflow-hidden">
              <div className="px-4 pt-4 pb-3">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything about your ads"
                  rows={1}
                  disabled={isTyping}
                  className="w-full resize-none text-sm bg-transparent text-white placeholder:text-slate-500 focus:outline-none disabled:text-slate-500 max-h-32 overflow-y-auto"
                  style={{ lineHeight: '1.5' }}
                />
              </div>
              <div className="px-4 pb-3 flex items-center justify-between">
                <ModeToggle mode={mode} setMode={setMode} />
                <div className="flex items-center gap-2">
                  <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1a2236] transition-colors">
                    <Paperclip size={16} />
                  </button>
                  <button
                    onClick={() => handleSend()}
                    disabled={!input.trim() || isTyping}
                    className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Quick action chips */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-5">
              {suggestedActions.map(({ label, prompt }) => (
                <button
                  key={label}
                  onClick={() => onSend(prompt)}
                  disabled={isTyping}
                  className="px-4 py-2 rounded-full text-[13px] font-medium bg-[#141b2d] border border-[#1e293b] text-slate-300 hover:bg-[#1a2236] hover:border-slate-600 hover:text-white transition-colors disabled:opacity-40"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat messages — shown when there are messages beyond welcome */}
      {!isEmptyState && (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLatest={msg.id === lastId}
                  onSend={handleSend}
                  isTyping={isTyping}
                />
              ))}
              {isTyping && <TypingIndicator thinkingText={thinkingText} />}
              <div ref={endRef} />
            </div>
          </div>

          {/* Bottom input for active chat */}
          <div className="shrink-0 border-t border-[#1e293b] bg-[#0f1623] px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-3 items-end">
                <div className="flex-1 bg-[#141b2d] border border-[#1e293b] rounded-2xl overflow-hidden">
                  <div className="px-4 pt-3 pb-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything about your ads"
                      rows={1}
                      disabled={isTyping}
                      className="w-full resize-none text-sm bg-transparent text-white placeholder:text-slate-500 focus:outline-none disabled:text-slate-500 max-h-32 overflow-y-auto"
                      style={{ lineHeight: '1.5' }}
                    />
                  </div>
                  <div className="px-4 pb-2.5 flex items-center justify-between">
                    <ModeToggle mode={mode} setMode={setMode} />
                    <div className="flex items-center gap-2">
                      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-300 hover:bg-[#1a2236] transition-colors">
                        <Paperclip size={16} />
                      </button>
                      <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isTyping}
                        className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white flex items-center justify-center transition-colors"
                      >
                        <Send size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
