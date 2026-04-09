import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api.js';

const ACTIVE_KEY = 'aam_active_skills';

// Fallback defaults when API hasn't loaded — must match all 18 built-in skills from server/skills/default/
const DEFAULT_SKILLS = [
  // ── Analytical ──
  { id: 'insights-reporting', name: 'Insights & Reporting', description: 'Analyze Facebook ad performance with diagnostic statuses and strategic recommendations', icon: 'chart', isDefault: true },
  { id: 'data-analysis', name: 'Data Analysis', description: 'Performance analysis, diagnostics, and business intelligence — overview, cost diagnostics, capital loss, scaling', icon: 'chart', isDefault: true },
  { id: 'business-manager', name: 'Business Manager', description: 'Navigate Facebook Business Manager — view businesses, ad accounts, pages, pixels, and team members', icon: 'sparkles', isDefault: true },
  // ── Strategic ──
  { id: 'campaign-manager', name: 'Campaign Manager', description: 'Plan and configure Facebook ad campaigns — guided creation flow with diagnostic one-click fixes', icon: 'target', isDefault: true },
  { id: 'targeting-audiences', name: 'Targeting & Audiences', description: 'Plan audience targeting strategies — custom audiences, lookalikes, saved audiences, and interest targeting', icon: 'users', isDefault: true },
  { id: 'automation-rules', name: 'Automation Rules', description: 'Plan automation strategies — auto-pause, auto-scale, and notification rules with safety guardrails', icon: 'zap', isDefault: true },
  // ── Operational ──
  { id: 'ad-manager', name: 'Ad Manager', description: 'Create, update, delete, copy, and preview Facebook ads with read-first safety guardrails', icon: 'sparkles', isDefault: true },
  { id: 'adset-manager', name: 'Ad Set Manager', description: 'Create, update, delete, and copy ad sets with targeting, budgets, bidding, and scheduling', icon: 'sparkles', isDefault: true },
  { id: 'creative-manager', name: 'Creative Manager', description: 'Audit creative health — detect fatigue, analyze hook rates, recommend format pivots and copy refreshes', icon: 'palette', isDefault: true },
  { id: 'tracking-conversions', name: 'Tracking & Conversions', description: 'Set up pixels, send server-side conversion events via CAPI, and create custom conversions', icon: 'target', isDefault: true },
  { id: 'lead-ads', name: 'Lead Ads', description: 'Create lead generation forms, retrieve and export lead submissions, and connect forms to ads', icon: 'sparkles', isDefault: true },
  { id: 'product-catalogs', name: 'Product Catalogs', description: 'Manage product catalogs, feeds, product sets, and batch operations for dynamic product ads', icon: 'sparkles', isDefault: true },
  // ── Pipeline ──
  { id: 'campaign-creation', name: 'Campaign Creation', description: 'Complete campaign creation — from strategy to launch. Guided, materials-based, boost, bulk, and clone', icon: 'target', isDefault: true },
  { id: 'audience-creation', name: 'Audience Creation', description: 'Create all audience types — video, website, engagement, lookalike, saved, customer list', icon: 'users', isDefault: true },
  { id: 'campaign-setup', name: 'Campaign Setup', description: 'Stage 1-2: Collect campaign strategy settings and audience targeting configuration', icon: 'target', isDefault: true },
  { id: 'creative-assembly', name: 'Creative Assembly', description: 'Stage 3: Collect creative materials and auto-generate ad copy variations', icon: 'palette', isDefault: true },
  { id: 'ad-launcher', name: 'Ad Launcher', description: 'Execution: Final review, create campaign + ad set + creative + ad, preflight, preview, activate', icon: 'zap', isDefault: true },
  { id: 'bulk-campaign-setup', name: 'Bulk Campaign Setup', description: 'Create multiple campaigns at once from an uploaded document with campaign plan data', icon: 'zap', isDefault: true },
  // ── Operational ──
  { id: 'skill-creator', name: 'Skill Creator', description: 'Guide users through creating a new custom skill via structured conversation', icon: 'sparkles', isDefault: true },
];

// Load active skill IDs from localStorage
const loadActiveIds = () => {
  try {
    const stored = localStorage.getItem(ACTIVE_KEY);
    if (!stored) return new Set();
    const parsed = JSON.parse(stored);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
};

export const useSkills = () => {
  const [skills, setSkills] = useState(DEFAULT_SKILLS);
  const [loading, setLoading] = useState(true);
  const [activeSkillIds, setActiveSkillIds] = useState(loadActiveIds);

  // Fetch all skills from server (replaces defaults with full data including content)
  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/skills');
      if (data?.length) setSkills(data);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
      // Keep DEFAULT_SKILLS as fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  // Persist active IDs to localStorage
  const persistIds = useCallback((ids) => {
    if (ids.size === 0) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, JSON.stringify([...ids]));
  }, []);

  // Toggle a skill active/inactive (supports multiple)
  const toggleSkill = useCallback((id) => {
    setActiveSkillIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      persistIds(next);
      return next;
    });
  }, [persistIds]);

  // Create a new custom skill
  const createSkill = useCallback(async ({ name, description, content, icon }) => {
    const { data } = await api.post('/skills', { name, description, content, icon });
    setSkills(prev => [...prev, { ...data, isDefault: false }]);
    return data;
  }, []);

  // Update a custom skill
  const updateSkill = useCallback(async (id, updates) => {
    const { data } = await api.put(`/skills/${id}`, updates);
    setSkills(prev => prev.map(s => s.id === id ? { ...data, isDefault: false } : s));
    return data;
  }, []);

  // Delete a custom skill
  const deleteSkill = useCallback(async (id) => {
    await api.delete(`/skills/${id}`);
    setSkills(prev => prev.filter(s => s.id !== id));
    if (activeSkillIds.has(id)) {
      setActiveSkillIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        persistIds(next);
        return next;
      });
    }
  }, [activeSkillIds, persistIds]);

  // Generate a skill from raw text using AI
  const generateSkill = useCallback(async (rawText) => {
    const { data } = await api.post('/skills/generate', { rawText });
    return data; // { name, description, content, preview }
  }, []);

  // Get all currently active skills
  const activeSkills = useMemo(() =>
    skills.filter(s => activeSkillIds.has(s.id)),
  [skills, activeSkillIds]);

  // Backwards-compatible: first active skill (for UI that still expects single)
  const activeSkill = activeSkills[0] || null;

  // Build context string for all active skills (injected before user messages)
  const getSkillContext = useCallback(() => {
    if (activeSkills.length === 0) return null;
    return activeSkills
      .map(s => `[SKILL: ${s.name}]\n${s.content}`)
      .join('\n\n---\n\n');
  }, [activeSkills]);

  // Build context for a specific skill by id (for slash command one-off use)
  const getSkillContextById = useCallback((id) => {
    const skill = skills.find(s => s.id === id);
    if (!skill) return null;
    return `[SKILL: ${skill.name}]\n${skill.content}`;
  }, [skills]);

  return {
    skills,
    loading,
    activeSkill,       // backwards-compatible: first active skill
    activeSkills,      // NEW: all active skills
    activeSkillId: activeSkill?.id || null,  // backwards-compatible
    activeSkillIds,    // NEW: Set of active IDs
    toggleSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    generateSkill,
    getSkillContext,
    getSkillContextById,
    fetchSkills,
  };
};
