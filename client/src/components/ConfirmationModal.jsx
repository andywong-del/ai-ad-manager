import { useEffect } from 'react';
import { AlertTriangle, TrendingUp, PauseCircle, X } from 'lucide-react';

const ACTION_CONFIG = {
  'PAUSE': {
    icon: PauseCircle,
    iconClass: 'text-red-500',
    bgClass: 'bg-red-50',
    label: 'Pause Campaign',
    btnClass: 'bg-red-600 hover:bg-red-700',
    description: (name) => `The AI recommends pausing "${name}" due to poor performance.`
  },
  'INCREASE_BUDGET_20%': {
    icon: TrendingUp,
    iconClass: 'text-green-500',
    bgClass: 'bg-green-50',
    label: 'Increase Budget by 20%',
    btnClass: 'bg-emerald-600 hover:bg-emerald-700',
    description: (name) => `The AI recommends increasing the budget for "${name}" by 20%.`
  }
};

export const ConfirmationModal = ({ action, onConfirm, onCancel }) => {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  const config = ACTION_CONFIG[action?.decision] || {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    bgClass: 'bg-amber-50',
    label: action?.decision,
    btnClass: 'bg-slate-800 hover:bg-slate-900',
    description: (name) => `Apply AI recommendation for "${name}".`
  };

  const Icon = config.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgClass}`}>
              <Icon size={20} className={config.iconClass} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Confirm AI Action</h3>
              <p className="text-xs text-slate-500 mt-0.5">{config.label}</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-700">{config.description(action?.name)}</p>

          <div className="bg-slate-50 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Current ROAS</span>
              <span className="font-medium">{action?.roas?.toFixed(2)}x</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Current Spend</span>
              <span className="font-medium">${action?.spend?.toFixed(2)}</span>
            </div>
            {action?.projectedImpact && (
              <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-200">
                <span>Projected Impact</span>
                <span className="font-medium text-slate-800">{action.projectedImpact}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400">
            This action will be logged in the Activity Log and can be reviewed.
          </p>
        </div>

        <div className="flex gap-2.5 px-5 pb-5">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(action)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${config.btnClass}`}
          >
            Apply Action
          </button>
        </div>
      </div>
    </div>
  );
};
