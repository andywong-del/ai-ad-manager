import { useState } from 'react';
import { ArrowLeft, Plus, Sparkles, BarChart3, Palette, DollarSign, Users, Zap, Trash2, Edit3, Save, X, ChevronRight, Check } from 'lucide-react';

const ICON_MAP = {
  funnel: BarChart3,
  chart: BarChart3,
  palette: Palette,
  dollar: DollarSign,
  users: Users,
  sparkles: Sparkles,
  zap: Zap,
};

const SkillCard = ({ skill, isActive, onToggle, onEdit, onDelete }) => {
  const Icon = ICON_MAP[skill.icon] || Sparkles;
  return (
    <div className={`group relative rounded-xl border transition-all ${isActive ? 'border-indigo-300 bg-indigo-50/50 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'}`}>
      <div className="px-4 py-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isActive ? 'bg-indigo-100' : 'bg-slate-100'}`}>
            <Icon size={18} className={isActive ? 'text-indigo-600' : 'text-slate-500'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-semibold truncate ${isActive ? 'text-indigo-800' : 'text-slate-800'}`}>{skill.name}</h3>
              {skill.isDefault && <span className="text-[9px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-semibold shrink-0">Default</span>}
              {isActive && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{skill.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => onToggle(skill.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors
              ${isActive ? 'bg-indigo-600 text-white hover:bg-indigo-500' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
            {isActive ? <><Check size={12} /> Active</> : <><Zap size={12} /> Activate</>}
          </button>
          {!skill.isDefault && (
            <>
              <button onClick={() => onEdit(skill)} className="p-1.5 rounded-lg text-slate-300 hover:text-blue-500 hover:bg-blue-50 transition-colors" title="Edit">
                <Edit3 size={13} />
              </button>
              <button onClick={() => onDelete(skill)} className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Create / Edit Skill Modal ────────────────────────────────────────────────
const SkillEditor = ({ skill, onSave, onCancel, saving }) => {
  const [name, setName] = useState(skill?.name || '');
  const [description, setDescription] = useState(skill?.description || '');
  const [content, setContent] = useState(skill?.content || '');

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), content: content.trim() });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-base font-bold text-slate-900">{skill ? 'Edit Skill' : 'Create New Skill'}</h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Skill Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g., Creative A/B Test Planner"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description
              <span className="text-xs font-normal text-slate-400 ml-2">Short summary shown in the library</span>
            </label>
            <input value={description} onChange={e => setDescription(e.target.value)}
              placeholder="e.g., Plan and structure A/B tests for ad creatives"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Instructions
              <span className="text-xs font-normal text-slate-400 ml-2">Tell the AI how to behave when this skill is active</span>
            </label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              rows={10}
              placeholder={"e.g., You are a creative testing expert. When analyzing ads:\n\n1. Identify the strongest performing ad\n2. Propose 3 variations to test against it\n3. Define success metrics and test duration\n4. Recommend budget allocation for the test"}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300 resize-y font-mono" />
            <p className="text-[11px] text-slate-400 mt-1">{content.length} characters — the AI will follow these instructions when this skill is invoked</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 shrink-0">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
            <Save size={14} />
            {saving ? 'Saving...' : skill ? 'Update Skill' : 'Create Skill'}
          </button>
        </div>
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

// ── Main Skills Library ──────────────────────────────────────────────────────
export const SkillsLibrary = ({ skills, activeSkillId, onToggle, onCreate, onUpdate, onDelete, onBack }) => {
  const [showEditor, setShowEditor] = useState(false);
  const [editingSkill, setEditingSkill] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const defaultSkills = skills.filter(s => s.isDefault);
  const customSkills = skills.filter(s => !s.isDefault);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editingSkill) {
        await onUpdate(editingSkill.id, data);
      } else {
        await onCreate(data);
      }
      setShowEditor(false);
      setEditingSkill(null);
    } catch (err) {
      console.error('Failed to save skill:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (skill) => {
    setEditingSkill(skill);
    setShowEditor(true);
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
    <div className="flex-1 flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 shrink-0">
        <button onClick={onBack} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Sparkles size={18} className="text-indigo-500" />
          <span className="text-lg font-bold text-slate-900">Skills Library</span>
        </div>
        <button onClick={() => { setEditingSkill(null); setShowEditor(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm">
          <Plus size={14} /> Create Skill
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-3xl mx-auto">
          {/* How to use */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-6">
            <p className="text-[12px] font-semibold text-indigo-700 mb-1">How to use skills</p>
            <ul className="text-[11px] text-indigo-600 space-y-0.5">
              <li><strong>Activate</strong> a skill here — it stays on for all messages until you deactivate it</li>
              <li><strong>Type /</strong> in the chat to invoke any skill for a single message</li>
              <li>The AI agent will follow the skill's instructions when responding</li>
            </ul>
          </div>

          {/* Default Skills */}
          <div className="mb-6">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Default Skills</h2>
            <div className="grid grid-cols-2 gap-3">
              {defaultSkills.map(skill => (
                <SkillCard key={skill.id} skill={skill} isActive={skill.id === activeSkillId}
                  onToggle={onToggle} onEdit={handleEdit} onDelete={setDeleteTarget} />
              ))}
            </div>
          </div>

          {/* Custom Skills */}
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              My Skills
              {customSkills.length > 0 && <span className="ml-2 text-slate-300 font-normal normal-case">({customSkills.length})</span>}
            </h2>
            {customSkills.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                <Sparkles size={24} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400 mb-1">No custom skills yet</p>
                <p className="text-xs text-slate-300 mb-3">Create your own strategy or workflow</p>
                <button onClick={() => { setEditingSkill(null); setShowEditor(true); }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-colors">
                  <Plus size={12} /> Create Skill
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {customSkills.map(skill => (
                  <SkillCard key={skill.id} skill={skill} isActive={skill.id === activeSkillId}
                    onToggle={onToggle} onEdit={handleEdit} onDelete={setDeleteTarget} />
                ))}
                {/* Add button card */}
                <button onClick={() => { setEditingSkill(null); setShowEditor(true); }}
                  className="rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center py-6 text-slate-400 hover:text-indigo-500 hover:border-indigo-300 transition-colors">
                  <Plus size={20} />
                  <span className="text-xs font-medium mt-1">New Skill</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <SkillEditor
          skill={editingSkill}
          onSave={handleSave}
          onCancel={() => { setShowEditor(false); setEditingSkill(null); }}
          saving={saving}
        />
      )}

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
