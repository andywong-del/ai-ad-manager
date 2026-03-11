import { Activity, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, class: 'text-emerald-500', dot: 'bg-emerald-500' },
  dismissed: { icon: XCircle, class: 'text-slate-400', dot: 'bg-slate-400' },
  pending: { icon: Clock, class: 'text-amber-500', dot: 'bg-amber-500' }
};

const ACTION_LABELS = {
  'PAUSE': 'Paused campaign',
  'INCREASE_BUDGET_20%': 'Increased budget 20%',
  'MONITOR': 'Set to monitor'
};

const fmtTime = (date) =>
  new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));

export const ActivityLog = ({ activities }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
      <Activity size={15} className="text-slate-500" />
      <h2 className="text-sm font-semibold text-slate-700">Activity Log</h2>
    </div>

    <div className="divide-y divide-slate-50 max-h-56 overflow-y-auto">
      {activities.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">No activity yet</p>
      ) : (
        activities.map((item) => {
          const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
          const StatusIcon = config.icon;
          return (
            <div key={item.id} className="px-5 py-3 flex items-start gap-3">
              <div className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${config.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">
                    {ACTION_LABELS[item.action] || item.action}
                  </span>
                  <span className="text-xs text-slate-400">·</span>
                  <span className="text-xs text-slate-500 truncate max-w-[160px]">{item.campaignName}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{item.details}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <StatusIcon size={13} className={config.class} />
                <span className="text-xs text-slate-400 whitespace-nowrap">{fmtTime(item.timestamp)}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  </div>
);
