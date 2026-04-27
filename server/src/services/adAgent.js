import { LlmAgent, Runner, InMemorySessionService } from '@google/adk';
import { rootTools, analystTools, executorTools, googleReadTools, googleWriteTools } from '../lib/tools.js';
import { buildInstruction, buildAnalystInstruction, buildExecutorInstruction } from '../lib/instructions.js';
import { SupabaseSessionService } from './supabaseSessionService.js';

// ── 2 Sub-agents ─────────────────────────────────────────────────────────────

const analystAgent = new LlmAgent({
  name: 'analyst',
  model: 'gemini-3-flash-preview',
  description: 'All read-only operations — performance diagnostics, creative health, audience analysis, tracking audits.',
  instruction: buildAnalystInstruction(),
  tools: [...analystTools, ...googleReadTools],
});

const executorAgent = new LlmAgent({
  name: 'executor',
  model: 'gemini-3-flash-preview',
  description: 'All write operations — campaign/ad CRUD, audience creation, tracking setup. The only agent that writes to Meta API.',
  instruction: buildExecutorInstruction(),
  tools: [...executorTools, ...googleReadTools, ...googleWriteTools],
});

// ── Debug: log tool counts ───────────────────────────────────────────────────
console.log(`[adAgent] Tool counts — root: ${rootTools.length} (${rootTools.map(t=>t.name).join(', ')}), analyst: ${analystTools.length}, executor: ${executorTools.length}`);

// ── Root agent + runner ──────────────────────────────────────────────────────

// Use Supabase-backed session service when DB is configured; fall back to
// in-memory for local dev without Supabase. Persisting agent state lets
// conversations survive Vercel cold starts and horizontal scale-out.
const sessionService = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? new SupabaseSessionService()
  : new InMemorySessionService();
console.log(`[adAgent] session service: ${sessionService.constructor.name}`);

const agent = new LlmAgent({
  name: 'ad_manager',
  model: 'gemini-3-flash-preview',
  instruction: buildInstruction(),
  tools: [...rootTools, ...googleReadTools],
  subAgents: [analystAgent, executorAgent],
});

const runner = new Runner({
  appName: 'ai_ad_manager',
  agent,
  sessionService,
});

export { runner, sessionService };
