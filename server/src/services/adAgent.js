import { LlmAgent, Runner, InMemorySessionService } from '@google/adk';
import { rootTools, analystTools, audienceTools, creativeTools, executorTools, technicalTools } from '../lib/tools.js';
import { buildInstruction, buildAnalystInstruction, buildAudienceInstruction, buildCreativeInstruction, buildExecutorInstruction, buildTechnicalInstruction } from '../lib/instructions.js';

// ── 5 Sub-agents ─────────────────────────────────────────────────────────────

const analystAgent = new LlmAgent({
  name: 'analyst',
  model: 'gemini-3-flash-preview',
  description: 'Diagnoses campaign performance using 5-signal decision tree. Returns structured diagnostic statuses and action queue.',
  instruction: buildAnalystInstruction(),
  tools: analystTools,
});

const audienceAgent = new LlmAgent({
  name: 'audience_strategist',
  model: 'gemini-3-flash-preview',
  description: 'Maps performance gaps to audience actions — expansion, exclusion, lookalikes, retargeting.',
  instruction: buildAudienceInstruction(),
  tools: audienceTools,
});

const creativeAgent = new LlmAgent({
  name: 'creative_strategist',
  model: 'gemini-3-flash-preview',
  description: 'Audits creative health — hook rates, fatigue signals, copy pivot recommendations.',
  instruction: buildCreativeInstruction(),
  tools: creativeTools,
});

const executorAgent = new LlmAgent({
  name: 'executor',
  model: 'gemini-3-flash-preview',
  description: 'Executes campaign creation, ad set setup, creative assembly, ad activation, and campaign edits (pause, budget, status). The only agent that writes to Meta API.',
  instruction: buildExecutorInstruction(),
  tools: executorTools,
});

const technicalAgent = new LlmAgent({
  name: 'technical_guard',
  model: 'gemini-3-flash-preview',
  description: 'Checks pixel health, CAPI status, conversion tracking, and attribution setup.',
  instruction: buildTechnicalInstruction(),
  tools: technicalTools,
});

// ── Debug: log tool counts ───────────────────────────────────────────────────
console.log(`[adAgent] Tool counts — root: ${rootTools.length} (${rootTools.map(t=>t.name).join(', ')}), analyst: ${analystTools.length}, executor: ${executorTools.length}`);

// ── Root agent + runner ──────────────────────────────────────────────────────

const sessionService = new InMemorySessionService();

const agent = new LlmAgent({
  name: 'ad_manager',
  model: 'gemini-3-flash-preview',
  instruction: buildInstruction(),
  tools: rootTools,
  subAgents: [analystAgent, audienceAgent, creativeAgent, executorAgent, technicalAgent],
});

const runner = new Runner({
  appName: 'ai_ad_manager',
  agent,
  sessionService,
});

export { runner, sessionService };
