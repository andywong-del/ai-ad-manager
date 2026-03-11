import { Bot, BarChart2, SlidersHorizontal, Users } from 'lucide-react';

const MODULES = [
  {
    icon:  BarChart2,
    label: 'Campaign Report',
    desc:  "View this week's performance — spend, ROAS, impressions & clicks",
    prompt: "Show this week's campaign report",
    color: 'text-blue-500',
    bg:    'bg-blue-50 hover:bg-blue-100',
  },
  {
    icon:  SlidersHorizontal,
    label: 'On/Off & Budget',
    desc:  'Pause, enable or adjust the daily budget for any campaign',
    prompt: 'Manage campaign status and budget',
    color: 'text-emerald-500',
    bg:    'bg-emerald-50 hover:bg-emerald-100',
  },
  {
    icon:  Users,
    label: 'Custom Audience',
    desc:  'Create a new custom audience via Meta Ads API',
    prompt: 'Create a custom audience',
    color: 'text-violet-500',
    bg:    'bg-violet-50 hover:bg-violet-100',
  },
];

export const HomeScreen = ({ onSend }) => (
  <div className="flex flex-col items-center justify-center h-full px-6 pb-8">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center mb-6 shadow-lg">
      <Bot size={32} className="text-white" />
    </div>
    <h2 className="text-2xl font-semibold text-slate-800 mb-2 text-center">
      What would you like to do today?
    </h2>
    <p className="text-slate-500 text-sm mb-10 text-center max-w-sm">
      Select a module below — I'll call the Meta Ads API and handle it for you.
    </p>

    <div className="flex flex-col gap-3 w-full max-w-lg">
      {MODULES.map(({ icon: Icon, label, desc, prompt, color, bg }) => (
        <button
          key={label}
          onClick={() => onSend(prompt)}
          className={`flex items-center gap-4 p-4 rounded-2xl border border-transparent ${bg} transition-colors text-left`}
        >
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/60">
            <Icon size={20} className={color} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{label}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-snug">{desc}</p>
          </div>
        </button>
      ))}
    </div>
  </div>
);
