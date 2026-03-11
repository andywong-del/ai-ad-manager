import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send } from 'lucide-react';

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ thinkingText }) => (
  <div className="flex items-end gap-3 mb-6">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
      <Bot size={15} className="text-white" />
    </div>
    <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2.5 shadow-sm">
      <div className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
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
    if (part.startsWith('`'))  return <code key={i} className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });

const fmtTime = (date) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

// ── Quick reply chips — right-aligned (user side) ─────────────────────────────
const QuickReplies = ({ actions, onSend, disabled }) => (
  <div className="flex justify-end flex-wrap gap-2 mt-3 mb-1 pr-1">
    {actions.map(({ label, value, variant = 'default' }) => (
      <button
        key={value}
        onClick={() => onSend(value)}
        disabled={disabled}
        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
          ${variant === 'confirm' ? 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500 shadow-sm' :
            variant === 'danger'  ? 'bg-white hover:bg-red-50 text-red-600 border-red-300' :
            'bg-white hover:bg-blue-50 text-blue-700 border-blue-200 shadow-sm'}`}
      >
        {label}
      </button>
    ))}
  </div>
);

// ── Table renderer ────────────────────────────────────────────────────────────
const TableMessage = ({ message }) => (
  <div className="flex items-end gap-3 mb-2">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
      <Bot size={15} className="text-white" />
    </div>
    <div className="max-w-[90%] w-full">
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm shadow-sm overflow-hidden">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {message.columns.map((col) => (
                <th key={col} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {message.rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2.5 text-slate-700 whitespace-nowrap">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {message.summary && (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-500 italic">
            {renderText(message.summary)}
          </div>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
    </div>
  </div>
);

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isLatest, onSend, isTyping }) => {
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
            <div className="bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
              {renderText(message.text)}
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
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
        <p className="text-xs text-slate-400 mt-1 text-right mr-1">{fmtTime(message.timestamp)}</p>
      </div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export const ChatInterface = ({ messages, isTyping, thinkingText, onSend }) => {
  const [input, setInput] = useState('');
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const lastId   = messages[messages.length - 1]?.id;

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

      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your campaigns…"
            rows={1}
            disabled={isTyping}
            className="flex-1 resize-none text-sm border border-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400 placeholder:text-slate-400 max-h-32 overflow-y-auto"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="w-10 h-10 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shrink-0"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          AI Ad Manager can make changes to your campaigns. Always review before confirming.
        </p>
      </div>
    </div>
  );
};
