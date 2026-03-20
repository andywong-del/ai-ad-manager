import { useState, useCallback, useEffect, useRef } from 'react';
import { Bot, LayoutDashboard, MessageSquare, BarChart3, CreditCard, Settings, LogOut, ChevronLeft, ChevronRight, ChevronDown, Check, Building2 } from 'lucide-react';
import { useChatAgent } from '../hooks/useChatAgent.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { ChatInterface } from './ChatInterface.jsx';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'chat',      label: 'Chat',         icon: MessageSquare },
  { id: 'reports',   label: 'Reports',      icon: BarChart3 },
  { id: 'accounts',  label: 'Ad accounts',  icon: CreditCard },
  { id: 'settings',  label: 'Settings',     icon: Settings },
];

const SUGGESTED_ACTIONS = [
  { icon: 'BarChart3',    color: 'from-blue-500 to-indigo-600',     label: 'Campaign Performance',  desc: 'Review active campaigns with spend, impressions, CTR, and ROAS from Meta Ads.',                            prompt: 'Show all my active campaigns with their performance metrics from the last 7 days' },
  { icon: 'Target',       color: 'from-emerald-500 to-teal-600',    label: 'Audience Insights',     desc: 'Analyze your custom audiences, lookalikes, and targeting overlap on Facebook & Instagram.',                prompt: 'Show me all my custom audiences and their sizes, plus any targeting overlap between ad sets' },
  { icon: 'TrendingDown', color: 'from-red-500 to-rose-600',        label: 'Performance Drop',      desc: 'Spot campaigns with rising CPM, falling CTR, or declining ROAS on Meta.',                                 prompt: 'Which campaigns have declining performance? Compare last 7 days vs previous 7 days' },
  { icon: 'Search',       color: 'from-violet-500 to-purple-600',   label: 'Creative Analysis',     desc: 'Review ad creatives for fatigue signals and find your top-performing visuals.',                            prompt: 'Analyze my ad creatives — which ones are performing best and which show fatigue signals?' },
  { icon: 'FileText',     color: 'from-amber-500 to-yellow-600',    label: 'Daily KPI Report',      desc: "Today's spend, conversions, CPA, and ROAS across your Meta ad account.",                                  prompt: "Show today's KPI report — spend, impressions, clicks, conversions, CPA, and ROAS" },
  { icon: 'DollarSign',   color: 'from-cyan-500 to-blue-600',       label: 'Budget Optimization',   desc: 'Find over-spending ad sets and reallocate budget to top Meta campaign performers.',                        prompt: 'Analyze my budget allocation across campaigns and ad sets — where should I shift spend?' },
  { icon: 'AlertTriangle',color: 'from-orange-500 to-amber-600',    label: 'Ad Set Health Check',   desc: 'Check ad set delivery, frequency caps, and audience saturation on FB & IG.',                              prompt: 'Run a health check on all my ad sets — flag high frequency, low delivery, or audience saturation issues' },
  { icon: 'Zap',          color: 'from-yellow-400 to-orange-500',   label: 'Quick Wins',            desc: 'Actionable changes to your Meta campaigns you can make right now.',                                       prompt: 'Give me quick wins for my Meta ad account — what can I change today to improve results?' },
];

// ── Cascading Account Picker ─────────────────────────────────────────────────
const CascadingAccountPicker = ({ selectedAccount, selectedBusiness, onSelect }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('business'); // 'business' | 'accounts'
  const [activeBiz, setActiveBiz] = useState(null);
  const ref = useRef(null);
  const { businesses, isLoading: bizLoading } = useBusinesses();
  const { adAccounts, isLoading: accLoading } = useAdAccounts(level === 'accounts' ? activeBiz?.id : null);
  const accounts = Array.isArray(adAccounts) ? adAccounts : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset to business level when opening
  const toggle = () => {
    if (!open) {
      setLevel(selectedBusiness ? 'accounts' : 'business');
      setActiveBiz(selectedBusiness || null);
    }
    setOpen(!open);
  };

  const handleBizClick = (biz) => {
    setActiveBiz(biz);
    setLevel('accounts');
  };

  const handleAccClick = (account) => {
    onSelect(activeBiz, account);
    setOpen(false);
  };

  const hasSelection = selectedBusiness && selectedAccount;

  return (
    <div className="relative" ref={ref}>
      {/* Trigger Button */}
      <button
        onClick={toggle}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl bg-[#1a2236] border transition-all text-left
          ${hasSelection ? 'border-[#1e293b] hover:border-slate-600' : 'border-blue-500/40 hover:border-blue-400 animate-pulse-subtle'}`}
      >
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shrink-0">
          {selectedAccount
            ? <span className="text-white text-sm font-bold">{selectedAccount.name?.[0]?.toUpperCase() || 'A'}</span>
            : <Building2 size={16} className="text-white" />
          }
        </div>
        <div className="flex-1 min-w-0">
          {hasSelection ? (
            <>
              <p className="text-sm font-medium text-white truncate">{selectedAccount.name}</p>
              <p className="text-[11px] text-slate-500 truncate">{selectedBusiness.name} · <span className="font-mono">act_{selectedAccount.account_id}</span></p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-slate-300">Select Account</p>
              <p className="text-[11px] text-slate-500">Choose a business & ad account</p>
            </>
          )}
        </div>
        <ChevronDown size={14} className={`text-slate-500 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#1a2236] border border-[#1e293b] rounded-xl shadow-2xl z-50 overflow-hidden">

          {/* Level: Business list */}
          {level === 'business' && (
            <>
              <div className="px-3 py-2.5 border-b border-[#1e293b]">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Select Business Portfolio</p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {bizLoading ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-500">Loading businesses...</div>
                ) : businesses.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-500">No businesses found</div>
                ) : businesses.map((biz) => {
                  const isActive = biz.id === selectedBusiness?.id;
                  return (
                    <button
                      key={biz.id}
                      onClick={() => handleBizClick(biz)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                        ${isActive ? 'bg-blue-900/20' : 'hover:bg-[#232d42]'}`}
                    >
                      <div className="w-7 h-7 rounded-md bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border border-emerald-800/30 flex items-center justify-center shrink-0">
                        <Building2 size={12} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{biz.name}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-600 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Level: Ad accounts for selected business */}
          {level === 'accounts' && (
            <>
              <button
                onClick={() => setLevel('business')}
                className="w-full flex items-center gap-2 px-3 py-2.5 border-b border-[#1e293b] hover:bg-[#232d42] transition-colors"
              >
                <ChevronLeft size={14} className="text-slate-400" />
                <Building2 size={12} className="text-emerald-400" />
                <span className="text-xs font-medium text-slate-400 truncate">{activeBiz?.name}</span>
              </button>
              <div className="px-3 py-2 border-b border-[#1e293b]">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Ad Accounts</p>
              </div>
              <div className="max-h-56 overflow-y-auto">
                {accLoading ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-500">Loading accounts...</div>
                ) : accounts.length === 0 ? (
                  <div className="px-3 py-6 text-center text-xs text-slate-500">No ad accounts found</div>
                ) : accounts.map((account) => {
                  const isActive = account.id === selectedAccount?.id;
                  return (
                    <button
                      key={account.id}
                      onClick={() => handleAccClick(account)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors
                        ${isActive ? 'bg-blue-900/20' : 'hover:bg-[#232d42]'}`}
                    >
                      <div className="w-7 h-7 rounded-md bg-[#141b2d] flex items-center justify-center shrink-0">
                        <span className="text-slate-300 text-[10px] font-bold">{account.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${isActive ? 'text-blue-400' : 'text-slate-300'}`}>{account.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">act_{account.account_id}</p>
                      </div>
                      {isActive && <Check size={14} className="text-blue-400 shrink-0" />}
                    </button>
                  );
                })}
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
  const [activeNav, setActiveNav] = useState('chat');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { messages, isTyping, thinkingText, sendMessage, resetChat, notification } = useChatAgent({ token, adAccountId, accountName: selectedAccount?.name });

  const handleSend = useCallback((text) => {
    setActiveNav('chat');
    sendMessage(text);
  }, [sendMessage]);

  // Cascading picker fires both business + account selection
  const handleAccountSelect = useCallback((business, account) => {
    resetChat();
    onSwitchBusiness(business);
    onSwitchAccount(account);
  }, [resetChat, onSwitchBusiness, onSwitchAccount]);

  return (
    <div className="flex h-screen bg-[#0f1623]">

      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-[260px]' : 'w-0 overflow-hidden'} shrink-0 bg-[#141b2d] border-r border-[#1e293b] flex flex-col transition-all duration-200`}>

        {/* Logo */}
        <div className="px-5 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Bot size={18} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-white tracking-tight">AI Ad Manager</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 mt-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors mb-0.5
                ${activeNav === id
                  ? 'bg-[#1e293b] text-white'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2236]'
                }`}
            >
              <Icon size={18} strokeWidth={activeNav === id ? 2 : 1.5} />
              {label}
            </button>
          ))}
        </nav>

        {/* Combined Account Picker */}
        <div className="px-3 mb-4">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">Account</p>
          <CascadingAccountPicker
            selectedAccount={selectedAccount}
            selectedBusiness={selectedBusiness}
            onSelect={handleAccountSelect}
          />
        </div>

        {/* User Profile */}
        <div className="px-3 pb-4 border-t border-[#1e293b] pt-3">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Andy Wong</p>
              <p className="text-[11px] text-slate-500 truncate">andy.wong@presslogic.com</p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="text-slate-500 hover:text-slate-300 transition-colors"
                title="Log out"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-[#1a2236] border border-[#1e293b] flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <MessageSquare size={16} />
          </button>
        )}

        <ChatInterface
          messages={messages}
          isTyping={isTyping}
          thinkingText={thinkingText}
          onSend={handleSend}
          suggestedActions={SUGGESTED_ACTIONS}
        />
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
