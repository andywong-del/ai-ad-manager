import { LlmAgent, FunctionTool, Runner, InMemorySessionService } from '@google/adk';
import * as meta from './metaClient.js';

// ── Tool functions ──────────────────────────────────────────────────────────
// Each function receives args + tool_context. We read token/adAccountId from
// session state so the LLM doesn't need to pass them.

function getCampaigns(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected. Ask the user to select one from the sidebar.' };
  return meta.getCampaigns(token, adAccountId);
}

function getAccountInsights({ date_preset = 'last_7d' }, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getInsights(token, adAccountId, date_preset);
}

function getCampaignInsights({ object_id, date_preset = 'last_7d', breakdowns }, context) {
  const { token } = context.state;
  const params = {
    fields: 'spend,impressions,clicks,ctr,cpm,cpc,actions,action_values,frequency,reach',
    date_preset,
  };
  if (breakdowns) params.breakdowns = breakdowns;
  return meta.getObjectInsights(token, object_id, params);
}

function getAdSets(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdSets(token, adAccountId);
}

function getCampaignAdSets({ campaign_id }, context) {
  return meta.getCampaignAdSets(context.state.token, campaign_id);
}

function getAds(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAds(token, adAccountId);
}

function getAdAccountDetails(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdAccountDetails(token, adAccountId);
}

function getCustomAudiences(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getCustomAudiences(token, adAccountId);
}

function getAdCreatives(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdCreatives(token, adAccountId);
}

function getPixels(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getPixels(token, adAccountId);
}

function getAdRules(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdRules(token, adAccountId);
}

function updateCampaignStatus({ campaign_id, status }, context) {
  return meta.updateCampaign(context.state.token, campaign_id, { status });
}

function updateCampaignBudget({ campaign_id, daily_budget }, context) {
  return meta.updateCampaign(context.state.token, campaign_id, { daily_budget });
}

function updateAdSetStatus({ ad_set_id, status }, context) {
  return meta.updateAdSet(context.state.token, ad_set_id, { status });
}

function createCustomAudience({ name, description = '', subtype = 'WEBSITE' }, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.createCustomAudience(token, adAccountId, { name, description, subtype });
}

function targetingSearch({ query }, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.targetingSearch(token, adAccountId, query);
}

function getReachEstimate({ targeting_spec }, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getReachEstimate(token, adAccountId, targeting_spec);
}

function getAdSetAds({ ad_set_id }, context) {
  return meta.getAdSetAds(context.state.token, ad_set_id);
}

function getAdLabels(args, context) {
  const { token, adAccountId } = context.state;
  if (!adAccountId) return { error: 'No ad account selected.' };
  return meta.getAdLabels(token, adAccountId);
}

// ── Build FunctionTool instances ────────────────────────────────────────────

const adTools = [
  new FunctionTool({
    name: 'get_campaigns',
    description: 'Get all campaigns for the current ad account with spend, impressions, clicks, and ROAS data from the last 7 days.',
    execute: getCampaigns,
  }),
  new FunctionTool({
    name: 'get_account_insights',
    description: 'Get account-level performance insights (spend, impressions, clicks, CTR, CPM, actions) for a date range. date_preset options: today, yesterday, last_3d, last_7d, last_14d, last_28d, last_30d, last_90d, this_month, last_month.',
    parameters: {
      type: 'object',
      properties: {
        date_preset: { type: 'string', description: 'Date range preset', default: 'last_7d' },
      },
    },
    execute: getAccountInsights,
  }),
  new FunctionTool({
    name: 'get_campaign_insights',
    description: 'Get detailed performance insights for a specific campaign, ad set, or ad by ID. Can include breakdowns by age, gender, country, or placement.',
    parameters: {
      type: 'object',
      properties: {
        object_id: { type: 'string', description: 'Campaign, ad set, or ad ID' },
        date_preset: { type: 'string', description: 'Date range (e.g. last_7d, last_30d)' },
        breakdowns: { type: 'string', description: 'Optional breakdown: age, gender, country, placement' },
      },
      required: ['object_id'],
    },
    execute: getCampaignInsights,
  }),
  new FunctionTool({
    name: 'get_ad_sets',
    description: 'Get all ad sets for the current ad account with targeting, budget, and optimization details.',
    execute: getAdSets,
  }),
  new FunctionTool({
    name: 'get_campaign_ad_sets',
    description: 'Get ad sets for a specific campaign.',
    parameters: {
      type: 'object',
      properties: { campaign_id: { type: 'string', description: 'Campaign ID' } },
      required: ['campaign_id'],
    },
    execute: getCampaignAdSets,
  }),
  new FunctionTool({
    name: 'get_ads',
    description: 'Get all ads for the current ad account.',
    execute: getAds,
  }),
  new FunctionTool({
    name: 'get_ad_set_ads',
    description: 'Get ads for a specific ad set.',
    parameters: {
      type: 'object',
      properties: { ad_set_id: { type: 'string', description: 'Ad set ID' } },
      required: ['ad_set_id'],
    },
    execute: getAdSetAds,
  }),
  new FunctionTool({
    name: 'get_ad_account_details',
    description: 'Get detailed info about the current ad account (balance, spend cap, timezone, currency).',
    execute: getAdAccountDetails,
  }),
  new FunctionTool({
    name: 'get_custom_audiences',
    description: 'Get all custom audiences for the current ad account.',
    execute: getCustomAudiences,
  }),
  new FunctionTool({
    name: 'get_ad_creatives',
    description: 'Get all ad creatives for the current ad account.',
    execute: getAdCreatives,
  }),
  new FunctionTool({
    name: 'get_pixels',
    description: 'Get all tracking pixels for the current ad account.',
    execute: getPixels,
  }),
  new FunctionTool({
    name: 'get_ad_rules',
    description: 'Get all automated rules for the current ad account.',
    execute: getAdRules,
  }),
  new FunctionTool({
    name: 'get_ad_labels',
    description: 'Get all ad labels for the current ad account.',
    execute: getAdLabels,
  }),

  // ── Write operations ────────────────────────────────────────────────────
  new FunctionTool({
    name: 'update_campaign_status',
    description: 'Pause or activate a campaign. ALWAYS confirm with the user before executing.',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED'], description: 'New status' },
      },
      required: ['campaign_id', 'status'],
    },
    execute: updateCampaignStatus,
  }),
  new FunctionTool({
    name: 'update_campaign_budget',
    description: 'Update the daily budget of a campaign. Budget is in cents (5000 = $50.00). ALWAYS confirm with the user before executing.',
    parameters: {
      type: 'object',
      properties: {
        campaign_id: { type: 'string', description: 'Campaign ID' },
        daily_budget: { type: 'number', description: 'New daily budget in cents' },
      },
      required: ['campaign_id', 'daily_budget'],
    },
    execute: updateCampaignBudget,
  }),
  new FunctionTool({
    name: 'update_ad_set_status',
    description: 'Pause or activate an ad set. ALWAYS confirm with the user before executing.',
    parameters: {
      type: 'object',
      properties: {
        ad_set_id: { type: 'string', description: 'Ad set ID' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED'], description: 'New status' },
      },
      required: ['ad_set_id', 'status'],
    },
    execute: updateAdSetStatus,
  }),
  new FunctionTool({
    name: 'create_custom_audience',
    description: 'Create a new custom audience.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Audience name' },
        description: { type: 'string', description: 'Audience description' },
        subtype: { type: 'string', description: 'WEBSITE, APP, or ENGAGEMENT' },
      },
      required: ['name'],
    },
    execute: createCustomAudience,
  }),
  new FunctionTool({
    name: 'targeting_search',
    description: 'Search for targeting interests, behaviors, or demographics by keyword.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search keyword (e.g. "fitness", "travel")' },
      },
      required: ['query'],
    },
    execute: targetingSearch,
  }),
  new FunctionTool({
    name: 'get_reach_estimate',
    description: 'Estimate the audience reach for a targeting specification.',
    parameters: {
      type: 'object',
      properties: {
        targeting_spec: { type: 'object', description: 'Meta targeting spec with geo_locations, age_min, age_max, genders, interests' },
      },
      required: ['targeting_spec'],
    },
    execute: getReachEstimate,
  }),
];

// ── System instruction ──────────────────────────────────────────────────────

const SYSTEM_INSTRUCTION = `You are an expert AI Ad Manager assistant built to help users analyze and optimize their Meta (Facebook & Instagram) advertising campaigns.

## Your Capabilities
You have access to the full Meta Marketing API through function tools:
- **Read**: campaigns, ad sets, ads, creatives, insights (with breakdowns), audiences, pixels, rules, labels, account details
- **Write**: pause/activate campaigns & ad sets, update budgets, create audiences
- **Analyze**: targeting search, reach estimates, performance breakdowns by age/gender/country/placement

## How to Respond
1. **Always fetch real data first** — never guess numbers or make up stats.
2. **Format clearly** — use markdown tables for data, bold for key metrics, bullet points for recommendations.
3. **Be concise but thorough** — lead with the key insight, then provide supporting data.
4. **For audits**, check multiple dimensions: campaigns, ad sets, insights across date ranges, audiences, targeting.
5. **For write operations** (pause, budget change, etc.), ALWAYS confirm with the user before executing.
6. **If no ad account is selected**, tell the user to select a business portfolio and ad account from the sidebar.
7. **Show $ amounts** in dollars (convert from cents: 5000 cents = $50.00).
8. **Calculate ROAS** when actions and action_values are available.
9. **Proactively suggest optimizations** when you spot issues: low ROAS, high CPM, wasted spend, etc.
10. **When comparing performance**, always mention the time period being analyzed.

## Response Style
- Professional but conversational
- Use emojis sparingly for visual indicators: ✅ good, ⚠️ warning, ❌ bad
- When presenting campaign data, prefer tables
- Group recommendations by priority: urgent, important, nice-to-have`;

// ── Create agent + runner ───────────────────────────────────────────────────

const sessionService = new InMemorySessionService();

const agent = new LlmAgent({
  name: 'ad_manager',
  model: 'gemini-2.0-flash',
  instruction: SYSTEM_INSTRUCTION,
  tools: adTools,
});

const runner = new Runner({
  appName: 'ai_ad_manager',
  agent,
  sessionService,
});

export { runner, sessionService };
