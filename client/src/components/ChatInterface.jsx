import { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, Send, Paperclip, CheckCircle2, XCircle, ArrowUpRight, BarChart3, Target, TrendingDown, Search, FileText, DollarSign, AlertTriangle, Zap, X, Upload, Image, Film, TrendingUp, ChevronRight, Shield, Sparkles } from 'lucide-react';

// ── Typing indicator ──────────────────────────────────────────────────────────
const TypingIndicator = ({ thinkingText }) => (
  <div className="flex items-end gap-3 mb-6">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
      <Bot size={15} className="text-white" />
    </div>
    <div className="bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-2.5 shadow-sm">
      <div className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </div>
      {thinkingText && <span className="text-xs text-blue-600 italic">{thinkingText}</span>}
    </div>
  </div>
);

// ── Markdown table parser ────────────────────────────────────────────────────
const isTableRow = (line) => line.trim().startsWith('|') && line.trim().endsWith('|');
const isSeparator = (line) => /^\|[\s\-:|]+\|$/.test(line.trim());
const isNumeric = (s) => /^[\s$\-]?[\d,]+\.?\d*[%x]?\s*$/.test(s.trim());

const parseMarkdownTable = (text) => {
  const lines = text.split('\n');
  const segments = [];
  let textBuf = [];
  let i = 0;

  const RICH_BLOCKS = ['adlib', 'metrics', 'options', 'insights', 'score', 'copyvariations', 'steps'];

  while (i < lines.length) {
    const trimmed = lines[i].trim();
    const blockMatch = trimmed.startsWith('```') && RICH_BLOCKS.find(b => trimmed === '```' + b);
    if (blockMatch) {
      if (textBuf.length) { segments.push({ type: 'text', content: textBuf.join('\n') }); textBuf = []; }
      i++;
      let jsonBuf = '';
      while (i < lines.length && lines[i].trim() !== '```') { jsonBuf += lines[i] + '\n'; i++; }
      if (i < lines.length) i++;
      try {
        const data = JSON.parse(jsonBuf.trim());
        if (blockMatch === 'adlib' && Array.isArray(data)) segments.push({ type: 'adlib', ads: data });
        else segments.push({ type: blockMatch, data });
      } catch {}
      continue;
    }
    if (isTableRow(lines[i]) && i + 1 < lines.length && isSeparator(lines[i + 1])) {
      if (textBuf.length) { segments.push({ type: 'text', content: textBuf.join('\n') }); textBuf = []; }
      const parseCells = (line) => line.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      const columns = parseCells(lines[i]);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableRow(lines[i]) && !isSeparator(lines[i])) {
        const cells = parseCells(lines[i]);
        while (cells.length < columns.length) cells.push('');
        rows.push(cells.slice(0, columns.length));
        i++;
      }
      segments.push({ type: 'table', columns, rows });
    } else { textBuf.push(lines[i]); i++; }
  }
  if (textBuf.length) segments.push({ type: 'text', content: textBuf.join('\n') });
  return segments;
};

// ── Styled table ─────────────────────────────────────────────────────────────
const StyledTable = ({ columns, rows }) => (
  <div className="my-3 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
    <table className="w-full text-xs border-collapse">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200">
          {columns.map((col, ci) => (
            <th key={ci} className="px-4 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap text-[11px] uppercase tracking-wide">{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} className={`border-b border-slate-100 last:border-0 ${ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
            {row.map((cell, ci) => (
              <td key={ci} className={`px-4 py-2.5 whitespace-nowrap ${isNumeric(cell) ? 'text-right text-slate-800 font-medium tabular-nums' : 'text-left text-slate-600'}`}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── Ad Library Cards ─────────────────────────────────────────────────────────
const platformIcon = (p) => {
  if (p === 'facebook') return '📘';
  if (p === 'instagram') return '📷';
  if (p === 'messenger') return '💬';
  return '📱';
};

const AdLibraryCards = ({ ads }) => (
  <div className="my-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
    {ads.map((ad, i) => (
      <a key={i} href={ad.snapshot_url || '#'} target="_blank" rel="noopener noreferrer"
        className="flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 hover:shadow-md transition-all group">
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-slate-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
            <span className="text-white text-[10px] font-bold">{ad.page_name?.[0]?.toUpperCase() || '?'}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-800 truncate">{ad.page_name || 'Unknown'}</p>
            <p className="text-[10px] text-slate-400">
              {ad.platforms?.map(p => platformIcon(p)).join(' ') || '📘'}
              {ad.started && <span className="ml-1">· Started {ad.started}</span>}
            </p>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            ad.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>{ad.status || 'Active'}</span>
        </div>
        <div className="px-3.5 py-3 flex-1">
          {ad.headline && <p className="text-[13px] font-semibold text-slate-800 mb-1.5 line-clamp-2">{ad.headline}</p>}
          {ad.body && <p className="text-xs text-slate-500 leading-relaxed line-clamp-3">{ad.body}</p>}
        </div>
        <div className="px-3.5 py-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-[10px] text-slate-400">Ad Library</span>
          <span className="text-[10px] text-blue-600 group-hover:text-blue-500 transition-colors">View Ad →</span>
        </div>
      </a>
    ))}
  </div>
);

// ── Metric Cards ─────────────────────────────────────────────────────────────
const MetricCards = ({ data }) => {
  if (!Array.isArray(data)) return null;
  return (
    <div className="my-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
      {data.map((m, i) => {
        const isUp = m.trend === 'up';
        const isDown = m.trend === 'down';
        const trendColor = isUp ? 'text-emerald-600' : isDown ? 'text-red-500' : 'text-slate-400';
        const bgTint = isUp ? 'bg-emerald-50/50' : isDown ? 'bg-red-50/50' : 'bg-slate-50';
        return (
          <div key={i} className={`${bgTint} rounded-xl px-3.5 py-3 border border-slate-100`}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">{m.label}</p>
            <p className="text-xl font-bold text-slate-800 leading-tight">{m.value}</p>
            {m.change && (
              <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
                {isUp && <TrendingUp size={12} />}
                {isDown && <TrendingDown size={12} />}
                <span className="text-xs font-medium">{m.change}</span>
                {m.vs && <span className="text-[10px] text-slate-400 ml-0.5">{m.vs}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Option Cards (A/B/C selectable) ──────────────────────────────────────────
const OptionCards = ({ data, onSend }) => {
  if (!data?.options) return null;
  return (
    <div className="my-3">
      {data.title && <p className="text-sm font-semibold text-slate-700 mb-2.5">{data.title}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {data.options.map((opt, i) => (
          <button key={i} onClick={() => onSend?.(`I choose Option ${opt.id}: ${opt.title}`)}
            className="flex flex-col bg-white border border-slate-200 rounded-xl p-3.5 text-left hover:border-blue-400 hover:shadow-md hover:shadow-blue-50 transition-all group relative">
            {opt.tag && (
              <span className="absolute -top-2 right-3 text-[9px] font-bold bg-gradient-to-r from-blue-500 to-violet-500 text-white px-2 py-0.5 rounded-full">{opt.tag}</span>
            )}
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">{opt.id}</span>
              <p className="text-sm font-semibold text-slate-800">{opt.title}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed flex-1">{opt.desc}</p>
            <div className="flex items-center gap-1 mt-2.5 text-blue-600 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Select</span><ChevronRight size={12} />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Insight Cards (severity-coded recommendations) ───────────────────────────
const InsightCards = ({ data, onSend }) => {
  if (!Array.isArray(data)) return null;
  const severityConfig = {
    critical: { border: 'border-l-red-500', bg: 'bg-red-50/60', icon: '🔴', iconCls: 'text-red-500' },
    warning:  { border: 'border-l-amber-400', bg: 'bg-amber-50/60', icon: '🟡', iconCls: 'text-amber-500' },
    success:  { border: 'border-l-emerald-500', bg: 'bg-emerald-50/60', icon: '🟢', iconCls: 'text-emerald-500' },
    info:     { border: 'border-l-blue-400', bg: 'bg-blue-50/60', icon: '🔵', iconCls: 'text-blue-500' },
  };
  return (
    <div className="my-3 space-y-2">
      {data.map((item, i) => {
        const cfg = severityConfig[item.severity] || severityConfig.info;
        return (
          <div key={i} className={`${cfg.bg} border border-slate-100 border-l-4 ${cfg.border} rounded-xl px-4 py-3 flex items-start gap-3`}>
            <span className="text-sm mt-0.5">{cfg.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
            {item.action && onSend && (
              <button onClick={() => onSend(item.action)}
                className="shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm">
                {item.action}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Score Card (audit health) ────────────────────────────────────────────────
const ScoreCard = ({ data }) => {
  if (!data?.score && data?.score !== 0) return null;
  const score = data.score;
  const max = data.max || 10;
  const pct = (score / max) * 100;
  const color = pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-500' : 'text-red-500';
  const ringColor = pct >= 80 ? 'stroke-emerald-500' : pct >= 50 ? 'stroke-amber-400' : 'stroke-red-500';
  const statusIcon = { good: '✅', warning: '⚠️', bad: '❌' };

  return (
    <div className="my-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-5">
        {/* Score ring */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#e2e8f0" strokeWidth="6" />
            <circle cx="40" cy="40" r="34" fill="none" className={ringColor} strokeWidth="6"
              strokeLinecap="round" strokeDasharray={`${pct * 2.136} 213.6`} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${color}`}>{score}</span>
            <span className="text-[9px] text-slate-400">/{max}</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-800 mb-2">{data.label || 'Health Score'}</p>
          {data.items?.map((item, i) => (
            <div key={i} className="flex items-start gap-2 mb-1.5">
              <span className="text-sm mt-px">{statusIcon[item.status] || '•'}</span>
              <p className="text-xs text-slate-600 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── Copy Variations (A/B selectable ad copy) ─────────────────────────────────
const CopyVariations = ({ data, onSend }) => {
  if (!data?.variations) return null;
  return (
    <div className="my-3">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {data.variations.map((v, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-blue-300 transition-all group">
            <div className="px-3.5 pt-3 pb-2 border-b border-slate-100 flex items-center justify-between">
              <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">{v.id}</span>
              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{v.cta?.replace(/_/g, ' ') || 'CTA'}</span>
            </div>
            <div className="px-3.5 py-3">
              <p className="text-xs text-slate-500 mb-2 leading-relaxed">{v.primary}</p>
              <p className="text-sm font-semibold text-slate-800">{v.headline}</p>
            </div>
            <div className="px-3.5 pb-3">
              <button onClick={() => onSend?.(`Use copy variation ${v.id}: "${v.headline}"`)}
                className="w-full text-xs font-medium py-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors">
                Use this copy
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Steps List (prioritized actions) ─────────────────────────────────────────
const StepsList = ({ data }) => {
  if (!Array.isArray(data)) return null;
  const priorityDot = { high: 'bg-red-500', medium: 'bg-amber-400', low: 'bg-emerald-500' };
  const priorityLabel = { high: 'Urgent', medium: 'This week', low: 'Opportunity' };
  return (
    <div className="my-3 space-y-2">
      {data.map((step, i) => (
        <div key={i} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            <span className="text-sm font-bold text-slate-300 w-5 text-right">{i + 1}</span>
            <span className={`w-2.5 h-2.5 rounded-full ${priorityDot[step.priority] || 'bg-slate-300'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-slate-800">{step.title}</p>
              {step.priority && <span className="text-[9px] font-medium text-slate-400 uppercase">{priorityLabel[step.priority] || step.priority}</span>}
            </div>
            {step.reason && <p className="text-xs text-slate-500 mt-0.5">{step.reason}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

// ── Rich text renderer ───────────────────────────────────────────────────────
const renderInline = (text) =>
  text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i} className="text-slate-800 font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith('`'))  return <code key={i} className="bg-slate-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    return <span key={i}>{part}</span>;
  });

const renderRichText = (text) => {
  const lines = text.split('\n');
  const elements = [];
  let listBuf = [];
  let listType = null;

  const flushList = () => {
    if (!listBuf.length) return;
    const Tag = listType === 'ol' ? 'ol' : 'ul';
    const cls = listType === 'ol'
      ? 'list-decimal list-inside space-y-1 my-1.5 ml-1 text-slate-600'
      : 'list-disc list-inside space-y-1 my-1.5 ml-1 text-slate-600';
    elements.push(<Tag key={`list-${elements.length}`} className={cls}>{listBuf.map((item, i) => <li key={i}>{renderInline(item)}</li>)}</Tag>);
    listBuf = []; listType = null;
  };

  for (const line of lines) {
    if (line.startsWith('### ')) { flushList(); elements.push(<p key={elements.length} className="text-sm font-bold text-slate-800 mt-3 mb-1">{renderInline(line.slice(4))}</p>); continue; }
    if (line.startsWith('## '))  { flushList(); elements.push(<p key={elements.length} className="text-base font-bold text-slate-800 mt-3 mb-1">{renderInline(line.slice(3))}</p>); continue; }
    const bullet = line.match(/^[\-\*]\s+(.*)/);
    if (bullet) { if (listType && listType !== 'ul') flushList(); listType = 'ul'; listBuf.push(bullet[1]); continue; }
    const numbered = line.match(/^\d+\.\s+(.*)/);
    if (numbered) { if (listType && listType !== 'ol') flushList(); listType = 'ol'; listBuf.push(numbered[1]); continue; }
    flushList();
    if (!line.trim()) { elements.push(<div key={elements.length} className="h-2" />); continue; }
    elements.push(<p key={elements.length}>{renderInline(line)}</p>);
  }
  flushList();
  return elements;
};

const fmtTime = (date) =>
  new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));

// ── Quick reply / Confirm-Reject chips ───────────────────────────────────────
const QuickReplies = ({ actions, onSend, disabled }) => (
  <div className="flex justify-end flex-wrap gap-2 mt-3 mb-1 pr-1">
    {actions.map(({ label, value, variant = 'default' }) => (
      <button key={value} onClick={() => onSend(value)} disabled={disabled}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all disabled:opacity-40 disabled:cursor-not-allowed
          ${variant === 'confirm' ? 'bg-emerald-500 hover:bg-emerald-400 text-white border-emerald-400 shadow-md shadow-emerald-100' :
            variant === 'danger'  ? 'bg-red-500 hover:bg-red-400 text-white border-red-400 shadow-md shadow-red-100' :
            'bg-white hover:bg-blue-50 text-blue-600 border-blue-200 shadow-sm'}`}>
        {variant === 'confirm' && <CheckCircle2 size={14} />}
        {variant === 'danger' && <XCircle size={14} />}
        {label}
      </button>
    ))}
  </div>
);

// ── Report renderer ──────────────────────────────────────────────────────────
const roasColor = (r) => r >= 3 ? 'text-emerald-600' : r >= 2 ? 'text-amber-600' : r > 0 ? 'text-red-500' : 'text-slate-400';
const truncate = (s, n = 28) => s.length > n ? s.slice(0, n) + '…' : s;
const fmtUSD = (n) => n > 0 ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00';
const fmtNum = (n) => n > 0 ? n.toLocaleString() : '—';

const SummaryCard = ({ label, value, sub }) => (
  <div className="flex flex-col gap-0.5 bg-slate-50 rounded-xl px-3 py-2.5 flex-1 min-w-0">
    <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
    <p className="text-lg font-bold text-slate-800 leading-tight">{value}</p>
    {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
  </div>
);

const ReportMessage = ({ message, timestamp }) => {
  const { campaigns = [], insights, adAccountId } = message;
  const totSpend   = insights?.totalSpend   ?? campaigns.reduce((s, c) => s + c.spend, 0);
  const totImp     = insights?.impressions  ?? campaigns.reduce((s, c) => s + c.impressions, 0);
  const totClicks  = insights?.clicks       ?? campaigns.reduce((s, c) => s + c.clicks, 0);
  const avgRoas    = insights?.roas         ?? (() => { const a = campaigns.filter(c => c.roas > 0); return a.length ? a.reduce((s, c) => s + c.roas, 0) / a.length : 0; })();

  return (
    <div className="flex items-end gap-3 mb-6">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
        <Bot size={15} className="text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm overflow-hidden shadow-sm">
          <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-slate-800">Campaign Performance Report</p>
              <p className="text-xs text-slate-400 mt-0.5">Last 7 days · <span className="font-mono">{adAccountId}</span></p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded font-medium">Meta Ads API</span>
          </div>
          <div className="px-3 py-3 flex gap-2 border-b border-slate-200">
            <SummaryCard label="Total Spend" value={fmtUSD(totSpend)} sub="Last 7 days" />
            <SummaryCard label="Impressions" value={fmtNum(totImp)} sub="Last 7 days" />
            <SummaryCard label="Clicks" value={fmtNum(totClicks)} sub="Last 7 days" />
            <SummaryCard label="Avg ROAS" value={avgRoas > 0 ? `${avgRoas.toFixed(1)}x` : '—'} sub="Across campaigns" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Campaign','Delivery','Budget','Spend','ROAS','Impressions','Clicks','CTR'].map(h => (
                    <th key={h} className={`px-3 py-2.5 font-semibold text-slate-500 ${['Budget','Spend','ROAS','Impressions','Clicks','CTR'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c, i) => (
                  <tr key={c.id} className={`border-b border-slate-100 last:border-0 ${i % 2 === 1 ? 'bg-white' : 'bg-slate-50/50'}`}>
                    <td className="px-3 py-2.5 max-w-[180px]"><p className="font-medium text-slate-800" title={c.name}>{truncate(c.name)}</p><p className="text-[10px] text-slate-400 font-mono mt-0.5 truncate">{c.id}</p></td>
                    <td className="px-3 py-2.5">{c.status === 'ACTIVE' ? <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 px-1.5 py-0.5 rounded-full font-medium text-[10px]"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Active</span> : <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded-full font-medium text-[10px]">Paused</span>}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">${(c.daily_budget / 100).toFixed(0)}/day</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-slate-800">{fmtUSD(c.spend)}</td>
                    <td className={`px-3 py-2.5 text-right font-bold ${roasColor(c.roas)}`}>{c.roas > 0 ? `${c.roas}x` : '—'}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{fmtNum(c.impressions)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-500">{fmtNum(c.clicks)}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{c.ctr > 0 ? `${c.ctr.toFixed(2)}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 flex items-center gap-1.5">
            <span className="text-slate-400">📡</span>
            <code className="text-[10px] text-slate-400 font-mono">GET /{adAccountId}/insights</code>
            <span className="text-slate-300">·</span>
            <code className="text-[10px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded font-mono">ads_read</code>
            <span className="ml-auto text-[10px] text-slate-400">{fmtTime(timestamp)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Table renderer (structured) ──────────────────────────────────────────────
const TableMessage = ({ message }) => (
  <div className="flex items-end gap-3 mb-2">
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
      <Bot size={15} className="text-white" />
    </div>
    <div className="max-w-[95%] w-full">
      <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm overflow-hidden shadow-sm">
        <table className="w-full text-xs border-collapse">
          <thead><tr className="bg-slate-50 border-b border-slate-200">{message.columns.map((col) => (<th key={col} className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">{col}</th>))}</tr></thead>
          <tbody>{message.rows.map((row, ri) => (<tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>{row.map((cell, ci) => (<td key={ci} className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{cell}</td>))}</tr>))}</tbody>
        </table>
        {message.summary && <div className="px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500 italic">{renderInline(message.summary)}</div>}
      </div>
      <p className="text-xs text-slate-400 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
    </div>
  </div>
);

// ── Attachment thumbnail chip ────────────────────────────────────────────────
const AttachmentChip = ({ attachment, onRemove }) => {
  const isImage = attachment.file?.type?.startsWith('image/');
  return (
    <div className="relative group flex-shrink-0">
      <div className={`w-20 h-20 rounded-xl border overflow-hidden flex items-center justify-center
        ${attachment.status === 'error' ? 'border-red-300 bg-red-50' :
          attachment.status === 'done' ? 'border-emerald-300 bg-white' :
          'border-slate-200 bg-slate-50'}`}>
        {attachment.preview ? (
          <img src={attachment.preview} alt={attachment.file.name} className="w-full h-full object-cover" />
        ) : (
          <Film size={24} className="text-slate-400" />
        )}
        {/* Upload progress overlay */}
        {attachment.status === 'uploading' && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-blue-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="text-[9px] font-medium text-blue-600 mt-1">{attachment.progress}%</span>
          </div>
        )}
        {attachment.status === 'done' && (
          <div className="absolute bottom-1 right-1">
            <CheckCircle2 size={14} className="text-emerald-500 bg-white rounded-full" />
          </div>
        )}
        {attachment.status === 'error' && (
          <div className="absolute bottom-1 right-1">
            <XCircle size={14} className="text-red-500 bg-white rounded-full" />
          </div>
        )}
      </div>
      {/* Remove button */}
      {onRemove && (
        <button onClick={() => onRemove(attachment.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <X size={10} />
        </button>
      )}
      {/* Filename */}
      <p className="text-[9px] text-slate-500 mt-1 truncate w-20 text-center">{attachment.file?.name?.slice(0, 12)}</p>
    </div>
  );
};

// ── Attachment bar (above input) ─────────────────────────────────────────────
const AttachmentBar = ({ attachments, onRemove }) => {
  if (!attachments.length) return null;
  return (
    <div className="flex gap-2 px-4 pt-3 pb-1 overflow-x-auto">
      {attachments.map((a) => (
        <AttachmentChip key={a.id} attachment={a} onRemove={onRemove} />
      ))}
    </div>
  );
};

// ── Message attachment thumbnails (in user bubble) ───────────────────────────
const MessageAttachments = ({ attachments }) => {
  if (!attachments?.length) return null;
  return (
    <div className="flex gap-1.5 flex-wrap mb-2">
      {attachments.map((a, i) => (
        <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-white/30">
          {a.preview ? (
            <img src={a.preview} alt={a.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-white/10 flex items-center justify-center">
              <Film size={16} className="text-white/70" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ── Message bubble ────────────────────────────────────────────────────────────
const MessageBubble = ({ message, isLatest, onSend, isTyping }) => {
  if (message.type === 'report') return (<><ReportMessage message={message} timestamp={message.timestamp} /><div className="mb-2" /></>);
  if (message.type === 'table') return (<><TableMessage message={message} />{isLatest && message.actions?.length > 0 && <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />}<div className="mb-6" /></>);

  const isAgent = message.role === 'agent';
  if (isAgent) {
    const segments = parseMarkdownTable(message.text);
    const hasWide = segments.some(s => s.type !== 'text');
    return (
      <>
        <div className="flex items-end gap-3 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0 mb-0.5">
            <Bot size={15} className="text-white" />
          </div>
          <div className={hasWide ? 'max-w-[95%] flex-1 min-w-0' : 'max-w-[80%]'}>
            <div className="bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed shadow-sm">
              {segments.map((seg, i) => {
                switch (seg.type) {
                  case 'table': return <StyledTable key={i} columns={seg.columns} rows={seg.rows} />;
                  case 'adlib': return <AdLibraryCards key={i} ads={seg.ads} />;
                  case 'metrics': return <MetricCards key={i} data={seg.data} />;
                  case 'options': return <OptionCards key={i} data={seg.data} onSend={onSend} />;
                  case 'insights': return <InsightCards key={i} data={seg.data} onSend={onSend} />;
                  case 'score': return <ScoreCard key={i} data={seg.data} />;
                  case 'copyvariations': return <CopyVariations key={i} data={seg.data} onSend={onSend} />;
                  case 'steps': return <StepsList key={i} data={seg.data} />;
                  default: return <div key={i} className="whitespace-pre-wrap">{renderRichText(seg.content)}</div>;
                }
              })}
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">{fmtTime(message.timestamp)}</p>
          </div>
        </div>
        {isLatest && message.actions?.length > 0 && <QuickReplies actions={message.actions} onSend={onSend} disabled={isTyping} />}
        <div className="mb-6" />
      </>
    );
  }

  // User message
  return (
    <div className="flex items-end justify-end gap-3 mb-6">
      <div className="max-w-[75%]">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed shadow-md shadow-blue-200/30">
          {message.attachments && <MessageAttachments attachments={message.attachments} />}
          {message.text}
        </div>
        <p className="text-xs text-slate-400 mt-1 text-right mr-1">{fmtTime(message.timestamp)}</p>
      </div>
    </div>
  );
};

// ── Icon map for action cards ────────────────────────────────────────────────
const ICON_MAP = { BarChart3, Target, TrendingDown, Search, FileText, DollarSign, AlertTriangle, Zap };

const ActionCard = ({ icon, color, label, desc, prompt, onSend, disabled }) => {
  const Icon = ICON_MAP[icon] || Zap;
  return (
    <button onClick={() => onSend(prompt)} disabled={disabled}
      className="flex flex-col bg-white/80 backdrop-blur-sm border border-slate-200 rounded-xl p-4 text-left hover:border-blue-300 hover:shadow-md hover:shadow-blue-50 transition-all disabled:opacity-40 group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}><Icon size={18} className="text-white" /></div>
        <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors mt-1" />
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">{label}</p>
      <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
    </button>
  );
};

// ── Mode toggle ──────────────────────────────────────────────────────────────
const ModeToggle = ({ mode, setMode }) => (
  <div className="flex items-center gap-1 bg-slate-100 rounded-full p-0.5">
    {['Fast', 'Deep Research'].map((m) => (
      <button key={m} onClick={() => setMode(m)}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${mode === m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
        {m}
      </button>
    ))}
  </div>
);

// ── Input box with drag & drop ───────────────────────────────────────────────
const ChatInput = ({ input, setInput, onKeyDown, onSend, onFilesAdded, attachments, onRemoveAttachment, fileRef, mode, setMode, isTyping, handleFileUpload, isOver }) => (
  <div className={`bg-white/80 backdrop-blur-xl border rounded-2xl overflow-hidden shadow-lg shadow-slate-200/50 transition-all
    ${isOver ? 'border-blue-400 ring-2 ring-blue-100' : 'border-slate-200'}`}>
    <AttachmentBar attachments={attachments} onRemove={onRemoveAttachment} />
    <div className="px-4 pt-4 pb-3">
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={attachments.length ? 'Describe what to do with these files...' : 'Ask anything about your ads'}
        rows={1}
        disabled={isTyping}
        className="w-full resize-none text-sm bg-transparent text-slate-800 placeholder:text-slate-400 focus:outline-none disabled:text-slate-400 max-h-32 overflow-y-auto"
        style={{ lineHeight: '1.5' }}
      />
    </div>
    <div className="px-4 pb-3 flex items-center justify-between">
      <ModeToggle mode={mode} setMode={setMode} />
      <div className="flex items-center gap-2">
        <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <Paperclip size={16} />
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={handleFileUpload} />
        <button onClick={onSend} disabled={(!input.trim() && !attachments.length) || isTyping}
          className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-200 disabled:text-slate-400 text-white flex items-center justify-center transition-colors shadow-sm">
          <Send size={14} />
        </button>
      </div>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const ChatInterface = ({ messages, isTyping, thinkingText, onSend, suggestedActions = [], mode = 'Fast', onModeChange, adAccountId }) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState([]); // { id, file, preview, status, progress, result }
  const [isDragOver, setIsDragOver] = useState(false);
  const setMode = onModeChange || (() => {});
  const endRef   = useRef(null);
  const inputRef = useRef(null);
  const fileRef  = useRef(null);
  const lastId   = messages[messages.length - 1]?.id;
  const isEmptyState = messages.length <= 1;
  const dragCounter = useRef(0);

  // Upload a single file to Meta via our bulk-upload endpoint
  const uploadFile = useCallback(async (attachment) => {
    if (!adAccountId) {
      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'error', error: 'Select an ad account first' } : a));
      return;
    }

    setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'uploading', progress: 10 } : a));

    try {
      // Read file as base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(attachment.file);
      });

      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, progress: 40 } : a));

      const res = await fetch('/api/assets/bulk-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adAccountId,
          files: [{ name: attachment.file.name, type: attachment.file.type, base64 }],
        }),
      });

      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, progress: 80 } : a));

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const result = data.results?.[0];
      if (result?.status === 'success') {
        setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'done', progress: 100, result } : a));
      } else {
        setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: result?.status === 'pending' ? 'done' : 'error', progress: 100, result, error: result?.message } : a));
      }
    } catch (err) {
      setAttachments(prev => prev.map(a => a.id === attachment.id ? { ...a, status: 'error', progress: 0, error: err.message } : a));
    }
  }, [adAccountId]);

  // Add files from input or drag & drop
  const addFiles = useCallback((fileList) => {
    const newAttachments = Array.from(fileList)
      .filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
      .map(file => {
        const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
        const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null;
        return { id, file, preview, status: 'queued', progress: 0, result: null };
      });

    setAttachments(prev => [...prev, ...newAttachments]);

    // Start uploading each
    newAttachments.forEach(a => uploadFile(a));
  }, [uploadFile]);

  const handleFileInput = useCallback((e) => {
    if (e.target.files?.length) addFiles(e.target.files);
    e.target.value = '';
  }, [addFiles]);

  const removeAttachment = useCallback((id) => {
    setAttachments(prev => {
      const a = prev.find(x => x.id === id);
      if (a?.preview) URL.revokeObjectURL(a.preview);
      return prev.filter(x => x.id !== id);
    });
  }, []);

  // Drag & drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.types.includes('Files')) setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) setIsDragOver(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = useCallback((text) => {
    const t = (typeof text === 'string' ? text : input).trim();
    const doneAttachments = attachments.filter(a => a.status === 'done');

    if (!t && !doneAttachments.length) return;
    if (isTyping) return;

    // Build message text with asset info
    let msgText = t;
    if (doneAttachments.length) {
      const assetLines = doneAttachments.map(a => {
        if (a.result?.image_hash) return `[Uploaded image: ${a.file.name}, image_hash: ${a.result.image_hash}]`;
        if (a.result?.type === 'video') return `[Attached video: ${a.file.name} — needs file_url for upload]`;
        return `[Attached file: ${a.file.name}]`;
      });
      msgText = assetLines.join('\n') + (t ? '\n\n' + t : '\n\nI\'ve uploaded these creatives to the ad account. What would you like to do with them?');
    }

    // Pass attachment previews so user message shows thumbnails
    const msgAttachments = doneAttachments.map(a => ({
      name: a.file.name,
      preview: a.preview,
      type: a.file.type,
      image_hash: a.result?.image_hash,
    }));

    onSend(msgText, msgAttachments);
    setInput('');
    setAttachments([]);
    inputRef.current?.focus();
  }, [input, isTyping, onSend, attachments]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  }, [handleSend]);

  return (
    <div className="flex flex-col h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-blue-50/80 backdrop-blur-sm border-2 border-dashed border-blue-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none">
          <Upload size={48} className="text-blue-500 mb-3" />
          <p className="text-lg font-semibold text-blue-700">Drop your images & videos here</p>
          <p className="text-sm text-blue-500 mt-1">They'll be uploaded to your ad account</p>
        </div>
      )}

      {/* Empty State */}
      {isEmptyState && (
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <h1 className="text-3xl font-bold text-slate-800 mb-10 text-center">
            Ask anything about your ads
          </h1>

          <div className="w-full max-w-4xl">
            <div className="max-w-2xl mx-auto">
              <ChatInput
                input={input} setInput={setInput} onKeyDown={handleKeyDown}
                onSend={() => handleSend()} onFilesAdded={addFiles}
                attachments={attachments} onRemoveAttachment={removeAttachment}
                fileRef={fileRef} mode={mode} setMode={setMode} isTyping={isTyping}
                handleFileUpload={handleFileInput} isOver={isDragOver}
              />
            </div>

            <div className="grid grid-cols-4 gap-3 mt-6">
              {suggestedActions.map((action) => (
                <ActionCard key={action.label} {...action} onSend={onSend} disabled={isTyping} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Chat messages */}
      {!isEmptyState && (
        <>
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 pt-6 pb-2">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} isLatest={msg.id === lastId} onSend={handleSend} isTyping={isTyping} />
              ))}
              {isTyping && <TypingIndicator thinkingText={thinkingText} />}
              <div ref={endRef} />
            </div>
          </div>

          <div className="shrink-0 border-t border-slate-200 bg-white/70 backdrop-blur-xl px-4 py-3">
            <div className="max-w-3xl mx-auto">
              <ChatInput
                input={input} setInput={setInput} onKeyDown={handleKeyDown}
                onSend={() => handleSend()} onFilesAdded={addFiles}
                attachments={attachments} onRemoveAttachment={removeAttachment}
                fileRef={fileRef} mode={mode} setMode={setMode} isTyping={isTyping}
                handleFileUpload={handleFileInput} isOver={isDragOver}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
