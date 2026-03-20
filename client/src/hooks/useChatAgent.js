import { useState, useCallback, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE || '';
const makeId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'agent',
  content: "Hi! I'm your **AI Ad Manager** powered by Gemini. I can analyze your Meta campaigns, check performance, manage budgets, and much more.\n\nSelect a **business portfolio** and **ad account** from the sidebar, then ask me anything!",
};

export const useChatAgent = ({ token, adAccountId, selectedAccount }) => {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [thinkingText, setThinkingText] = useState('');
  const [notification, setNotification] = useState(null);
  const sessionIdRef = useRef(makeId());
  const abortRef = useRef(null);

  const resetChat = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setMessages([WELCOME_MESSAGE]);
    setIsTyping(false);
    setThinkingText('');
    sessionIdRef.current = makeId();
  }, []);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || isTyping) return;

    const userMsg = { id: makeId(), role: 'user', content: text };
    const agentMsgId = makeId();

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setThinkingText('Thinking...');

    // Create abort controller for this request
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
          adAccountId,
          token,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Parse SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let addedAgent = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const event = JSON.parse(jsonStr);

            if (event.type === 'text') {
              fullContent += event.content;
              if (!addedAgent) {
                setMessages((prev) => [...prev, { id: agentMsgId, role: 'agent', content: fullContent }]);
                addedAgent = true;
                setThinkingText('');
              } else {
                setMessages((prev) =>
                  prev.map((m) => m.id === agentMsgId ? { ...m, content: fullContent } : m)
                );
              }
            } else if (event.type === 'tool_call') {
              setThinkingText(`Calling ${event.name.replace(/_/g, ' ')}...`);
            } else if (event.type === 'error') {
              throw new Error(event.message);
            }
          } catch (parseErr) {
            // Skip malformed SSE data
            if (parseErr.message !== 'Unexpected end of JSON input') {
              console.warn('SSE parse error:', parseErr);
            }
          }
        }
      }

      // If no content was received, show a fallback
      if (!fullContent) {
        setMessages((prev) => [
          ...prev,
          { id: agentMsgId, role: 'agent', content: "I couldn't generate a response. Please try again." },
        ]);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Chat error:', err);
      setMessages((prev) => [
        ...prev,
        { id: agentMsgId, role: 'agent', content: `Sorry, something went wrong: ${err.message}` },
      ]);
    } finally {
      setIsTyping(false);
      setThinkingText('');
      abortRef.current = null;
    }
  }, [token, adAccountId, isTyping]);

  return { messages, isTyping, thinkingText, sendMessage, resetChat, notification };
};
