// Lightweight chart primitives modelled on shadcn/ui's chart helpers.
//
// Goals:
//  • Theme via CSS variables — every chart series gets a `--color-<key>`
//    stamped on the wrapper, and Recharts components reference it as
//    `stroke="var(--color-spend)"`. Swap the variable, the whole chart
//    re-skins. Lines up cleanly with the project's `--chart-1..6` tokens
//    already declared in index.css.
//  • One config object per chart describes label + color per series, and
//    that same config drives the tooltip / legend rendering — so the
//    tooltip never falls out of sync with the chart's actual colors.
//  • Zero new deps: no clsx / tailwind-merge / radix. Plain string concat
//    is fine for the few class permutations we have.
//
// Usage:
//   const config = {
//     spend: { label: 'Spend', color: 'var(--chart-1)' },
//   };
//   <ChartContainer config={config} className="h-[200px]">
//     <AreaChart ...>
//       <Area dataKey="spend" stroke="var(--color-spend)" fill="var(--color-spend)" />
//       <ChartTooltip content={<ChartTooltipContent />} />
//       <ChartLegend content={<ChartLegendContent />} />
//     </AreaChart>
//   </ChartContainer>

import { createContext, useContext, useMemo, isValidElement, cloneElement, Children } from 'react';
import { ResponsiveContainer, Tooltip, Legend } from 'recharts';

const ChartContext = createContext(null);

const useChartConfig = () => useContext(ChartContext) || {};

// CSS custom-property names allow letters/digits/hyphens/underscores.
// Series keys can be human strings (e.g. "Sales (FB)"), so we slugify
// before emitting `--color-<key>`. Caller-side references should match
// this same slug, or just use the config-driven tooltip which reads
// `entry.color` directly and ignores the var.
const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');

const buildColorStyle = (config) => {
  const style = {};
  for (const [key, entry] of Object.entries(config || {})) {
    if (entry?.color) style[`--color-${slugify(key)}`] = entry.color;
  }
  return style;
};

export const ChartContainer = ({ config = {}, className = '', children }) => {
  const style = useMemo(() => buildColorStyle(config), [config]);
  return (
    <ChartContext.Provider value={config}>
      <div className={`w-full ${className}`} style={style}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
};

// Pass-throughs that default Recharts' Tooltip / Legend to our content
// renderers. Caller can still override `content` to fully customise.
export const ChartTooltip = (props) => (
  <Tooltip
    cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
    {...props}
  />
);

export const ChartLegend = (props) => (
  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} {...props} />
);

// ── Tooltip ────────────────────────────────────────────────────────────────
//
// Recharts injects `payload`, `label`, `active` props automatically. Each
// payload entry has `dataKey`, `value`, `color`, `name`. We look the
// dataKey up in the chart config to pick the human label / formatter.
export const ChartTooltipContent = ({
  active,
  payload = [],
  label,
  hideLabel = false,
  indicator = 'dot',           // 'dot' | 'line' | 'dashed'
  valueFormatter,
}) => {
  const config = useChartConfig();
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/95 backdrop-blur px-3 py-2 text-[11px] text-slate-100 shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
      {!hideLabel && label != null && (
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => {
          const key = item.dataKey || item.name;
          const cfg = config[key] || {};
          const color = cfg.color || item.color || item.payload?.fill || '#cbd5e1';
          const display = cfg.label || item.name || key;
          const formatted = valueFormatter
            ? valueFormatter(item.value, key)
            : cfg.formatter
            ? cfg.formatter(item.value)
            : item.value;
          return (
            <div key={i} className="flex items-center gap-2">
              {indicator === 'line' ? (
                <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
              ) : indicator === 'dashed' ? (
                <span className="h-0 w-3 border-t border-dashed" style={{ borderColor: color }} />
              ) : (
                <span className="h-2 w-2 rounded-sm shrink-0" style={{ background: color }} />
              )}
              <span className="text-slate-400 flex-1">{display}</span>
              <span className="font-semibold tabular-nums text-white">{formatted}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── Legend ─────────────────────────────────────────────────────────────────
//
// Recharts passes `payload` with `value` (= dataKey by default) and `color`.
// We override the label from config so it matches the tooltip exactly.
export const ChartLegendContent = ({ payload = [], className = '' }) => {
  const config = useChartConfig();
  if (!payload?.length) return null;
  return (
    <div className={`flex items-center justify-center gap-4 flex-wrap ${className}`}>
      {payload.map((item, i) => {
        const key = item.dataKey || item.value;
        const cfg = config[key] || {};
        const color = cfg.color || item.color || '#cbd5e1';
        const display = cfg.label || item.value;
        return (
          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-2 w-2 rounded-sm" style={{ background: color }} />
            <span>{display}</span>
          </div>
        );
      })}
    </div>
  );
};

// Convenience: if a child of ChartContainer needs the live config (e.g. a
// custom inline label), expose it via this hook.
export { useChartConfig };
