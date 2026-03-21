import { ArrowLeft, Trash2, Download, Calendar } from 'lucide-react';

const fmtDate = (ts) => new Intl.DateTimeFormat('en-US', {
  month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(ts));

export const SavedItemView = ({ item, onBack, onDelete }) => {
  if (!item) return null;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <p className="text-lg font-bold text-slate-900">{item.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border uppercase tracking-wider
                  ${item.type === 'report'
                    ? 'text-blue-600 bg-blue-50 border-blue-100'
                    : 'text-amber-600 bg-amber-50 border-amber-100'
                  }`}>
                  {item.type}
                </span>
                <span className="flex items-center gap-1 text-xs text-slate-400">
                  <Calendar size={11} />
                  {fmtDate(item.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onDelete(item.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        </div>

        {/* Content — rendered as plain markdown-style text */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="prose prose-sm prose-slate max-w-none text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {item.content}
          </div>
        </div>
      </div>
    </div>
  );
};
