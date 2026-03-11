/**
 * Pure AI decision engine — no side effects, no external dependencies.
 * Analyzes campaign performance data and returns decisions + recommendations.
 */

const RULES = {
  PAUSE: (roas, spend) => roas < 1.0 && spend > 50,
  INCREASE: (roas) => roas > 3.0,
  MONITOR: (roas) => roas >= 1.0 && roas <= 1.5,
};

const getDecision = (roas, spend) => {
  if (RULES.PAUSE(roas, spend)) return 'PAUSE';
  if (RULES.INCREASE(roas)) return 'INCREASE_BUDGET_20%';
  if (RULES.MONITOR(roas)) return 'MONITOR';
  return null;
};

const getReason = (decision, roas, spend) => {
  switch (decision) {
    case 'PAUSE':
      return `ROAS of ${roas.toFixed(2)}x is below break-even with $${spend.toFixed(2)} spend`;
    case 'INCREASE_BUDGET_20%':
      return `Strong ROAS of ${roas.toFixed(2)}x indicates scalable performance`;
    case 'MONITOR':
      return `Marginal ROAS of ${roas.toFixed(2)}x — monitor 24h before acting`;
    default:
      return null;
  }
};

const getProjectedImpact = (decision, campaign) => {
  const spend = parseFloat(campaign.insights?.data?.[0]?.spend || 0);
  const budget = parseInt(campaign.daily_budget || 0) / 100;
  switch (decision) {
    case 'PAUSE':
      return `Save ~$${budget.toFixed(2)}/day`;
    case 'INCREASE_BUDGET_20%':
      return `Potential +20% conversions (~$${(budget * 0.2).toFixed(2)}/day more spend)`;
    default:
      return null;
  }
};

/**
 * @param {Array} campaigns - Array of campaign objects with nested insights
 * @returns {{ decisions: Object, recommendations: Array }}
 */
export const analyzePerformance = (campaigns) => {
  const decisions = {};
  const recommendations = [];

  for (const campaign of campaigns) {
    if (campaign.status === 'PAUSED') {
      decisions[campaign.id] = null;
      continue;
    }

    const insight = campaign.insights?.data?.[0] || {};
    const spend = parseFloat(insight.spend || 0);
    const revenue = parseFloat(
      insight.action_values?.find(a => a.action_type === 'purchase')?.value || 0
    );
    const roas = spend > 0 ? revenue / spend : 0;

    const decision = getDecision(roas, spend);
    decisions[campaign.id] = decision;

    if (decision) {
      recommendations.push({
        id: campaign.id,
        name: campaign.name,
        decision,
        reason: getReason(decision, roas, spend),
        projectedImpact: getProjectedImpact(decision, campaign),
        roas,
        spend,
        confidence: decision === 'MONITOR' ? 'MEDIUM' : 'HIGH'
      });
    }
  }

  return { decisions, recommendations };
};
