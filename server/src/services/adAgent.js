import { LlmAgent, Runner, InMemorySessionService } from '@google/adk';
import { adTools, ss1Tools, ss3Tools, ss4Tools } from '../lib/tools.js';
import { buildInstruction, buildSs1Instruction, buildSs3Instruction, buildSs4Instruction } from '../lib/instructions.js';

// ── Pipeline sub-agents ───────────────────────────────────────────────────────

const ss1Agent = new LlmAgent({
  name: 'campaign_strategist',
  model: 'gemini-2.5-pro',
  description: 'Handles campaign objective, destination, creates campaign + ad set (Step 1 of 3 in ad creation)',
  instruction: buildSs1Instruction(),
  tools: ss1Tools,
});

const ss3Agent = new LlmAgent({
  name: 'creative_builder',
  model: 'gemini-2.5-pro',
  description: 'Uploads media, collects ad copy, and creates the ad creative (Step 2 of 3 in ad creation)',
  instruction: buildSs3Instruction(),
  tools: ss3Tools,
});

const ss4Agent = new LlmAgent({
  name: 'ad_launcher',
  model: 'gemini-2.5-pro',
  description: 'Handles review gate, preflight check, preview, and activates the ad (Step 3 of 3 in ad creation)',
  instruction: buildSs4Instruction(),
  tools: ss4Tools,
});

// ── Root agent + runner ───────────────────────────────────────────────────────

const sessionService = new InMemorySessionService();

const agent = new LlmAgent({
  name: 'ad_manager',
  model: 'gemini-2.5-pro',
  instruction: buildInstruction(),
  tools: adTools,
  subAgents: [ss1Agent, ss3Agent, ss4Agent],
});

const runner = new Runner({
  appName: 'ai_ad_manager',
  agent,
  sessionService,
});

export { runner, sessionService };
