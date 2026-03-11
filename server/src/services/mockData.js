export const MOCK_AD_ACCOUNT_ID = 'act_123456789';

// Simulates /act_{id}/campaigns?fields=id,name,status,daily_budget,insights
// Budgets in cents as strings (Meta format): "5000" = $50.00
// Campaign data is designed to trigger specific AI decisions:
//   Campaign 2: ROAS 0.83, Spend $78.20 → PAUSE
//   Campaign 3: ROAS 7.71 → INCREASE_BUDGET_20%
//   Campaign 1: ROAS 3.16 → INCREASE_BUDGET_20%
//   Campaign 4: PAUSED → no action
let campaigns = [
  {
    id: '23851234560001',
    name: 'Summer Sale — Retargeting',
    status: 'ACTIVE',
    daily_budget: '5000',
    insights: {
      data: [{
        spend: '312.50',
        impressions: '45230',
        clicks: '892',
        actions: [{ action_type: 'purchase', value: '18' }],
        action_values: [{ action_type: 'purchase', value: '987.50' }]
      }]
    }
  },
  {
    id: '23851234560002',
    name: 'Brand Awareness — Cold',
    status: 'ACTIVE',
    daily_budget: '3000',
    insights: {
      data: [{
        spend: '78.20',
        impressions: '120450',
        clicks: '234',
        actions: [{ action_type: 'purchase', value: '2' }],
        action_values: [{ action_type: 'purchase', value: '65.00' }]
      }]
    }
  },
  {
    id: '23851234560003',
    name: 'Lookalike — High Value',
    status: 'ACTIVE',
    daily_budget: '7500',
    insights: {
      data: [{
        spend: '245.00',
        impressions: '28100',
        clicks: '1203',
        actions: [{ action_type: 'purchase', value: '45' }],
        action_values: [{ action_type: 'purchase', value: '1890.00' }]
      }]
    }
  },
  {
    id: '23851234560004',
    name: 'Dynamic Product Ads',
    status: 'PAUSED',
    daily_budget: '2000',
    insights: {
      data: [{
        spend: '0',
        impressions: '0',
        clicks: '0',
        actions: [],
        action_values: []
      }]
    }
  }
];

export const getCampaigns = () => campaigns;

export const updateCampaign = (id, updates) => {
  const idx = campaigns.findIndex(c => c.id === id);
  if (idx === -1) return null;
  campaigns[idx] = { ...campaigns[idx], ...updates };
  return campaigns[idx];
};

export const aggregateMetrics = {
  totalSpend: 635.70,
  totalRevenue: 2942.50,
  roas: 4.63,
  conversions: 65,
  impressions: 193780,
  clicks: 2329,
  ctr: 1.20,
  dateRange: { start: '2026-03-03', end: '2026-03-09' }
};
