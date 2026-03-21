import { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, MessageSquare, ChevronDown, Check, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { ChatInterface } from './ChatInterface.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { DashboardPage } from './DashboardPage.jsx';

const SUGGESTED_ACTIONS = [
  { icon: 'BarChart3',    color: 'from-blue-500 to-indigo-600',     label: 'How are my ads doing?',          desc: 'See spend, CTR, ROAS, and what needs attention.',                      prompt: 'Show all my active campaigns with their performance metrics from the last 7 days' },
  { icon: 'Target',       color: 'from-emerald-500 to-teal-600',    label: 'Help me reach new people',       desc: 'Audiences, lookalikes, and expansion ideas.',                          prompt: 'Show me all my custom audiences and their sizes, plus any targeting overlap between ad sets' },
  { icon: 'TrendingDown', color: 'from-red-500 to-rose-600',        label: 'Any problems I should know?',    desc: 'Flag rising costs or declining performance.',                          prompt: 'Which campaigns have declining performance? Compare last 7 days vs previous 7 days' },
  { icon: 'Search',       color: 'from-violet-500 to-purple-600',   label: "What's working best?",           desc: 'Find top creatives and winning strategies.',                           prompt: 'Analyze my ad creatives — which ones are performing best and which show fatigue signals?' },
  { icon: 'FileText',     color: 'from-amber-500 to-yellow-600',    label: "Show today's results",           desc: "Today's spend, conversions, CPA, and ROAS.",                           prompt: "Show today's KPI report — spend, impressions, clicks, conversions, CPA, and ROAS" },
  { icon: 'DollarSign',   color: 'from-cyan-500 to-blue-600',       label: 'Find ways to save money',        desc: 'Reallocate budget to top performers.',                                 prompt: 'Analyze my budget allocation across campaigns and ad sets — where should I shift spend?' },
  { icon: 'AlertTriangle',color: 'from-orange-500 to-amber-600',    label: 'Quick wins I can do now',        desc: 'Changes you can make right now.',                                      prompt: 'Give me quick wins for my Meta ad account — what can I change today to improve results?' },
  { icon: 'Zap',          color: 'from-yellow-400 to-orange-500',   label: 'What are competitors doing?',    desc: 'Check the Ad Library for competitor activity.',                        prompt: 'Search the Meta Ad Library for ads from my competitors in my industry. What can I learn from them?' },
];

// ── Account Chip Picker (for input bar area) ─────────────────────────────────
const AccountChipPicker = ({ selectedAccount, selectedBusiness, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('business');
  const [activeBiz, setActiveBiz] = useState(null);
  const ref = useRef(null);
  const { businesses, isLoading: bizLoading } = useBusinesses();
  const { adAccounts, isLoading: accLoading } = useAdAccounts(level === 'accounts' ? activeBiz?.id : null);
  const accounts = Array.isArray(adAccounts) ? adAccounts : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = () => {
    if (!open) {
      setLevel(selectedBusiness ? 'accounts' : 'business');
      setActiveBiz(selectedBusiness || null);
    }
    setOpen(!open);
  };

  const handleBizClick = (biz) => { setActiveBiz(biz); setLevel('accounts'); };
  const handleAccClick = (account) => { onSelect(activeBiz, account); setOpen(false); };

  const hasSelection = selectedBusiness && selectedAccount;

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={toggle}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
          ${hasSelection
            ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 animate-pulse-subtle'
          }`}>
        <Building2 size={12} />
        {hasSelection
          ? <span className="max-w-[180px] truncate">{selectedBusiness.name} · act_{selectedAccount.account_id}</span>
          : 'Select Account'
        }
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 z-50 overflow-hidden">
          {level === 'business' && (
            <>
              <div className="px-3 py-2.5 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Business</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {bizLoading ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-400">Loading...</div>
                ) : businesses.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-400">No businesses found</div>
                ) : businesses.map((biz) => (
                  <button key={biz.id} onClick={() => handleBizClick(biz)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                      ${biz.id === selectedBusiness?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <Building2 size={12} className="text-emerald-600 shrink-0" />
                    <span className="text-xs font-medium text-slate-700 truncate flex-1">{biz.name}</span>
                    <ChevronRight size={14} className="text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
          {level === 'accounts' && (
            <>
              <button onClick={() => setLevel('business')}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <ChevronLeft size={14} className="text-slate-400" />
                <Building2 size={12} className="text-emerald-600" />
                <span className="text-xs font-medium text-slate-500 truncate">{activeBiz?.name}</span>
              </button>
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Ad Accounts</p>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {accLoading ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-400">Loading...</div>
                ) : accounts.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-400">No accounts found</div>
                ) : accounts.map((account) => (
                  <button key={account.id} onClick={() => handleAccClick(account)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                      ${account.id === selectedAccount?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <span className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                      {account.name?.[0]?.toUpperCase()}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium truncate ${account.id === selectedAccount?.id ? 'text-blue-600' : 'text-slate-700'}`}>{account.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">act_{account.account_id}</p>
                    </div>
                    {account.id === selectedAccount?.id && <Check size={14} className="text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const Dashboard = ({
  token = null,
  adAccountId = null,
  selectedAccount = null,
  selectedBusiness = null,
  onSwitchAccount,
  onSwitchBusiness,
  onLogout,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatMode, setChatMode] = useState('Fast');
  const [activeView, setActiveView] = useState({ type: 'chat' });

  const {
    sessions, activeSessionId, createNewChat, switchSession, deleteSession,
    messages, isTyping, thinkingText, sendMessage, notification,
    savedItems, saveItem, deleteSavedItem,
  } = useChatSessions({ token, adAccountId, accountName: selectedAccount?.name, mode: chatMode });

  // Handle account switching — reset chat
  const handleAccountSelect = useCallback((business, account) => {
    onSwitchBusiness(business);
    onSwitchAccount(account);
    setActiveView({ type: 'chat' });
  }, [onSwitchBusiness, onSwitchAccount]);

  const handleSend = useCallback((text, attachments) => {
    setActiveView({ type: 'chat' });
    sendMessage(text, attachments);
  }, [sendMessage]);

  const handleSwitchSession = useCallback((sessionId) => {
    setActiveView({ type: 'chat' });
    switchSession(sessionId);
  }, [switchSession]);

  const handleNewChat = useCallback(() => {
    setActiveView({ type: 'chat' });
    createNewChat();
  }, [createNewChat]);

  const handleViewSavedItem = useCallback((item) => {
    setActiveView({ type: 'saved', itemId: item.id });
  }, []);

  const handleDeleteSavedItem = useCallback((itemId) => {
    deleteSavedItem(itemId);
    if (activeView.type === 'saved' && activeView.itemId === itemId) {
      setActiveView({ type: 'chat' });
    }
  }, [deleteSavedItem, activeView]);

  const handleNavigateFunnel = useCallback(() => {
    setActiveView({ type: 'funnel' });
  }, []);

  const handleFunnelToChat = useCallback((prompt) => {
    setActiveView({ type: 'chat' });
    sendMessage(prompt);
  }, [sendMessage]);

  // Find current saved item for viewer
  const currentSavedItem = activeView.type === 'saved'
    ? savedItems.find(i => i.id === activeView.itemId)
    : null;

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">

      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onNewChat={handleNewChat}
        onSwitchSession={handleSwitchSession}
        onDeleteSession={deleteSession}
        savedItems={savedItems}
        onViewSavedItem={handleViewSavedItem}
        onDeleteSavedItem={handleDeleteSavedItem}
        onNavigateFunnel={handleNavigateFunnel}
        activeView={activeView}
        onLogout={onLogout}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shadow-sm"
          >
            <MessageSquare size={16} />
          </button>
        )}

        {activeView.type === 'funnel' ? (
          <DashboardPage
            adAccountId={adAccountId}
            onNavigateToChat={handleFunnelToChat}
          />
        ) : activeView.type === 'saved' && currentSavedItem ? (
          <SavedItemView
            item={currentSavedItem}
            onBack={() => setActiveView({ type: 'chat' })}
            onDelete={handleDeleteSavedItem}
          />
        ) : (
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
            thinkingText={thinkingText}
            onSend={handleSend}
            suggestedActions={SUGGESTED_ACTIONS}
            mode={chatMode}
            onModeChange={setChatMode}
            adAccountId={adAccountId}
            onSaveItem={saveItem}
            accountChip={
              <AccountChipPicker
                selectedAccount={selectedAccount}
                selectedBusiness={selectedBusiness}
                onSelect={handleAccountSelect}
              />
            }
          />
        )}
      </main>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          {notification}
        </div>
      )}
    </div>
  );
};
