// Shared SSE emitter map — avoids circular import between chat.js and adAgent.js
// chat.js registers: activeSessions.set(sessionId, sseFn)
// adAgent.js reads:  activeSessions.get(sessionId)
export const activeSessions = new Map();

// Clean up stale sessions every 5 minutes (sessions older than 30 min without activity)
const SESSION_TTL = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of activeSessions.entries()) {
    if (session?.lastAccess && now - session.lastAccess > SESSION_TTL) {
      activeSessions.delete(key);
    }
  }
}, 5 * 60 * 1000);
