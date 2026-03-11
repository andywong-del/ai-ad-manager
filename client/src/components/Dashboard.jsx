import { useState, useCallback } from 'react';
import { Bot, ArrowLeft, LogOut } from 'lucide-react';
import { useChatAgent } from '../hooks/useChatAgent.js';
import { HomeScreen } from './HomeScreen.jsx';
import { ChatInterface } from './ChatInterface.jsx';
const VIEW_LABELS = {
  chat: 'AI Chat',
};

export const Dashboard = ({ token = null, adAccountId = null, onLogout }) => {
  const [view, setView] = useState('home'); // 'home' | 'chat'
  const { messages, isTyping, thinkingText, sendMessage, resetChat } = useChatAgent({ token, adAccountId });

  const goHome = useCallback(() => {
    resetChat();
    setView('home');
  }, [resetChat]);

  const handleHomeSend = useCallback(
    (text) => {
      setView('chat');
      sendMessage(text);
    },
    [sendMessage]
  );

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center gap-3">
        {view !== 'home' && (
          <button
            onClick={goHome}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors mr-1"
            title="Back to home"
          >
            <ArrowLeft size={16} />
            <span className="text-sm">Back</span>
          </button>
        )}

        <div className="bg-gradient-to-br from-blue-500 to-violet-600 p-1.5 rounded-lg">
          <Bot size={16} className="text-white" />
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-slate-900 leading-tight">AI Ad Manager</h1>
          {view !== 'home' && (
            <p className="text-xs text-slate-400 leading-tight">{VIEW_LABELS[view]}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full animate-pulse bg-emerald-400" />
            <span className="text-xs font-medium text-emerald-600">Live</span>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              title="Disconnect account"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {view === 'home' && (
          <HomeScreen onSend={handleHomeSend} />
        )}
        {view === 'chat' && (
          <ChatInterface messages={messages} isTyping={isTyping} thinkingText={thinkingText} onSend={sendMessage} />
        )}
      </main>
    </div>
  );
};
