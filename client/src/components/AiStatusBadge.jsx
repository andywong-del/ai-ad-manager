import { PauseCircle, TrendingUp, Eye, Minus } from 'lucide-react';

const CONFIG = {
  'PAUSE': {
    label: 'Pause Suggested',
    icon: PauseCircle,
    classes: 'bg-red-100 text-red-700 border-red-200'
  },
  'INCREASE_BUDGET_20%': {
    label: 'Increase Budget',
    icon: TrendingUp,
    classes: 'bg-green-100 text-green-700 border-green-200'
  },
  'MONITOR': {
    label: 'Monitor',
    icon: Eye,
    classes: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  }
};

export const AiStatusBadge = ({ decision }) => {
  if (!decision) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
        <Minus size={11} />
        No Action
      </span>
    );
  }

  const { label, icon: Icon, classes } = CONFIG[decision] || CONFIG['MONITOR'];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${classes}`}>
      <Icon size={11} />
      {label}
    </span>
  );
};
