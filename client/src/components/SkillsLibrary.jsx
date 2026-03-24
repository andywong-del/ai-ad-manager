import { useState } from 'react';
import { X, Plus, Sparkles, BarChart3, Palette, DollarSign, Users, Zap, Trash2, Edit3, Save, Target, TrendingUp, ChevronRight, MessageSquare } from 'lucide-react';

const ICON_MAP = {
  funnel: BarChart3,
  chart: BarChart3,
  palette: Palette,
  dollar: DollarSign,
  users: Users,
  sparkles: Sparkles,
  zap: Zap,
  target: Target,
  trending: TrendingUp,
};

// Category mapping for organizing skills
const SKILL_CATEGORIES = {
  performance_analyst: 'Analysis',
  inception_funnel_audit: 'Analysis',
  creative_strategist: 'Creative',
  budget_optimizer: 'Strategy',
  audience_strategist: 'Targeting',
};

const CATEGORY_ORDER = ['Analysis', 'Strategy', 'Creative', 'Targeting', 'Custom'];

const getCategoryForSkill = (skill) => {
  if (!skill.isDefault) return 'Custom';
  return SKILL_CATEGORIES[skill.id] || 'Custom';
};

// ── Inline Skill Editor (expandable within the panel) ────────────────────────
const InlineSkillEditor = ({ skill, onSave, onCancel, saving }) => {
  const [name, setName] = useState(skill?.name || '');
  const [description, setDescription] = useState(skill?.description || '');
  const [content, setContent] = useState(skill?.content || '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), content: content.trim() });
  };

  return (
    <div className="border border-indigo-200 rounded-xl bg-indigo-50/30 p-4 space-y-3">
      <div>
        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Name</label>
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g., Creative A/B Test Planner"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white" />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Description</label>
        <input value={description} onChange={e => setDescription(e.target.value)}
          placeholder="Short summary"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 bg-white" />
      </div>
      <div>
        <label className="block text-[11px] font-semibold text-slate-600 mb-1">Instructions</label>
        <textarea value={content} onChange={e => setContent(e.target.value)}
          rows={6}
          placeholder="Tell the AI how to behave when this expert is active..."
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y font-mono bg-white" />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
        <button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
          <Save size={12} />
          {saving ? 'Saving...' : skill ? 'Update' : 'Create'}
        </button>
      </div>
    </div>
  );
};

// ── Confirm Delete ──────────────────────────────────────────────────────────
const DeleteConfirm = ({ skill, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Delete "{skill.name}"?</h3>
        <p className="text-xs text-slate-500">This skill will be permanently deleted. This cannot be undone.</p>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">Delete</button>
      </div>
    </div>
  </div>
);

// ── Main Skills Library (slide-over panel) ──────────────────────────────────
export const SkillsLibrary = ({ skills, onCreate, onUpdate, onDelete, onBack, onConfigure, onActivateSkill }) => {
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  // Group skills by category
  const grouped = {};
  skills.forEach(skill => {
    const cat = getCategoryForSkill(skill);
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(skill);
  });
  const orderedCategories = CATEGORY_ORDER.filter(c => grouped[c]?.length);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editingSkillId) {
        await onUpdate(editingSkillId, data);
        setEditingSkillId(null);
      } else {
        await onCreate(data);
        setCreatingNew(false);
      }
    } catch (err) {
      console.error('Failed to save skill:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await onDelete(deleteTarget.id);
    } catch (err) {
      console.error('Failed to delete skill:', err);
    }
    setDeleteTarget(null);
  };

  return (
    <div className="w-full h-full bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-indigo-500" />
          <span className="text-sm font-bold text-slate-900">Expertise Library</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setEditingSkillId(null); setCreatingNew(true); }}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors">
            <Plus size={12} /> New
          </button>
          <button onClick={onBack} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 max-w-3xl">
        {/* Create new inline */}
        {creatingNew && (
          <InlineSkillEditor
            onSave={handleSave}
            onCancel={() => setCreatingNew(false)}
            saving={saving}
          />
        )}

        {/* Skills by category */}
        {orderedCategories.map(category => (
          <div key={category}>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{category}</h2>
            <div className="space-y-1.5">
              {grouped[category].map(skill => {
                const Icon = ICON_MAP[skill.icon] || Sparkles;
                const isEditing = editingSkillId === skill.id;

                if (isEditing) {
                  return (
                    <InlineSkillEditor
                      key={skill.id}
                      skill={skill}
                      onSave={handleSave}
                      onCancel={() => setEditingSkillId(null)}
                      saving={saving}
                    />
                  );
                }

                return (
                  <div key={skill.id}
                    className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-slate-100 group-hover:bg-indigo-100 transition-colors">
                      <Icon size={15} className="text-slate-500 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-[13px] font-semibold truncate text-slate-800">{skill.name}</h3>
                        {skill.isDefault && <span className="text-[8px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Built-in</span>}
                      </div>
                      <p className="text-[10px] text-slate-500 truncate">{skill.description}</p>
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {onActivateSkill && (
                        <button onClick={() => { onActivateSkill(skill); onBack(); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Use in chat">
                          <MessageSquare size={13} />
                        </button>
                      )}
                      <button onClick={() => {
                        if (onConfigure && skill.isDefault) { onConfigure(skill); }
                        else { setEditingSkillId(skill.id); setCreatingNew(false); }
                      }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
                        <Edit3 size={13} />
                      </button>
                      {!skill.isDefault && (
                        <button onClick={() => setDeleteTarget(skill)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    {onConfigure && skill.isDefault && (
                      <button onClick={() => onConfigure(skill)}
                        className="shrink-0 text-slate-300 hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100">
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Empty custom section */}
        {!grouped['Custom'] && !creatingNew && (
          <div>
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Custom</h2>
            <button onClick={() => setCreatingNew(true)}
              className="w-full rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center py-5 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors">
              <Plus size={16} className="mr-1.5" />
              <span className="text-xs font-medium">Create Expert</span>
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirm
          skill={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};
