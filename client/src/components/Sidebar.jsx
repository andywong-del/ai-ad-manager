import { useState } from 'react';
import { Bot, Plus, MessageSquare, Trash2, Sparkles, ChevronDown, ChevronLeft, ChevronRight, LogOut, FileText, Lightbulb, FolderOpen } from 'lucide-react';
import { groupSessionsByDate } from '../hooks/useChatSessions.js';

const DATE_GROUP_ORDER = ['Today', 'Yesterday', 'Previous 7 Days', 'Previous 30 Days', 'Older'];

export const Sidebar = ({
  open,
  onToggle,
  sessions,
  activeSessionId,
  onNewChat,
  onSwitchSession,
  onDeleteSession,
  savedItems,
  onViewSavedItem,
  onDeleteSavedItem,
  onNavigateFunnel,
  activeView,
  onLogout,
}) => {
  const [reportsOpen, setReportsOpen] = useState(true);
  const [strategiesOpen, setStrategiesOpen] = useState(true);
  const [hoveredSession, setHoveredSession] = useState(null);

  const grouped = groupSessionsByDate(sessions);
  const reports = savedItems.filter(i => i.type === 'report');
  const strategies = savedItems.filter(i => i.type === 'strategy');

  if (!open) return null;

  return (
    <aside className="w-[260px] shrink-0 bg-white/70 backdrop-blur-xl border-r border-slate-200 flex flex-col h-screen">

      {/* Header */}
      <div className="px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-md shadow-orange-200/50">
            <Bot size={18} className="text-white" />
          </div>
          <span className="text-[15px] font-bold text-slate-800 tracking-tight">AI Ad Manager</span>
        </div>
        <button onClick={onToggle} className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronLeft size={18} />
        </button>
      </div>

      {/* New Chat + My Strategist */}
      <div className="px-3 mb-2 space-y-1.5">
        <button
          onClick={onNewChat}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-medium text-slate-700 hover:text-slate-900 transition-all hover:shadow-sm"
        >
          <Plus size={16} className="text-slate-400" />
          New Chat
        </button>
        <button
          onClick={onNavigateFunnel}
          className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-colors
            ${activeView?.type === 'funnel' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700 border border-transparent'}`}
        >
          <Sparkles size={16} className={activeView?.type === 'funnel' ? 'text-indigo-500' : 'text-slate-400'} />
          My Strategist
        </button>
      </div>

      {/* Scrollable area: Folders first, then Chat History */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">

        {/* Folders Section */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">Folders</p>

          {/* Reports folder */}
          <div className="mb-1">
            <button
              onClick={() => setReportsOpen(!reportsOpen)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {reportsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <FileText size={13} className="text-blue-400" />
              <span>Reports ({reports.length})</span>
            </button>
            {reportsOpen && reports.length > 0 && reports.map(item => (
              <button
                key={item.id}
                onClick={() => onViewSavedItem(item)}
                className={`w-full flex items-center gap-2 pl-9 pr-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors text-left
                  ${activeView?.type === 'saved' && activeView?.itemId === item.id ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <span className="truncate">{item.title}</span>
              </button>
            ))}
            {reportsOpen && reports.length === 0 && (
              <p className="pl-9 pr-3 py-1 text-[11px] text-slate-300 italic">No reports yet</p>
            )}
          </div>

          {/* Strategies folder */}
          <div className="mb-1">
            <button
              onClick={() => setStrategiesOpen(!strategiesOpen)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-[12px] font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              {strategiesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Lightbulb size={13} className="text-amber-400" />
              <span>Strategies ({strategies.length})</span>
            </button>
            {strategiesOpen && strategies.length > 0 && strategies.map(item => (
              <button
                key={item.id}
                onClick={() => onViewSavedItem(item)}
                className={`w-full flex items-center gap-2 pl-9 pr-3 py-1.5 text-[12px] text-slate-500 hover:bg-slate-50 hover:text-slate-700 rounded-lg transition-colors text-left
                  ${activeView?.type === 'saved' && activeView?.itemId === item.id ? 'bg-blue-50 text-blue-700' : ''}`}
              >
                <span className="truncate">{item.title}</span>
              </button>
            ))}
            {strategiesOpen && strategies.length === 0 && (
              <p className="pl-9 pr-3 py-1 text-[11px] text-slate-300 italic">No strategies yet</p>
            )}
          </div>
        </div>

        {/* Chat History */}
        <div className="border-t border-slate-100 pt-2">
          {sessions.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <MessageSquare size={20} className="text-slate-200 mx-auto mb-2" />
              <p className="text-[11px] text-slate-400">No conversations yet</p>
            </div>
          ) : (
            DATE_GROUP_ORDER.map(group => {
              const items = grouped[group];
              if (!items?.length) return null;
              return (
                <div key={group} className="mb-2">
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-3 py-1.5">{group}</p>
                  {items.map(session => {
                    const isActive = session.id === activeSessionId && activeView?.type === 'chat';
                    return (
                      <button
                        key={session.id}
                        onClick={() => onSwitchSession(session.id)}
                        onMouseEnter={() => setHoveredSession(session.id)}
                        onMouseLeave={() => setHoveredSession(null)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-[13px] transition-colors group relative
                          ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <MessageSquare size={14} className={`shrink-0 ${isActive ? 'text-blue-500' : 'text-slate-300'}`} />
                        <span className="truncate flex-1">{session.title}</span>
                        {hoveredSession === session.id && (
                          <button
                            onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); }}
                            className="absolute right-2 p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User Profile */}
      <div className="px-3 pb-4 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0 shadow-sm">
            <span className="text-white text-xs font-bold">A</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">Andy Wong</p>
            <p className="text-[11px] text-slate-400 truncate">andy.wong@presslogic.com</p>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="text-slate-400 hover:text-slate-600 transition-colors" title="Log out">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
