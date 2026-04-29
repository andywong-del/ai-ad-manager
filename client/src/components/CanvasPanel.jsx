import { useState, useMemo } from 'react';
import { X, BarChart3, Maximize2, Minimize2, Download, Filter, ChevronDown, ChevronRight, AlertTriangle, AlertOctagon, TrendingUp, Pause, Play, ArrowUpRight, ArrowDownRight, DollarSign, MessageSquare, Target, MousePointerClick, Activity, PieChart as PieIcon, BarChart2 as BarIcon, LineChart as LineIcon, Flame, Swords, Scale, Lightbulb, Sparkles, Rocket } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PieChart, Pie, Cell,
  AreaChart, Area,
  LineChart, Line,
} from 'recharts';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent,
} from './ui/chart.jsx';

// Slot colours come from the global CSS palette in index.css. Keeping them
// as `var(--chart-N)` references means a single token swap re-skins every
// chart in the app without touching this file.
const CHART_VARS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];

const fmtNum = (n) => {
  if (n == null) return '—';
  if (typeof n === 'string') return n;
  if (Math.abs(n) >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
};

const fmtCurrency = (n, currency = '$') => {
  if (n == null) return '—';
  return `${currency}${fmtNum(n)}`;
};

// ── KPI Card ────────────────────────────────────────────────────────────────
// Picks an icon + accent color from the label so each KPI gets its own
// visual identity instead of looking like five identical cells. Match is
// loose because label text is user-driven (`总消耗`, `Avg CPA`, etc.).
const kpiVisualFor = (label) => {
  const l = (label || '').toLowerCase();
  if (/spend|cost|消耗|花费/.test(l))           return { Icon: DollarSign,         tint: 'text-orange-500',  ring: 'from-orange-400/20 to-orange-500/0' };
  if (/cpa|cpl|cpc|cpm/.test(l))                 return { Icon: Target,             tint: 'text-blue-500',    ring: 'from-blue-400/20 to-blue-500/0' };
  if (/conv|对话|消息|message|lead/.test(l))     return { Icon: MessageSquare,      tint: 'text-emerald-500', ring: 'from-emerald-400/20 to-emerald-500/0' };
  if (/ctr|click|点击/.test(l))                  return { Icon: MousePointerClick,  tint: 'text-violet-500',  ring: 'from-violet-400/20 to-violet-500/0' };
  if (/freq|频率|频次/.test(l))                  return { Icon: Activity,           tint: 'text-amber-500',   ring: 'from-amber-400/20 to-amber-500/0' };
  return                                                { Icon: TrendingUp,         tint: 'text-slate-500',   ring: 'from-slate-300/30 to-slate-400/0' };
};

const KpiCard = ({ label, value, change, trend }) => {
  const isUp = trend === 'up' || (typeof change === 'string' && change.startsWith('+'));
  const isDown = trend === 'down' || (typeof change === 'string' && change.startsWith('-'));
  // For cost metrics, down is good. For volume metrics, up is good.
  const isCost = /cost|cpa|cpl|cpm|cpc|spend/i.test(label);
  const isGood = isCost ? isDown : isUp;
  const isFlat = !isUp && !isDown;
  const { Icon, tint, ring } = kpiVisualFor(label);

  // Pill style for the change indicator — soft tinted background + matching
  // text color reads at a glance vs the previous bare-text approach.
  const pill = isFlat
    ? 'bg-slate-100 text-slate-500'
    : isGood
    ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100'
    : 'bg-rose-50 text-rose-600 ring-1 ring-rose-100';

  return (
    <div className="group relative bg-white rounded-2xl border border-slate-200/70 px-4 py-4 flex-1 min-w-[150px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
      {/* Soft top-left glow tied to the metric's color — adds identity
          without committing to a heavy colored bar. */}
      <div className={`pointer-events-none absolute -top-10 -left-10 w-32 h-32 rounded-full bg-gradient-to-br ${ring} blur-2xl`} />
      <div className="relative flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">{label}</p>
        <div className={`w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center ${tint} group-hover:scale-105 transition-transform`}>
          <Icon size={14} strokeWidth={2.25} />
        </div>
      </div>
      <p className="relative text-[26px] leading-none font-extrabold text-slate-900 tracking-tight">{value}</p>
      {change && (
        <div className="relative mt-2.5 flex items-center gap-1.5">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${pill}`}>
            {isUp ? <ArrowUpRight size={10} strokeWidth={2.5} /> : isDown ? <ArrowDownRight size={10} strokeWidth={2.5} /> : null}
            {change}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">vs prev</span>
        </div>
      )}
    </div>
  );
};

// ── Chart Card shell ────────────────────────────────────────────────────────
// Shared frame so all three chart blocks (donut/bar/trend) share the same
// header treatment (icon + title + optional right-side stat) instead of
// each one rolling its own.
const ChartCard = ({ icon: Icon, iconTint = 'text-slate-500', title, headline, headlineLabel, children, className = '' }) => (
  <div className={`bg-white rounded-2xl border border-slate-200/70 p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}>
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && (
          <div className={`w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center ${iconTint}`}>
            <Icon size={14} strokeWidth={2.25} />
          </div>
        )}
        <p className="text-[12px] font-semibold text-slate-700 tracking-tight">{title}</p>
      </div>
      {headline != null && (
        <div className="text-right">
          <p className="text-[15px] font-extrabold text-slate-900 leading-none tracking-tight">{headline}</p>
          {headlineLabel && <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider mt-1">{headlineLabel}</p>}
        </div>
      )}
    </div>
    {children}
  </div>
);

// ── Recommendation Card ─────────────────────────────────────────────────────
//
// Lucide icons replace the prior 🚨/⚠️/🚀/💡 emojis — emoji rendered
// inconsistently across OS / browser (colour, kerning, baseline) and felt
// out of place next to the rest of the dashboard, which is now built
// entirely from stroked Lucide glyphs.
const SEVERITY_STYLES = {
  critical: { Icon: AlertOctagon, iconBg: 'bg-rose-100',    iconColor: 'text-rose-600',    bg: 'bg-rose-50/70',    border: 'border-rose-200/70',    text: 'text-rose-700' },
  warning:  { Icon: AlertTriangle, iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',   bg: 'bg-amber-50/70',   border: 'border-amber-200/70',   text: 'text-amber-700' },
  success:  { Icon: Sparkles,      iconBg: 'bg-emerald-100',iconColor: 'text-emerald-600', bg: 'bg-emerald-50/70', border: 'border-emerald-200/70', text: 'text-emerald-700' },
  info:     { Icon: Lightbulb,     iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',    bg: 'bg-blue-50/70',    border: 'border-blue-200/70',    text: 'text-blue-700' },
};

const RecommendationCard = ({ rec, onApply }) => {
  const [applied, setApplied] = useState(false);
  const s = SEVERITY_STYLES[rec.severity] || SEVERITY_STYLES.info;
  const { Icon } = s;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${s.bg} ${s.border}`}>
      <div className={`w-7 h-7 rounded-lg ${s.iconBg} ${s.iconColor} flex items-center justify-center shrink-0`}>
        <Icon size={14} strokeWidth={2.25} />
      </div>
      <p className={`flex-1 text-[13px] font-medium ${s.text}`}>{rec.text}</p>
      {rec.action && !applied && (
        <button onClick={() => { setApplied(true); onApply?.(rec); }}
          className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-400 hover:to-amber-400 shadow-sm shadow-orange-500/20 transition-all whitespace-nowrap">
          Apply
        </button>
      )}
      {applied && <span className="text-[11px] text-emerald-600 font-medium">Applied ✓</span>}
    </div>
  );
};

// ── Campaign Row ────────────────────────────────────────────────────────────
//
// Backend still sends `campaign.status` as one of these emoji glyphs (the
// AI prompt produces them and we don't want to break the contract). We
// keep accepting them as keys but render a Lucide icon — same semantics,
// consistent visual language with the rest of the panel.
const STATUS_ICONS = {
  '🚨': { Icon: Flame,           color: 'text-rose-500',    bg: 'bg-rose-100/70',    label: 'Budget Leak' },
  '⚠️': { Icon: AlertTriangle,   color: 'text-amber-500',   bg: 'bg-amber-100/70',   label: 'Creative Decay' },
  '⚔️': { Icon: Swords,          color: 'text-orange-500',  bg: 'bg-orange-100/70',  label: 'Auction Pressure' },
  '⚖️': { Icon: Scale,           color: 'text-slate-500',   bg: 'bg-slate-100',      label: 'Stable' },
  '🚀': { Icon: Rocket,          color: 'text-emerald-500', bg: 'bg-emerald-100/70', label: 'Growth' },
  '📊': { Icon: BarChart3,       color: 'text-blue-500',    bg: 'bg-blue-100/70',    label: 'Analytics' },
};

const StatusBadge = ({ status }) => {
  const meta = STATUS_ICONS[status];
  if (!meta) return <span className="text-slate-300">—</span>;
  const { Icon, color, bg, label } = meta;
  return (
    <span className={`inline-flex w-7 h-7 rounded-lg ${bg} ${color} items-center justify-center`} title={label}>
      <Icon size={14} strokeWidth={2.25} />
    </span>
  );
};

const CampaignRow = ({ campaign, isExpanded, onToggle }) => {
  return (
    <>
      <tr onClick={onToggle}
        className={`cursor-pointer transition-colors ${isExpanded ? 'bg-orange-50/50' : 'hover:bg-orange-50/30'}`}>
        <td className="px-3 py-2.5 text-center">
          <StatusBadge status={campaign.status} />
        </td>
        <td className="px-3 py-2.5">
          <p className="text-[12px] font-medium text-slate-800 truncate max-w-[200px]">{campaign.name}</p>
        </td>
        <td className="px-3 py-2.5 text-right text-[12px] text-slate-600">{fmtCurrency(campaign.spend)}</td>
        <td className="px-3 py-2.5 text-right text-[12px] text-slate-600">{fmtCurrency(campaign.cpa)}</td>
        <td className="px-3 py-2.5 text-right text-[12px] text-slate-600">{campaign.ctr ? `${campaign.ctr}%` : '—'}</td>
        <td className="px-3 py-2.5 text-right">
          <span className={`text-[11px] font-medium ${campaign.wow?.startsWith('+') ? 'text-red-500' : campaign.wow?.startsWith('-') ? 'text-emerald-600' : 'text-slate-400'}`}>
            {campaign.wow || '—'}
          </span>
        </td>
        <td className="px-3 py-2.5 text-center">
          <ChevronRight size={12} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={7} className="px-4 py-3 bg-orange-50/30 border-b border-orange-100">
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div>
                <span className="font-semibold text-slate-500">Diagnosis:</span>
                <span className="ml-2 text-slate-700">{campaign.diagnosis || 'N/A'}</span>
              </div>
              <div>
                <span className="font-semibold text-slate-500">Action:</span>
                <span className="ml-2 text-slate-700">{campaign.action || 'N/A'}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Main Canvas Panel ───────────────────────────────────────────────────────
export const CanvasPanel = ({ data, onClose, onSend }) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [expandedCampaign, setExpandedCampaign] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('spend');
  const [sortDir, setSortDir] = useState('desc');

  if (!data) return null;

  // Dashboard data only — no legacy fallback
  const dashboard = useMemo(() => {
    if (data.dashboard) return data.dashboard;
    return null;
  }, [data]);

  if (!dashboard) {
    return (
      <div className={`flex flex-col border-l border-slate-200 shadow-2xl transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-white' : 'relative h-full bg-white/95 backdrop-blur-xl'}`}>
        <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-orange-100/50 bg-gradient-to-r from-orange-50/40 to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
              <BarChart3 size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">{data.title || 'Performance Dashboard'}</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setIsFullScreen(f => !f)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-sm text-slate-500 whitespace-pre-wrap">{data.content || 'No data available'}</p>
        </div>
      </div>
    );
  }

  // Filtered + sorted campaigns
  const campaigns = useMemo(() => {
    let list = dashboard.campaigns || [];
    if (statusFilter !== 'all') {
      list = list.filter(c => c.status === statusFilter);
    }
    list.sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return list;
  }, [dashboard.campaigns, statusFilter, sortBy, sortDir]);

  const handleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  };

  const handleApply = (rec) => {
    if (rec.action && onSend) {
      const params = rec.params ? Object.entries(rec.params).map(([k, v]) => `${k}=${v}`).join(', ') : '';
      onSend(`Execute: ${rec.action}${params ? ` (${params})` : ''}`);
    }
  };

  const handleExport = () => {
    if (!dashboard.campaigns?.length) return;
    const headers = ['Status', 'Campaign', 'Spend', 'CPA', 'CTR', 'WoW', 'Diagnosis', 'Action'];
    const rows = dashboard.campaigns.map(c => [c.status, c.name, c.spend, c.cpa, c.ctr, c.wow, c.diagnosis, c.action]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${v ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `performance-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Extract chart data
  const budgetChart = dashboard.charts?.find(c => c.type === 'budget');
  const comparisonChart = dashboard.charts?.find(c => c.type === 'comparison');
  const trendChart = dashboard.charts?.find(c => c.type === 'trend');

  // bg-white on the outer container is required: in fullscreen mode
  // (fixed inset-0) the panel floats over the page with no host container
  // behind it, so without an explicit background the chat / sidebar bleeds
  // through. The dark header has its own gradient and overrides this on
  // its own row.
  return (
    <div className={`flex flex-col bg-white border-l border-slate-200/60 shadow-2xl transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50' : 'relative h-full'}`}>
      {/* Dark premium header */}
      <div className="shrink-0 relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.12),transparent_60%)]" /></div>
        <div className="relative flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-md shadow-orange-500/30">
              <BarChart3 size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-white">{dashboard.title || 'Performance Dashboard'}</p>
              {dashboard.dateRange && <p className="text-[10px] text-slate-400">{dashboard.dateRange}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors">
              <Download size={11} /> Export CSV
            </button>
            <button onClick={() => setIsFullScreen(f => !f)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              {isFullScreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable dashboard content — warm background */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 bg-gradient-to-br from-orange-50/40 via-white to-amber-50/30">
        {/* KPI Cards */}
        {dashboard.kpis?.length > 0 && (
          <div className="flex gap-3 flex-wrap">
            {dashboard.kpis.map((kpi, i) => <KpiCard key={i} {...kpi} />)}
          </div>
        )}

        {/* Charts Grid */}
        {(budgetChart || comparisonChart || trendChart) && (
          <div className="grid grid-cols-2 gap-4">
            {budgetChart?.data?.items && (() => {
              const items = budgetChart.data.items;
              const total = items.reduce((s, i) => s + (Number(i.value) || 0), 0);
              // Build a chart config keyed by slice name so the tooltip
              // shows "Sales (FB) — $1.2K" with the correct swatch colour
              // pulled from the same palette the donut renders with.
              const donutConfig = items.reduce((acc, it, i) => {
                acc[it.name] = { label: it.name, color: CHART_VARS[i % CHART_VARS.length], formatter: (v) => fmtCurrency(v) };
                return acc;
              }, {});
              return (
                <ChartCard
                  icon={PieIcon}
                  iconTint="text-orange-500"
                  title={budgetChart.data.title || 'Budget Allocation'}
                  headline={fmtCurrency(total)}
                  headlineLabel="Total"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-[160px] h-[160px] shrink-0">
                      <ChartContainer config={donutConfig} className="h-full">
                        <PieChart>
                          <Pie data={items} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={48} paddingAngle={2} stroke="none">
                            {/* Skip the CSS-var dance for donut cells —
                                slice names can contain arbitrary chars
                                (parens, slashes), so resolve straight to
                                the palette index instead. */}
                            {items.map((_, i) => <Cell key={i} fill={CHART_VARS[i % CHART_VARS.length]} />)}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent hideLabel valueFormatter={(v) => fmtCurrency(v)} />} />
                        </PieChart>
                      </ChartContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{items.length} 项</p>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      {items.map((it, i) => {
                        const pct = total > 0 ? ((Number(it.value) || 0) / total * 100) : 0;
                        return (
                          <div key={i} className="flex items-center gap-2 text-[11px]">
                            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CHART_VARS[i % CHART_VARS.length] }} />
                            <span className="flex-1 truncate text-slate-600">{it.name}</span>
                            <span className="text-slate-400 tabular-nums">{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ChartCard>
              );
            })()}
            {comparisonChart?.data?.items && (() => {
              const barConfig = {
                current:  { label: 'This Period', color: 'var(--chart-1)' },
                previous: { label: 'Previous',    color: '#e2e8f0' },
              };
              return (
                <ChartCard
                  icon={BarIcon}
                  iconTint="text-blue-500"
                  title={comparisonChart.data.title || 'CPA Comparison'}
                >
                  <ChartContainer config={barConfig} className="h-[200px]">
                    <BarChart data={comparisonChart.data.items} barGap={6} margin={{ top: 18, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <ChartTooltip cursor={{ fill: 'rgba(249,115,22,0.06)' }} content={<ChartTooltipContent />} />
                      <ChartLegend content={<ChartLegendContent />} />
                      <Bar dataKey="current"  fill="var(--color-current)"  radius={[6, 6, 0, 0]} maxBarSize={48} />
                      <Bar dataKey="previous" fill="var(--color-previous)" radius={[6, 6, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ChartContainer>
                </ChartCard>
              );
            })()}
            {trendChart?.data?.series && (() => {
              const series = trendChart.data.series;
              const last = series[series.length - 1] || {};
              const first = series[0] || {};
              const lastVal = Number(last.spend) || 0;
              const firstVal = Number(first.spend) || 0;
              const delta = firstVal > 0 ? ((lastVal - firstVal) / firstVal * 100) : 0;
              const hasConv = series[0]?.conversions != null;
              const trendConfig = {
                spend:       { label: 'Spend',       color: 'var(--chart-1)', formatter: (v) => fmtCurrency(v) },
                conversions: { label: 'Conversions', color: 'var(--chart-3)' },
              };
              return (
                <ChartCard
                  icon={LineIcon}
                  iconTint="text-emerald-500"
                  title={trendChart.data.title || '7-Day Trend'}
                  headline={fmtCurrency(lastVal)}
                  headlineLabel={`Latest · ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}
                  className="col-span-2"
                >
                  <ChartContainer config={trendConfig} className="h-[220px]">
                    <AreaChart data={series} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        {/* Gradient fills reference the same CSS vars as the
                            stroke colour, so changing --chart-1 re-skins
                            line + fill in lockstep. */}
                        <linearGradient id="cvSpendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"  stopColor="var(--color-spend)" stopOpacity={0.32}/>
                          <stop offset="100%" stopColor="var(--color-spend)" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="cvConvGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%"  stopColor="var(--color-conversions)" stopOpacity={0.28}/>
                          <stop offset="100%" stopColor="var(--color-conversions)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      {hasConv && <ChartLegend content={<ChartLegendContent />} />}
                      <Area type="monotone" dataKey="spend" stroke="var(--color-spend)" strokeWidth={2.25} fill="url(#cvSpendGrad)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} dot={false} />
                      {hasConv && (
                        <Area type="monotone" dataKey="conversions" stroke="var(--color-conversions)" strokeWidth={2.25} fill="url(#cvConvGrad)" activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }} dot={false} />
                      )}
                    </AreaChart>
                  </ChartContainer>
                </ChartCard>
              );
            })()}
          </div>
        )}

        {/* Campaign Table */}
        {campaigns.length > 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Campaigns ({campaigns.length})</p>
              <div className="flex items-center gap-2">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none">
                  {/* Native <select> can't host Lucide JSX in <option>,
                      so labels stay plain text. The emoji is still the
                      value because that's the contract the AI emits. */}
                  <option value="all">All Status</option>
                  <option value="🚨">Budget Leak</option>
                  <option value="⚠️">Creative Decay</option>
                  <option value="⚔️">Auction Pressure</option>
                  <option value="🚀">Growth</option>
                  <option value="⚖️">Stable</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase w-10">Status</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase">Campaign</th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase text-right cursor-pointer hover:text-orange-500" onClick={() => handleSort('spend')}>
                      Spend {sortBy === 'spend' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase text-right cursor-pointer hover:text-orange-500" onClick={() => handleSort('cpa')}>
                      CPA {sortBy === 'cpa' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase text-right cursor-pointer hover:text-orange-500" onClick={() => handleSort('ctr')}>
                      CTR {sortBy === 'ctr' && (sortDir === 'desc' ? '↓' : '↑')}
                    </th>
                    <th className="px-3 py-2 text-[10px] font-semibold text-slate-400 uppercase text-right">WoW</th>
                    <th className="px-3 py-2 w-6"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {campaigns.map((c, i) => (
                    <CampaignRow key={c.id || i} campaign={c}
                      isExpanded={expandedCampaign === (c.id || i)}
                      onToggle={() => setExpandedCampaign(expandedCampaign === (c.id || i) ? null : (c.id || i))} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {dashboard.recommendations?.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Recommendations</p>
            {dashboard.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} onApply={handleApply} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
