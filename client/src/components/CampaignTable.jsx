import { useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { AiStatusBadge } from './AiStatusBadge.jsx';

const StatusToggle = ({ status, onChange, disabled }) => {
  const isActive = status === 'ACTIVE';
  return (
    <button
      onClick={() => onChange(isActive ? 'PAUSED' : 'ACTIVE')}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
        isActive ? 'bg-emerald-500' : 'bg-slate-300'
      }`}
      title={isActive ? 'Pause campaign' : 'Activate campaign'}
    >
      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
        isActive ? 'translate-x-4.5' : 'translate-x-0.5'
      }`} />
    </button>
  );
};

const BudgetInput = ({ budget, onSave, disabled }) => {
  const dollars = parseInt(budget || 0) / 100;
  const [value, setValue] = useState(dollars.toFixed(2));
  const [isDirty, setIsDirty] = useState(false);

  const handleBlur = useCallback(() => {
    const num = parseFloat(value);
    if (!isNaN(num) && num > 0 && isDirty) {
      onSave(num);
      setIsDirty(false);
    } else {
      setValue(dollars.toFixed(2));
      setIsDirty(false);
    }
  }, [value, isDirty, onSave, dollars]);

  return (
    <div className="flex items-center gap-1">
      <span className="text-slate-400 text-sm">$</span>
      <input
        type="number"
        value={value}
        min="1"
        step="1"
        disabled={disabled}
        onChange={(e) => { setValue(e.target.value); setIsDirty(true); }}
        onBlur={handleBlur}
        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
        className="w-20 text-sm border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  );
};

export const CampaignTable = ({ campaigns, decisions, updatingIds, onToggleStatus, onBudgetChange }) => {
  if (campaigns.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 shadow-sm">
        No campaigns found
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">Campaigns</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Daily Budget</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Spend</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">ROAS</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">AI Status</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((campaign) => {
              const isUpdating = updatingIds.has(campaign.id);
              const insight = campaign.insights?.data?.[0] || {};
              const spend = parseFloat(insight.spend || 0);
              const revenue = parseFloat(insight.action_values?.find(a => a.action_type === 'purchase')?.value || 0);
              const roas = spend > 0 ? revenue / spend : 0;

              return (
                <tr key={campaign.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      {isUpdating && <Loader2 size={14} className="animate-spin text-blue-500 shrink-0" />}
                      <span className="font-medium text-slate-800 truncate max-w-[200px]">{campaign.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <StatusToggle
                      status={campaign.status}
                      onChange={(s) => onToggleStatus(campaign.id, s)}
                      disabled={isUpdating}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <BudgetInput
                      budget={campaign.daily_budget}
                      onSave={(v) => onBudgetChange(campaign.id, v)}
                      disabled={isUpdating}
                    />
                  </td>
                  <td className="px-4 py-3.5 text-slate-700">
                    {spend > 0 ? `$${spend.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`font-semibold ${roas >= 3 ? 'text-emerald-600' : roas < 1 ? 'text-red-500' : 'text-slate-700'}`}>
                      {spend > 0 ? `${roas.toFixed(2)}x` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <AiStatusBadge decision={decisions[campaign.id]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
