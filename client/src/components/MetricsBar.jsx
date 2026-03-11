import { DollarSign, TrendingUp, ShoppingCart, BarChart2 } from 'lucide-react';

const MetricCard = ({ icon: Icon, label, value, sub, color, isLoading }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
    <div className={`p-2.5 rounded-lg ${color}`}>
      <Icon size={20} className="text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm text-slate-500 font-medium">{label}</p>
      {isLoading ? (
        <div className="h-7 w-24 bg-slate-200 animate-pulse rounded mt-1" />
      ) : (
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
      )}
      {sub && !isLoading && (
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      )}
    </div>
  </div>
);

export const MetricsBar = ({ insights, isLoading }) => {
  const fmt = (n) => n != null ? `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';
  const fmtRoas = (n) => n != null ? `${Number(n).toFixed(2)}x` : '—';
  const fmtNum = (n) => n != null ? Number(n).toLocaleString() : '—';

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        icon={DollarSign}
        label="Total Spend (7d)"
        value={fmt(insights?.totalSpend)}
        sub="Last 7 days"
        color="bg-blue-500"
        isLoading={isLoading}
      />
      <MetricCard
        icon={TrendingUp}
        label="ROAS"
        value={fmtRoas(insights?.roas)}
        sub={insights?.totalRevenue ? `$${Number(insights.totalRevenue).toLocaleString()} revenue` : undefined}
        color="bg-emerald-500"
        isLoading={isLoading}
      />
      <MetricCard
        icon={ShoppingCart}
        label="Conversions"
        value={fmtNum(insights?.conversions)}
        sub="Purchases"
        color="bg-violet-500"
        isLoading={isLoading}
      />
      <MetricCard
        icon={BarChart2}
        label="Impressions"
        value={fmtNum(insights?.impressions)}
        sub={insights?.ctr ? `${Number(insights.ctr).toFixed(2)}% CTR` : undefined}
        color="bg-amber-500"
        isLoading={isLoading}
      />
    </div>
  );
};
