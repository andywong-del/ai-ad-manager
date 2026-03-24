import { useState, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatSessions } from '../hooks/useChatSessions.js';
import { useSkills } from '../hooks/useSkills.js';
import { ChatInterface } from './ChatInterface.jsx';
import { Sidebar } from './Sidebar.jsx';
import { SavedItemView } from './SavedItemView.jsx';
import { StrategistConfig } from './StrategistConfig.jsx';
import { SkillsLibrary } from './SkillsLibrary.jsx';
import { AudienceManager } from './AudienceManager.jsx';

// Actions that require a connected ad account
const ACCOUNT_ACTIONS = [
  { icon: 'Zap',           label: 'Create Campaign',                desc: 'Launch a new ad campaign step by step — objective, audience, creative, budget.',
    prompt: `I want to create a new ad campaign. Guide me step by step with option cards for each choice.` },
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

// Actions available without auth — general knowledge questions
const GENERAL_ACTIONS = [
  { icon: 'Zap',           label: 'Plan a Campaign Strategy',       desc: 'Get expert advice on objectives, targeting, and budget for your next campaign.',
    prompt: 'Help me plan a Facebook ad campaign strategy. What objective should I pick, how should I structure targeting, and what budget should I start with?' },
  { icon: 'BarChart3',     label: 'What Makes Great Ad Creative?',  desc: 'Learn best practices for images, video, and copy that convert.',
    prompt: 'What makes great Facebook ad creative? Give me best practices for images, video, and ad copy that actually convert.' },
  { icon: 'Target',        label: 'Audience Targeting Guide',       desc: 'Understand custom, lookalike, and interest-based audiences.',
    prompt: 'Explain the different types of Facebook ad audiences — custom, lookalike, saved — and when to use each one.' },
  { icon: 'DollarSign',    label: 'Budget & Bidding Explained',     desc: 'CBO vs ABO, bidding strategies, and how to allocate spend.',
    prompt: 'Explain Facebook ad budgets and bidding. What is CBO vs ABO? Which bidding strategy should I use and how much should I spend?' },
  { icon: 'AlertTriangle', label: 'Common Ad Mistakes',             desc: 'Top pitfalls that waste budget and how to avoid them.',
    prompt: 'What are the most common Facebook ad mistakes that waste budget? How do I avoid them?' },
  { icon: 'Search',        label: 'Ad Formats & Placements',        desc: 'Carousel, video, stories — which format works best for your goal.',
    prompt: 'What are the different Facebook ad formats and placements? Which format works best for conversions vs awareness?' },
];

// ── Dashboard ─────────────────────────────────────────────────────────────────

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

  const handleOpenAudiences = useCallback(() => {
    setActiveView({ type: 'audiences' });
  }, []);

  const handleOpenSkillsLibrary = useCallback(() => {
    setActiveView({ type: 'skillsLibrary' });
  }, []);

  const handleAudienceToChat = useCallback((prompt) => {
    setActiveView({ type: 'chat' });
    sendMessage(prompt);
  }, [sendMessage]);

  // Find current saved item for viewer
  const currentSavedItem = activeView.type === 'saved'
    ? savedItems.find(i => i.id === activeView.itemId)
    : null;

  // Show account-specific actions when connected, general knowledge actions otherwise
  const suggestedActions = token && adAccountId ? ACCOUNT_ACTIONS : GENERAL_ACTIONS;

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
        onToggleSkill={toggleSkill}
        onOpenAudiences={handleOpenAudiences}
        onOpenSkillsLibrary={handleOpenSkillsLibrary}
        token={token}
        onLogin={onLogin}
      />

      {/* Main Content */}
      <main className="flex-1 flex min-w-0">
        <div className="flex flex-col min-w-0 flex-1 transition-all duration-300">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="absolute top-4 left-4 z-10 w-8 h-8 rounded-lg bg-white/80 backdrop-blur-sm border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-colors shadow-sm"
            >
              <MessageSquare size={16} />
            </button>
          )}

          {activeView.type === 'skillsLibrary' ? (
            <SkillsLibrary
              skills={skills}
              onCreate={createSkill}
              onUpdate={updateSkill}
              onDelete={deleteSkill}
              onBack={() => setActiveView({ type: 'chat' })}
              onConfigure={(skill) => setActiveView({ type: 'skillConfig', skill })}
              onActivateSkill={(skill) => { toggleSkill(skill.id); setActiveView({ type: 'chat' }); }}
            />
          ) : activeView.type === 'skillConfig' && activeView.skill ? (
            <StrategistConfig
              strategist={activeView.skill}
              onUpdate={async (id, updates) => {
                await updateSkill(id, updates);
              }}
              onAddDoc={() => {}}
              onRemoveDoc={() => {}}
              onBack={() => setActiveView({ type: 'skillsLibrary' })}
            />
          ) : activeView.type === 'audiences' ? (
            <AudienceManager
              adAccountId={adAccountId}
              onSendToChat={handleAudienceToChat}
              onBack={() => setActiveView({ type: 'chat' })}
              token={token}
              onLogin={onLogin}
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
              suggestedActions={suggestedActions}
              adAccountId={adAccountId}
              onSaveItem={saveItem}
              folders={folders}
              activeSkill={activeSkill}
              onDeactivateSkill={() => activeSkill && toggleSkill(activeSkill.id)}
              skills={skills}
              onToggleSkill={toggleSkill}
              onManageSkills={(skill) => skill ? setActiveView({ type: 'skillConfig', skill }) : setActiveView({ type: 'skillsLibrary' })}
              onNavigate={(view) => {
                const viewMap = { audiences: 'audiences', skills: 'skillsLibrary' };
                setActiveView({ type: viewMap[view] || 'chat' });
              }}
            />
          )}
        </div>
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
