import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

const ACTIVE_KEY = 'aam_active_skill';

export const useSkills = () => {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeSkillId, setActiveSkillId] = useState(() => localStorage.getItem(ACTIVE_KEY) || null);

  // Fetch all skills from server
  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/skills');
      setSkills(data);
    } catch (err) {
      console.error('Failed to fetch skills:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  // Toggle a skill active/inactive (only one active at a time)
  const toggleSkill = useCallback((id) => {
    setActiveSkillId(prev => {
      const next = prev === id ? null : id;
      if (next) localStorage.setItem(ACTIVE_KEY, next);
      else localStorage.removeItem(ACTIVE_KEY);
      return next;
    });
  }, []);

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
    if (activeSkillId === id) {
      setActiveSkillId(null);
      localStorage.removeItem(ACTIVE_KEY);
    }
  }, [activeSkillId]);

  // Get the currently active skill
  const activeSkill = skills.find(s => s.id === activeSkillId) || null;

  // Build context string for active skill (injected before user messages)
  const getSkillContext = useCallback(() => {
    if (!activeSkill) return null;
    return `[SKILL: ${activeSkill.name}]\n${activeSkill.content}`;
  }, [activeSkill]);

  // Build context for a specific skill by id (for slash command one-off use)
  const getSkillContextById = useCallback((id) => {
    const skill = skills.find(s => s.id === id);
    if (!skill) return null;
    return `[SKILL: ${skill.name}]\n${skill.content}`;
  }, [skills]);

  return {
    skills,
    loading,
    activeSkill,
    activeSkillId,
    toggleSkill,
    createSkill,
    updateSkill,
    deleteSkill,
    getSkillContext,
    getSkillContextById,
    fetchSkills,
  };
};
