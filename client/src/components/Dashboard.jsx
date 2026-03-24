import { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { useSkills } from '../hooks/useSkills.js';
import { ChatInterface } from './ChatInterface.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { DashboardPage } from './DashboardPage.jsx';
import { ReportPanel } from './ReportPanel.jsx';
import { SkillsLibrary } from './SkillsLibrary.jsx';
import { StrategistConfig } from './StrategistConfig.jsx';
import { AudienceManager } from './AudienceManager.jsx';

const SUGGESTED_ACTIONS = [
  { icon: 'Zap',           label: 'Create Campaign',                desc: 'Launch a new ad campaign step by step — objective, audience, creative, budget.',
    prompt: `I want to create a new ad campaign. Please guide me through the process step by step:

Step 1: Ask me to choose a campaign objective (Awareness, Traffic, Engagement, Leads, App Promotion, or Sales)
Step 2: Help me select or create a target audience
Step 3: Ask me to upload or describe my ad creative (image/video + copy)
Step 4: Help me set budget and schedule with smart defaults
Step 5: Show a pre-flight checklist validating everything before launch

Present each step as a clear card with options. Wait for my input before proceeding to the next step.` },
  { icon: 'BarChart3',     label: 'Weekly Performance Report',      desc: 'Spend, ROAS, CTR, CPA across all campaigns — with trends vs last week.',
    prompt: 'Show my weekly performance report for the last 7 days with all campaigns, spend, ROAS, CTR, CPA. Compare to previous week.' },
  { icon: 'AlertTriangle', label: 'Problems & Quick Wins',          desc: 'Find issues, wasted spend, and actionable fixes you can apply today.',
    prompt: 'Find problems and quick wins in my ad account. Flag low ROAS campaigns, wasted spend, and give me fixes.' },
  { icon: 'Search',        label: 'Creative Performance Analysis',  desc: 'Which ads are winning, which show fatigue — with copy recommendations.',
    prompt: 'Analyze my ad creative performance. Show CTR, CPA, frequency for all ads. Flag fatigue and suggest new copy.' },
  { icon: 'DollarSign',    label: 'Budget Optimization Plan',       desc: 'Where to shift spend for maximum ROAS — with specific reallocation amounts.',
    prompt: 'Create a budget optimization plan. Show spend vs ROAS per campaign and recommend specific budget reallocations.' },
  { icon: 'Target',        label: 'Audience & Targeting Review',    desc: 'Audience sizes, overlap issues, and expansion opportunities.',
    prompt: 'Review my audiences and targeting. Show sizes, find overlap, suggest new audiences to test.' },
];

// ── Dashboard ─────────────────────────────────────────────────────────────────
// ── Connect Prompt (soft wall for unauthenticated users) ──────────────────────
const ConnectPrompt = ({ onLogin, isLoading, error, onDismiss }) => (
  <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onDismiss}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
      <div className="px-6 pt-6 pb-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <svg viewBox="0 0 24 24" className="w-7 h-7 text-blue-600" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z"/></svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1">Connect Your Ad Account</h3>
        <p className="text-sm text-slate-500">Sign in with Facebook to unlock this feature — manage campaigns, audiences, and chat with your AI agent.</p>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>
      <div className="px-6 pb-6 space-y-2">
        <button onClick={onLogin} disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-500 transition-colors disabled:opacity-50">
          {isLoading ? 'Connecting...' : 'Continue with Facebook'}
        </button>
        <button onClick={onDismiss}
          className="w-full px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
          Browse first
        </button>
      </div>
    </div>
  </div>
);

export const Dashboard = ({
  token = null,
  adAccountId = null,
  selectedAccount = null,
  selectedBusiness = null,
  onSwitchAccount,
  onSwitchBusiness,
  onLogout,
  onLogin,
  isLoginLoading,
  loginError,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatLanguage, setChatLanguage] = useState(() => localStorage.getItem('aam_language') || 'en');
  const [activeView, setActiveView] = useState({ type: 'chat' });
  const [reportPanel, setReportPanel] = useState(null);
  const [showConnectPrompt, setShowConnectPrompt] = useState(false);

  // Guard: show connect prompt when user tries to use a feature without auth
  const requireAuth = useCallback((action) => {
    if (token) return true;
    setShowConnectPrompt(true);
    return false;
  }, [token]);

  const {
    skills, activeSkill, activeSkillId, toggleSkill,
    createSkill, updateSkill, deleteSkill, getSkillContext, getSkillContextById,
  } = useSkills();

  const {
    sessions, activeSessionId, createNewChat, switchSession, deleteSession,
    messages, isTyping, thinkingText, sendMessage, stopGeneration, notification,
    savedItems, saveItem, deleteSavedItem,
    folders, createFolder, deleteFolder, renameFolder, reorderFolders,
  } = useChatSessions({ token, adAccountId, accountName: selectedAccount?.name, language: chatLanguage });

  const handleLanguageChange = useCallback((lang) => {
    setChatLanguage(lang);
    localStorage.setItem('aam_language', lang);
  }, []);

  // Handle account switching — reset chat
  const handleAccountSelect = useCallback((business, account) => {
    onSwitchBusiness(business);
    onSwitchAccount(account);
    setActiveView({ type: 'chat' });
  }, [onSwitchBusiness, onSwitchAccount]);

  const handleSend = useCallback((text, attachments, slashIds) => {
    if (!requireAuth()) return;
    setActiveView({ type: 'chat' });
    // Inject skill context: slash commands take priority, then active skill
    let skillCtx = null;
    if (slashIds?.length) {
      skillCtx = slashIds.map(id => getSkillContextById(id)).filter(Boolean).join('\n\n---\n\n');
    }
    if (!skillCtx) skillCtx = getSkillContext();
    const fullText = skillCtx ? `${skillCtx}\n\n---\n\nUser message: ${text}` : text;
    // Send full text to API but only show user's message in chat
    sendMessage(fullText, attachments, { displayText: text });
  }, [sendMessage, getSkillContext, getSkillContextById]);

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
    if (!requireAuth()) return;
    setActiveView({ type: 'funnel' });
  }, [requireAuth]);

  const handleOpenAudiences = useCallback(() => {
    if (!requireAuth()) return;
    setActiveView({ type: 'audiences' });
  }, [requireAuth]);

  const handleAudienceToChat = useCallback((prompt) => {
    setActiveView({ type: 'chat' });
    sendMessage(prompt);
  }, [sendMessage]);

  const handleFunnelToChat = useCallback((prompt) => {
    setActiveView({ type: 'chat' });
    sendMessage(prompt);
  }, [sendMessage]);

  // Report canvas panel
  const handleOpenReport = useCallback((messageId, content) => {
    const title = content?.split('\n').find(l => l.trim())?.replace(/^[#*\s]+/, '')?.slice(0, 60) || 'Report';
    setReportPanel({ messageId, content, title });
  }, []);

  const handleCloseReport = useCallback(() => setReportPanel(null), []);

  const handleSaveFromPanel = useCallback((folderId) => {
    if (reportPanel) {
      saveItem(reportPanel.messageId, folderId, reportPanel.title);
    }
  }, [reportPanel, saveItem]);

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
        selectedAccount={selectedAccount}
        selectedBusiness={selectedBusiness}
        onSelectAccount={handleAccountSelect}
        language={chatLanguage}
        onLanguageChange={handleLanguageChange}
        folders={folders}
        onCreateFolder={createFolder}
        onDeleteFolder={deleteFolder}
        onRenameFolder={renameFolder}
        onReorderFolders={reorderFolders}
        skills={skills}
        activeSkill={activeSkill}
        activeSkillId={activeSkillId}
        onToggleSkill={toggleSkill}
        onOpenSkillsLibrary={() => setActiveView({ type: 'skills' })}
        onOpenAudiences={handleOpenAudiences}
        token={token}
        onLogin={onLogin}
      />

      {/* Main Content */}
      <main className="flex-1 flex min-w-0">
        <div className={`flex flex-col min-w-0 ${reportPanel ? 'w-[45%]' : 'flex-1'} transition-all duration-300`}>
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shadow-sm"
            >
              <MessageSquare size={16} />
            </button>
          )}

          {activeView.type === 'skillConfig' && activeView.skill ? (
            <StrategistConfig
              strategist={activeView.skill}
              onUpdate={async (id, updates) => {
                await updateSkill(id, updates);
              }}
              onAddDoc={() => {}}
              onRemoveDoc={() => {}}
              onBack={() => setActiveView({ type: 'skills' })}
            />
          ) : activeView.type === 'skills' ? (
            <SkillsLibrary
              skills={skills}
              onCreate={createSkill}
              onUpdate={updateSkill}
              onDelete={deleteSkill}
              onBack={() => setActiveView({ type: 'chat' })}
              onConfigure={(skill) => setActiveView({ type: 'skillConfig', skill })}
            />
          ) : activeView.type === 'funnel' ? (
            <DashboardPage
              adAccountId={adAccountId}
              onNavigateToChat={handleFunnelToChat}
            />
          ) : activeView.type === 'audiences' ? (
            <AudienceManager
              adAccountId={adAccountId}
              onSendToChat={handleAudienceToChat}
              onBack={() => setActiveView({ type: 'chat' })}
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
              onStop={stopGeneration}
              suggestedActions={SUGGESTED_ACTIONS}
              adAccountId={adAccountId}
              onSaveItem={saveItem}
              onOpenReport={handleOpenReport}
              folders={folders}
              activeSkill={activeSkill}
              onDeactivateSkill={() => activeSkill && toggleSkill(activeSkill.id)}
              skills={skills}
            />
          )}
        </div>

        {/* Report Canvas Panel */}
        {reportPanel && (
          <ReportPanel
            content={reportPanel.content}
            title={reportPanel.title}
            onClose={handleCloseReport}
            onSave={handleSaveFromPanel}
            folders={folders}
          />
        )}
      </main>

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-500 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium">
          {notification}
        </div>
      )}

      {/* Connect Prompt — soft wall for unauthenticated users */}
      {showConnectPrompt && onLogin && (
        <ConnectPrompt
          onLogin={onLogin}
          isLoading={isLoginLoading}
          error={loginError}
          onDismiss={() => setShowConnectPrompt(false)}
        />
      )}
    </div>
  );
};
