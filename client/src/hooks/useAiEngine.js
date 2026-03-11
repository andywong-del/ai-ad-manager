import { useState, useEffect, useCallback } from 'react';
import { analyzePerformance } from '../services/decisionEngine.js';
import api from '../services/api.js';

export const useAiEngine = (campaigns, onCampaignsRefresh) => {
  const [decisions, setDecisions] = useState({});
  const [recommendations, setRecommendations] = useState([]);
  const [pendingAction, setPendingAction] = useState(null);
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    if (campaigns.length === 0) return;
    const { decisions: d, recommendations: r } = analyzePerformance(campaigns);
    setDecisions(d);
    setRecommendations(r);
  }, [campaigns]);

  const approveAction = useCallback(async (recommendation) => {
    const { id, decision, name } = recommendation;
    const updates = {};

    if (decision === 'PAUSE') {
      updates.status = 'PAUSED';
    } else if (decision === 'INCREASE_BUDGET_20%') {
      const campaign = campaigns.find(c => c.id === id);
      const currentBudget = parseInt(campaign?.daily_budget || 0);
      updates.daily_budget = Math.round(currentBudget * 1.2);
    }

    try {
      await api.patch(`/campaigns/${id}`, updates);
      const action = {
        id: Date.now().toString(),
        timestamp: new Date(),
        action: decision,
        campaignId: id,
        campaignName: name,
        details: decision === 'PAUSE'
          ? 'Campaign paused by AI recommendation'
          : `Daily budget increased by 20% (AI recommendation)`,
        status: 'success'
      };
      setActivities(prev => [action, ...prev]);
      setRecommendations(prev => prev.filter(r => r.id !== id));
      setPendingAction(null);
      onCampaignsRefresh?.();
    } catch (err) {
      console.error('Failed to apply action:', err);
    }
  }, [campaigns, onCampaignsRefresh]);

  const dismissAction = useCallback((id) => {
    const rec = recommendations.find(r => r.id === id);
    if (rec) {
      setActivities(prev => [{
        id: Date.now().toString(),
        timestamp: new Date(),
        action: rec.decision,
        campaignId: id,
        campaignName: rec.name,
        details: 'AI recommendation dismissed by user',
        status: 'dismissed'
      }, ...prev]);
    }
    setRecommendations(prev => prev.filter(r => r.id !== id));
    setPendingAction(null);
  }, [recommendations]);

  return {
    decisions,
    recommendations,
    pendingAction,
    activities,
    setPendingAction,
    approveAction,
    dismissAction
  };
};
