import { BaseSessionService, createSession } from '@google/adk';
import { randomUUID } from 'crypto';
import { supabase } from '../lib/supabase.js';

/**
 * Persists ADK agent sessions to Supabase so state survives Vercel cold
 * starts and scale-out. Implements the same contract as
 * InMemorySessionService — createSession / getSession / listSessions /
 * deleteSession / appendEvent.
 *
 * Notes on scope (MVP):
 * - App-level and user-level state (APP_PREFIX / USER_PREFIX keys) are stored
 *   alongside session state on the session row. This project doesn't use them,
 *   so we don't split them out like DatabaseSessionService does.
 * - Writes are awaited (not fire-and-forget) to keep state consistent across
 *   retries within a single chat turn. Typical latency: <150ms per append.
 */
export class SupabaseSessionService extends BaseSessionService {
  _warnIfNoClient(where) {
    if (!supabase || typeof supabase.from !== 'function') {
      console.warn(`[SupabaseSession] ${where}: supabase client unavailable`);
      return true;
    }
    return false;
  }

  async createSession({ appName, userId, state, sessionId }) {
    const id = sessionId || randomUUID();
    const now = Date.now();
    const initialState = state && typeof state === 'object' ? state : {};

    if (!this._warnIfNoClient('createSession')) {
      const { error } = await supabase.from('adk_sessions').upsert(
        {
          id,
          app_name: appName,
          user_id: userId,
          state: initialState,
          last_update_time: now,
        },
        { onConflict: 'id' }
      );
      if (error) console.error('[SupabaseSession] createSession error:', error.message);
    }

    return createSession({
      id,
      appName,
      userId,
      state: initialState,
      events: [],
      lastUpdateTime: now,
    });
  }

  async getSession({ appName, userId, sessionId, config }) {
    if (this._warnIfNoClient('getSession')) return undefined;

    const { data: row, error } = await supabase
      .from('adk_sessions')
      .select('id, app_name, user_id, state, last_update_time')
      .eq('id', sessionId)
      .eq('app_name', appName)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[SupabaseSession] getSession error:', error.message);
      return undefined;
    }
    if (!row) return undefined;

    // Load events — apply config filters
    let query = supabase
      .from('adk_events')
      .select('event_data, timestamp')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: true });

    if (config?.afterTimestamp) {
      query = query.gt('timestamp', config.afterTimestamp);
    }

    const { data: eventRows, error: evErr } = await query;
    if (evErr) console.error('[SupabaseSession] getSession events error:', evErr.message);

    let events = (eventRows || []).map((r) => r.event_data);
    if (config?.numRecentEvents && events.length > config.numRecentEvents) {
      events = events.slice(-config.numRecentEvents);
    }

    return createSession({
      id: row.id,
      appName: row.app_name,
      userId: row.user_id,
      state: row.state || {},
      events,
      lastUpdateTime: Number(row.last_update_time),
    });
  }

  async listSessions({ appName, userId }) {
    if (this._warnIfNoClient('listSessions')) return { sessions: [] };

    const { data, error } = await supabase
      .from('adk_sessions')
      .select('id, app_name, user_id, last_update_time')
      .eq('app_name', appName)
      .eq('user_id', userId)
      .order('last_update_time', { ascending: false });

    if (error) {
      console.error('[SupabaseSession] listSessions error:', error.message);
      return { sessions: [] };
    }

    return {
      sessions: (data || []).map((s) =>
        createSession({
          id: s.id,
          appName: s.app_name,
          userId: s.user_id,
          state: {},
          events: [],
          lastUpdateTime: Number(s.last_update_time),
        })
      ),
    };
  }

  async deleteSession({ appName, userId, sessionId }) {
    if (this._warnIfNoClient('deleteSession')) return;
    // ON DELETE CASCADE handles events
    const { error } = await supabase
      .from('adk_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('app_name', appName)
      .eq('user_id', userId);
    if (error) console.error('[SupabaseSession] deleteSession error:', error.message);
  }

  /**
   * Called by Runner after each model turn / tool call. The base class:
   * - Skips partial (streaming) events — we do NOT want those in the DB
   * - Trims TEMP_PREFIX state deltas
   * - Applies stateDelta to session.state (in-memory mutation)
   * - Pushes event into session.events
   *
   * We additionally persist the event + updated state to Supabase.
   */
  async appendEvent({ session, event }) {
    // Let the base class mutate the in-memory session object
    await super.appendEvent({ session, event });

    // Don't persist streaming/partial events
    if (event.partial) return event;

    if (this._warnIfNoClient('appendEvent')) return event;

    session.lastUpdateTime = event.timestamp;

    // Parallel writes: event insert + session state update
    const [eventWrite, stateWrite] = await Promise.allSettled([
      supabase.from('adk_events').insert({
        session_id: session.id,
        app_name: session.appName,
        user_id: session.userId,
        event_data: event,
        timestamp: event.timestamp,
      }),
      supabase
        .from('adk_sessions')
        .update({ state: session.state, last_update_time: event.timestamp })
        .eq('id', session.id)
        .eq('app_name', session.appName)
        .eq('user_id', session.userId),
    ]);

    if (eventWrite.status === 'rejected' || eventWrite.value?.error) {
      const msg = eventWrite.reason?.message || eventWrite.value?.error?.message;
      console.error('[SupabaseSession] appendEvent insert error:', msg);
    }
    if (stateWrite.status === 'rejected' || stateWrite.value?.error) {
      const msg = stateWrite.reason?.message || stateWrite.value?.error?.message;
      console.error('[SupabaseSession] appendEvent update error:', msg);
    }

    return event;
  }
}
