import { Sparkles, PauseCircle, TrendingUp, Eye, CheckCircle, XCircle } from 'lucide-react';

const ICONS = {
  'PAUSE': PauseCircle,
  'INCREASE_BUDGET_20%': TrendingUp,
  'MONITOR': Eye
};

const COLORS = {
  'PAUSE': 'border-red-200 bg-red-50',
  'INCREASE_BUDGET_20%': 'border-green-200 bg-green-50',
  'MONITOR': 'border-yellow-200 bg-yellow-50'
};

const ICON_COLORS = {
  'PAUSE': 'text-red-500',
  'INCREASE_BUDGET_20%': 'text-green-500',
  'MONITOR': 'text-yellow-500'
};

const BADGE_LABELS = {
  'PAUSE': 'Pause Campaign',
  'INCREASE_BUDGET_20%': 'Increase Budget 20%',
  'MONITOR': 'Monitor'
};

export const AiInsightsSidebar = ({ recommendations, onApprove, onDismiss }) => (
  <aside className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col">
    <div className="px-4 py-4 border-b border-slate-100 flex items-center gap-2">
      <Sparkles size={16} className="text-violet-500" />
      <h2 className="text-sm font-semibold text-slate-700">AI Recommendations</h2>
      {recommendations.length > 0 && (
        <span className="ml-auto bg-violet-100 text-violet-700 text-xs font-semibold px-2 py-0.5 rounded-full">
          {recommendations.length}
        </span>
      )}
    </div>

    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {recommendations.length === 0 ? (
        <div className="text-center text-slate-400 text-sm py-8">
          <Sparkles size={28} className="mx-auto mb-2 text-slate-300" />
          All campaigns are performing well
        </div>
      ) : (
        recommendations.map((rec) => {
          const Icon = ICONS[rec.decision] || Eye;
          return (
            <div
              key={rec.id}
              className={`rounded-lg border p-3 ${COLORS[rec.decision] || 'border-slate-200 bg-slate-50'}`}
            >
              <div className="flex items-start gap-2 mb-2">
                <Icon size={15} className={`mt-0.5 shrink-0 ${ICON_COLORS[rec.decision]}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{rec.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{rec.reason}</p>
                  {rec.projectedImpact && (
                    <p className="text-xs font-medium text-slate-600 mt-1">
                      Impact: {rec.projectedImpact}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400">{rec.confidence} confidence</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onDismiss(rec.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-slate-700 hover:bg-white rounded transition-colors"
                    title="Dismiss"
                  >
                    <XCircle size={12} />
                    Dismiss
                  </button>
                  <button
                    onClick={() => onApprove(rec)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-slate-800 text-white hover:bg-slate-900 rounded transition-colors font-medium"
                    title="Apply this recommendation"
                  >
                    <CheckCircle size={12} />
                    Apply
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  </aside>
);
