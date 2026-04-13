import { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, RefreshCw, Loader2, X, ChevronDown, FileText, Download, Clock, Eye, Plus, Archive, MessageSquare, Users, Trash2, AlertTriangle } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
const fmtDateTime = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

// ── Question type presets ──
const FIELD_PRESETS = [
  { key: 'full_name', label: 'Full Name', type: 'FULL_NAME' },
  { key: 'email', label: 'Email', type: 'EMAIL' },
  { key: 'phone_number', label: 'Phone Number', type: 'PHONE' },
  { key: 'company_name', label: 'Company Name', type: 'COMPANY_NAME' },
  { key: 'job_title', label: 'Job Title', type: 'JOB_TITLE' },
  { key: 'city', label: 'City', type: 'CITY' },
  { key: 'state', label: 'State', type: 'STATE' },
  { key: 'zip', label: 'Zip Code', type: 'ZIP' },
  { key: 'country', label: 'Country', type: 'COUNTRY' },
  { key: 'date_of_birth', label: 'Date of Birth', type: 'DATE_OF_BIRTH' },
];

// ── Create form modal ──
const CreateFormModal = ({ pageId, onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  const [selectedFields, setSelectedFields] = useState(['full_name', 'email', 'phone_number']);
  const [customQuestions, setCustomQuestions] = useState([]);
  const [newCustom, setNewCustom] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const toggleField = (key) => {
    setSelectedFields(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const addCustomQuestion = () => {
    if (!newCustom.trim()) return;
    setCustomQuestions(prev => [...prev, { key: `custom_${Date.now()}`, label: newCustom.trim(), type: 'CUSTOM' }]);
    setNewCustom('');
  };

  const removeCustom = (key) => {
    setCustomQuestions(prev => prev.filter(q => q.key !== key));
  };

  const handleCreate = async () => {
    if (!name.trim() || !privacyUrl.trim()) {
      setError('Form name and privacy policy URL are required');
      return;
    }
    if (selectedFields.length === 0 && customQuestions.length === 0) {
      setError('Add at least one field');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const presetQuestions = selectedFields.map(key => {
        const preset = FIELD_PRESETS.find(p => p.key === key);
        return { key: preset.key, label: preset.label, type: preset.type };
      });
      const allQuestions = [...presetQuestions, ...customQuestions.map(q => ({ key: q.key, label: q.label, type: 'CUSTOM' }))];
      await api.post('/leads/forms', {
        pageId,
        name: name.trim(),
        questions: JSON.stringify(allQuestions),
        privacy_policy_url: privacyUrl.trim(),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[520px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 className="text-sm font-bold text-slate-800">Create Instant Form</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Form name */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Form Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Summer Promo Lead Form"
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
          </div>

          {/* Privacy policy */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Privacy Policy URL *</label>
            <input value={privacyUrl} onChange={e => setPrivacyUrl(e.target.value)} placeholder="https://yoursite.com/privacy"
              className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
          </div>

          {/* Standard fields */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Standard Fields</label>
            <div className="grid grid-cols-2 gap-1.5">
              {FIELD_PRESETS.map(field => (
                <button key={field.key} onClick={() => toggleField(field.key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-medium border transition-colors text-left
                    ${selectedFields.includes(field.key)
                      ? 'bg-orange-50 text-orange-700 border-orange-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'}`}>
                  <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedFields.includes(field.key) ? 'bg-orange-500 border-orange-500 text-white' : 'border-slate-300'}`}>
                    {selectedFields.includes(field.key) && <span className="text-[10px]">✓</span>}
                  </span>
                  {field.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom questions */}
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Custom Questions</label>
            {customQuestions.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {customQuestions.map(q => (
                  <div key={q.key} className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
                    <MessageSquare size={12} className="text-blue-500 shrink-0" />
                    <span className="text-[12px] text-blue-700 flex-1">{q.label}</span>
                    <button onClick={() => removeCustom(q.key)} className="text-blue-300 hover:text-red-500 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input value={newCustom} onChange={e => setNewCustom(e.target.value)} placeholder="e.g. What service are you interested in?"
                onKeyDown={e => e.key === 'Enter' && addCustomQuestion()}
                className="flex-1 px-3 py-2 text-[12px] rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-slate-300" />
              <button onClick={addCustomQuestion} disabled={!newCustom.trim()}
                className="px-3 py-2 rounded-lg text-[12px] font-medium text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors disabled:opacity-40">
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Preview */}
          {(selectedFields.length > 0 || customQuestions.length > 0) && (
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">
                Preview ({selectedFields.length + customQuestions.length} fields)
              </label>
              <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 space-y-1">
                {selectedFields.map((key, i) => {
                  const preset = FIELD_PRESETS.find(p => p.key === key);
                  return (
                    <div key={key} className="flex items-center gap-2 text-[11px]">
                      <span className="w-4 text-right text-slate-300 font-mono">{i + 1}.</span>
                      <span className="text-slate-600">{preset.label}</span>
                      <span className="text-[9px] text-slate-300 font-mono ml-auto">{preset.type}</span>
                    </div>
                  );
                })}
                {customQuestions.map((q, i) => (
                  <div key={q.key} className="flex items-center gap-2 text-[11px]">
                    <span className="w-4 text-right text-slate-300 font-mono">{selectedFields.length + i + 1}.</span>
                    <span className="text-blue-600">{q.label}</span>
                    <span className="text-[9px] text-slate-300 font-mono ml-auto">CUSTOM</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100 shrink-0">
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Form'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Expandable form row ──
const FormRow = ({ form, expanded, onToggle, onViewLeads, onArchive }) => {
  const questions = form.questions || [];
  return (
    <>
      <tr onClick={onToggle}
        className={`cursor-pointer border-b transition-colors ${expanded ? 'bg-orange-50/40 border-orange-200' : 'border-slate-100 hover:bg-slate-50/80'}`}>
        <td className="py-3 px-4">
          <ChevronDown size={14} className={`text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </td>
        <td className="py-3 px-4">
          <p className="text-[12px] font-semibold text-slate-800">{form.name}</p>
          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{form.id}</p>
        </td>
        <td className="py-3 px-4">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase
            ${form.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
              : form.status === 'ARCHIVED' ? 'bg-slate-100 text-slate-400 border border-slate-200'
              : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${form.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
            {form.status || 'Active'}
          </span>
        </td>
        <td className="py-3 px-4">
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <MessageSquare size={11} className="text-slate-400" />
            {questions.length} field{questions.length !== 1 ? 's' : ''}
          </span>
        </td>
        <td className="py-3 px-4 text-[11px] text-slate-500 whitespace-nowrap">
          {fmtDate(form.created_time)}
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-1.5">
            <button onClick={(e) => { e.stopPropagation(); onViewLeads(form); }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200">
              <Eye size={11} /> Leads
            </button>
            {form.status === 'ACTIVE' && (
              <button onClick={(e) => { e.stopPropagation(); onArchive(form); }}
                className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Archive form">
                <Archive size={11} />
              </button>
            )}
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-orange-50/20 border-b border-orange-100">
          <td colSpan={6} className="px-4 py-4">
            <div className="pl-6">
              <div className="mb-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Form Fields ({questions.length})</p>
                <div className="space-y-1.5">
                  {questions.map((q, i) => (
                    <div key={i} className="flex items-center gap-3 py-1.5 px-3 bg-white rounded-lg border border-slate-200">
                      <span className="w-5 h-5 rounded-md bg-orange-50 flex items-center justify-center shrink-0">
                        <span className="text-[10px] font-bold text-orange-500">{i + 1}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-medium text-slate-700">{q.label || q.key}</p>
                        {q.type && <p className="text-[10px] text-slate-400">{q.type}</p>}
                      </div>
                      {q.key && (
                        <span className="text-[10px] font-mono text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded">{q.key}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
                {form.locale && <span>Locale: {form.locale}</span>}
                {form.privacy_policy_url && (
                  <a href={form.privacy_policy_url} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:underline">Privacy Policy</a>
                )}
                <span className="font-mono">ID: {form.id}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ── Leads viewer modal ──
const LeadsModal = ({ form, pageId, onClose }) => {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!form) return;
    setLoading(true);
    api.get(`/leads/forms/${form.id}/leads`, { params: { pageId } }).then(({ data }) => {
      setLeads(data || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, [form]);

  const exportCSV = () => {
    if (!leads.length) return;
    const allFields = new Set();
    leads.forEach(l => (l.field_data || []).forEach(f => allFields.add(f.name)));
    const headers = ['Date', 'Campaign', 'Ad', ...allFields];
    const rows = leads.map(l => {
      const fieldMap = {};
      (l.field_data || []).forEach(f => { fieldMap[f.name] = (f.values || []).join(', '); });
      return [fmtDateTime(l.created_time), l.campaign_name || '', l.ad_name || '', ...[...allFields].map(f => fieldMap[f] || '')];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${form.name || 'leads'}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const fieldNames = useMemo(() => {
    const s = new Set();
    leads.forEach(l => (l.field_data || []).forEach(f => s.add(f.name)));
    return [...s];
  }, [leads]);

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[750px] max-h-[80vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{form.name}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{leads.length} lead{leads.length !== 1 ? 's' : ''}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={exportCSV} disabled={!leads.length}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors disabled:opacity-40">
              <Download size={12} /> Export CSV
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
              <X size={15} />
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={20} className="animate-spin text-slate-400" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-[13px] text-slate-400">No leads submitted yet</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-50">
                <tr className="border-b border-slate-200">
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase">Date</th>
                  {fieldNames.map(f => (
                    <th key={f} className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase">{f}</th>
                  ))}
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase">Campaign</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, i) => {
                  const fieldMap = {};
                  (lead.field_data || []).forEach(f => { fieldMap[f.name] = (f.values || []).join(', '); });
                  return (
                    <tr key={lead.id || i} className="border-b border-slate-100 hover:bg-blue-50/30">
                      <td className="py-2.5 px-4 text-[11px] text-slate-500 whitespace-nowrap">{fmtDateTime(lead.created_time)}</td>
                      {fieldNames.map(f => (
                        <td key={f} className="py-2.5 px-4 text-[12px] text-slate-700 max-w-[200px] truncate">{fieldMap[f] || '—'}</td>
                      ))}
                      <td className="py-2.5 px-4 text-[11px] text-slate-400 truncate max-w-[150px]">{lead.campaign_name || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
};

// ── Main Component ──
export const InstantForms = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount }) => {
  const [forms, setForms] = useState([]);
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [viewingForm, setViewingForm] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'ACTIVE' | 'ARCHIVED'

  const fetchPages = useCallback(async () => {
    if (!adAccountId) return;
    try {
      const { data } = await api.get('/meta/pages');
      setPages(data || []);
      if (data?.length) setSelectedPage(data[0]);
    } catch (err) {
      console.error('Failed to fetch pages:', err);
    }
  }, [adAccountId]);

  const fetchForms = useCallback(async () => {
    if (!selectedPage) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/leads/forms', { params: { pageId: selectedPage.id } });
      setForms(data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPage]);

  useEffect(() => { fetchPages(); }, [fetchPages]);
  useEffect(() => { fetchForms(); }, [fetchForms]);

  const handleArchive = useCallback(async () => {
    if (!archiveTarget) return;
    setArchiving(true);
    try {
      await api.post(`/leads/forms/${archiveTarget.id}/archive`, { pageId: selectedPage?.id });
      setForms(prev => prev.map(f => f.id === archiveTarget.id ? { ...f, status: 'ARCHIVED' } : f));
      setArchiveTarget(null);
    } catch (err) {
      console.error('Archive failed:', err);
    } finally {
      setArchiving(false);
    }
  }, [archiveTarget, selectedPage]);

  const filtered = useMemo(() => {
    let list = forms;
    if (statusFilter !== 'all') list = list.filter(f => f.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(f => f.name?.toLowerCase().includes(q));
    }
    return list;
  }, [forms, search, statusFilter]);

  const activeCount = forms.filter(f => f.status === 'ACTIVE').length;
  const archivedCount = forms.filter(f => f.status === 'ARCHIVED').length;

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50/50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shrink-0">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText size={20} className="text-orange-500" />
                Instant Forms
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : `${forms.length} forms · ${activeCount} active`}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowCreate(true)} disabled={!selectedPage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors disabled:opacity-50">
              <Plus size={13} /> New Form
            </button>
            <button onClick={fetchForms} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 flex items-center gap-3 shrink-0 bg-white border-b border-slate-100">
        {pages.length > 0 && (
          <select value={selectedPage?.id || ''} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value))}
            className="text-[12px] font-medium text-slate-700 border border-slate-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        )}
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search forms..."
            className="w-full pl-9 pr-3 py-2 text-[12px] rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 placeholder:text-slate-300" />
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          {[['all', `All (${forms.length})`], ['ACTIVE', `Active (${activeCount})`], ['ARCHIVED', `Archived (${archivedCount})`]].map(([val, label]) => (
            <button key={val} onClick={() => setStatusFilter(val)}
              className={`px-3 py-2 text-[11px] font-medium transition-colors ${statusFilter === val ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {!token || !adAccountId ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">{!token ? 'Connect an ad platform' : 'Select an ad account'}</p>
            <p className="text-xs text-slate-400">Use the account selector above to get started.</p>
          </div>
        ) : loading && forms.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
            <span className="ml-2 text-sm text-slate-400">Loading forms...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <FileText size={28} className="text-slate-300" />
            </div>
            <p className="text-sm font-semibold text-slate-700 mb-1">{search ? 'No matching forms' : 'No instant forms yet'}</p>
            <p className="text-xs text-slate-400 mb-4">Create lead forms to capture leads from your ads.</p>
            {!search && (
              <button onClick={() => setShowCreate(true)} disabled={!selectedPage}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 transition-colors">
                <Plus size={13} /> Create First Form
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="py-2.5 px-4 w-8"></th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Form Name</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fields</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created</th>
                  <th className="py-2.5 px-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(form => (
                  <FormRow
                    key={form.id}
                    form={form}
                    expanded={expandedId === form.id}
                    onToggle={() => setExpandedId(prev => prev === form.id ? null : form.id)}
                    onViewLeads={setViewingForm}
                    onArchive={setArchiveTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {viewingForm && <LeadsModal form={viewingForm} pageId={selectedPage?.id} onClose={() => setViewingForm(null)} />}
      {showCreate && selectedPage && <CreateFormModal pageId={selectedPage.id} onClose={() => setShowCreate(false)} onCreated={fetchForms} />}

      {/* Archive confirmation */}
      {archiveTarget && (
        <>
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={() => setArchiveTarget(null)} />
          <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[380px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Archive "{archiveTarget.name}"?</h3>
              </div>
              <p className="text-xs text-slate-500">Archived forms can no longer collect new leads. Existing leads are kept. This cannot be undone via the API.</p>
            </div>
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
              <button onClick={() => setArchiveTarget(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
              <button onClick={handleArchive} disabled={archiving}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50">
                {archiving ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
