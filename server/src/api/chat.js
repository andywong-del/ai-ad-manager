import { Router } from 'express';
import { runner, sessionService } from '../services/adAgent.js';

const router = Router();

// In-memory map: chatSessionId → ADK sessionId
const sessionMap = new Map();

// POST /api/chat
// Body: { message, sessionId?, adAccountId?, token }
// Response: SSE stream of agent events
router.post('/', async (req, res) => {
  try {
    const { message, sessionId: clientSessionId, adAccountId, token } = req.body;
    console.log(`[chat] message="${message?.slice(0, 60)}" adAccountId=${adAccountId} session=${clientSessionId?.slice(0, 8)}`);

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    if (!token) {
      return res.status(401).json({ error: 'token is required' });
    }

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    const userId = 'user';
    let adkSessionId = clientSessionId ? sessionMap.get(clientSessionId) : null;

    // Create or reuse ADK session
    if (!adkSessionId) {
      const session = await sessionService.createSession({
        appName: 'ai_ad_manager',
        userId,
        state: { token, adAccountId: adAccountId || null },
      });
      adkSessionId = session.id;
      if (clientSessionId) sessionMap.set(clientSessionId, adkSessionId);
    } else {
      // Update state with latest token/account
      // We do this by running with stateDelta
    }

    // Build the user message in Gemini Content format
    const newMessage = {
      role: 'user',
      parts: [{ text: message }],
    };

    // Run the agent and stream events
    const events = runner.runAsync({
      userId,
      sessionId: adkSessionId,
      newMessage,
      stateDelta: { token, adAccountId: adAccountId || null },
    });

    let fullText = '';

    for await (const event of events) {
      // Extract text content from the event
      if (event.content?.parts) {
        for (const part of event.content.parts) {
          if (part.text) {
            fullText += part.text;
            // Send incremental text as SSE
            res.write(`data: ${JSON.stringify({ type: 'text', content: part.text })}\n\n`);
          }
          if (part.functionCall) {
            // Send tool call notification
            res.write(`data: ${JSON.stringify({ type: 'tool_call', name: part.functionCall.name })}\n\n`);
          }
        }
      }
    }

    // Send done event
    res.write(`data: ${JSON.stringify({ type: 'done', sessionId: adkSessionId })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    // If headers already sent, send error as SSE
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
      res.end();
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

export default router;
