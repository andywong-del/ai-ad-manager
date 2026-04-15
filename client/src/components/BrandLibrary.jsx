import { useState, useCallback, useRef, useEffect } from 'react';
import { Search, RefreshCw, Plus, Loader2, X, FileText, Palette, MessageSquare, Sparkles, Globe, BookMarked, Trash2, ChevronDown, Edit3, Check, Upload, Link2, Users } from 'lucide-react';
import { AccountSelector } from './AccountSelector.jsx';
import { AskAIButton, AskAIPopup } from './AskAIPopup.jsx';
import { useBrandLibrary } from '../hooks/useBrandLibrary.js';
import api from '../services/api.js';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';

// ── Type config ──
const ITEM_TYPES = {
  guidelines: { label: 'Guidelines', color: 'bg-blue-50 text-blue-600 border-blue-200', icon: FileText },
  tone: { label: 'Tone', color: 'bg-violet-50 text-violet-600 border-violet-200', icon: MessageSquare },
  visual: { label: 'Visual', color: 'bg-pink-50 text-pink-600 border-pink-200', icon: Palette },
  content: { label: 'Content', color: 'bg-emerald-50 text-emerald-600 border-emerald-200', icon: Sparkles },
  crawled: { label: 'Crawled', color: 'bg-amber-50 text-amber-600 border-amber-200', icon: Globe },
};

const TypeBadge = ({ type }) => {
  const cfg = ITEM_TYPES[type] || ITEM_TYPES.guidelines;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border ${cfg.color}`}>
      <cfg.icon size={9} /> {cfg.label}
    </span>
  );
};

// ── Add Dropdown ──
const AddDropdown = ({ open, onClose, onSelect }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;
  const options = [
    { id: 'write', icon: <FileText size={16} className="text-blue-500" />, label: 'Write Guidelines', desc: 'Type brand guidelines manually' },
    { id: 'upload', icon: <Upload size={16} className="text-emerald-500" />, label: 'Upload Document', desc: 'Upload PDF or TXT file' },
    { id: 'crawl-url', icon: <Globe size={16} className="text-amber-500" />, label: 'Crawl Website', desc: 'AI extracts brand info from URL' },
    { id: 'crawl-social', icon: <Users size={16} className="text-violet-500" />, label: 'Crawl Social Profile', desc: 'Analyze your Meta page posts' },
  ];
  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-1.5">
      {options.map(opt => (
        <button key={opt.id} onClick={() => { onSelect(opt.id); onClose(); }}
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left">
          <div className="mt-0.5 shrink-0">{opt.icon}</div>
          <div>
            <p className="text-[13px] font-medium text-slate-800">{opt.label}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

// ── Write/Edit Modal ──
const WriteModal = ({ item, onClose, onSave }) => {
  const [name, setName] = useState(item?.name || '');
  const [type, setType] = useState(item?.type || 'guidelines');
  const [content, setContent] = useState(item?.content || '');
  const [saving, setSaving] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  const handleSave = async () => {
    if (!name.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), type, content: content.trim(), metadata: item?.metadata || {} });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <h3 className="text-sm font-bold text-white">{item?.id ? 'Edit Item' : 'Add Brand Guidelines'}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Name</label>
            <input ref={nameRef} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. TopGlow Brand Voice"
              className="w-full text-sm text-slate-700 border border-slate-200/80 rounded-xl px-3 py-2.5 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Type</label>
            <div className="flex gap-2">
              {Object.entries(ITEM_TYPES).filter(([k]) => k !== 'crawled').map(([key, cfg]) => (
                <button key={key} onClick={() => setType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border transition-colors
                    ${type === key ? `${cfg.color} border-current` : 'text-slate-400 border-slate-200 hover:border-slate-300'}`}>
                  <cfg.icon size={12} /> {cfg.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Content</label>
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Paste or type your brand guidelines, tone of voice, key messages..."
              className="w-full h-[240px] text-[12px] text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 resize-none font-mono" />
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !content.trim() || saving}
            className="px-5 py-2 text-[12px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 rounded-lg font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-40 transition-all">
            {saving ? 'Saving...' : item?.id ? 'Update' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};

// ── Crawl URL Modal ──
const CrawlUrlModal = ({ onClose, onSave, crawlUrl }) => {
  const [url, setUrl] = useState('');
  const [crawling, setCrawling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCrawl = async () => {
    if (!url.trim()) return;
    setCrawling(true);
    setError(null);
    try {
      const data = await crawlUrl(url.trim());
      setResult(data);
    } catch (err) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally {
      setCrawling(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await onSave({ name: result.name, type: 'crawled', content: result.content, metadata: result.metadata || { source_url: url } });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-amber-400" />
            <h3 className="text-sm font-bold text-white">Crawl Website</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="flex gap-2">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourbrand.com/about"
              onKeyDown={e => e.key === 'Enter' && handleCrawl()}
              className="flex-1 text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 placeholder:text-slate-300" />
            <button onClick={handleCrawl} disabled={!url.trim() || crawling}
              className="px-4 py-2.5 rounded-lg text-[12px] font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-40 shrink-0">
              {crawling ? <Loader2 size={14} className="animate-spin" /> : 'Crawl'}
            </button>
          </div>
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
          {result && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                <span className="text-[12px] text-emerald-700 font-medium">AI extracted brand info from {url}</span>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Brand Name</label>
                <p className="text-sm font-semibold text-slate-800">{result.name}</p>
              </div>
              {result.description && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Summary</label>
                  <p className="text-[12px] text-slate-600">{result.description}</p>
                </div>
              )}
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Extracted Content</label>
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-h-[200px] overflow-auto whitespace-pre-wrap leading-relaxed">
                  {result.content}
                </div>
              </div>
              {result.metadata?.colors?.length > 0 && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Colors Found</label>
                  <div className="flex gap-1.5">
                    {result.metadata.colors.map((c, i) => (
                      <div key={i} className="w-7 h-7 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: c }} title={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        {result && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-[12px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 rounded-lg font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-40 transition-all">
              {saving ? 'Saving...' : 'Save to Brand Library'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Crawl Social Modal ──
const CrawlSocialModal = ({ onClose, onSave, crawlSocial, token }) => {
  const [pages, setPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loadingPages, setLoadingPages] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/meta/pages').then(({ data }) => {
      setPages(data || []);
      if (data?.length) setSelectedPage(data[0]);
    }).catch(() => {}).finally(() => setLoadingPages(false));
  }, []);

  const handleCrawl = async () => {
    if (!selectedPage) return;
    setCrawling(true);
    setError(null);
    try {
      const data = await crawlSocial(selectedPage.id);
      setResult(data);
    } catch (err) {
      setError(typeof err.response?.data?.error === 'string' ? err.response.data.error : err.response?.data?.error?.message || err.message);
    } finally {
      setCrawling(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await onSave({ name: result.name, type: 'crawled', content: result.content, metadata: result.metadata || {} });
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-md z-40 animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[560px] max-h-[85vh] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-[fadeSlideUp_0.3s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-violet-400" />
            <h3 className="text-sm font-bold text-white">Crawl Social Profile</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center text-slate-400"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loadingPages ? (
            <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : pages.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No connected pages found</p>
          ) : (
            <>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Select Page</label>
                <select value={selectedPage?.id || ''} onChange={e => setSelectedPage(pages.find(p => p.id === e.target.value))}
                  className="w-full text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300">
                  {pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <button onClick={handleCrawl} disabled={!selectedPage || crawling}
                className="w-full py-2.5 rounded-lg text-[12px] font-semibold text-white bg-violet-600 hover:bg-violet-500 transition-colors disabled:opacity-40">
                {crawling ? <><Loader2 size={13} className="inline animate-spin mr-1" /> Analyzing posts...</> : 'Analyze Page'}
              </button>
            </>
          )}
          {error && <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">{error}</div>}
          {result && (
            <div className="space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <Check size={14} className="text-emerald-500" />
                <span className="text-[12px] text-emerald-700 font-medium">Brand analysis complete for {result.name}</span>
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Extracted Content</label>
                <div className="text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 max-h-[200px] overflow-auto whitespace-pre-wrap leading-relaxed">
                  {result.content}
                </div>
              </div>
            </div>
          )}
        </div>
        {result && (
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
            <button onClick={onClose} className="px-4 py-2 text-[12px] text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-[12px] text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:brightness-110 rounded-lg font-semibold shadow-lg shadow-orange-500/30 disabled:opacity-40 transition-all">
              {saving ? 'Saving...' : 'Save to Brand Library'}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

// ── Item Detail Panel ──
const ItemDetailPanel = ({ item, onClose, onUpdate, onDelete, onToggle }) => {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(item.content || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setContent(item.content || ''); setEditing(false); }, [item.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(item.id, { content });
      setEditing(false);
    } catch {} finally { setSaving(false); }
  };

  const cfg = ITEM_TYPES[item.type] || ITEM_TYPES.guidelines;

  return (
    <div className="flex-1 overflow-auto bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h2 className="text-[16px] font-bold text-slate-800">{item.name}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            <TypeBadge type={item.type} />
            <span className="text-[11px] text-slate-400">{fmtDate(item.created_at)}</span>
            {item.metadata?.source_url && (
              <a href={item.metadata.source_url} target="_blank" rel="noopener noreferrer"
                className="text-[11px] text-blue-500 hover:underline truncate max-w-[200px]">
                {item.metadata.source_url}
              </a>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onToggle(item.id, !item.enabled)}
            className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${item.enabled ? 'bg-orange-500' : 'bg-slate-200'}`}>
            <span className={`absolute top-[3px] left-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${item.enabled ? 'translate-x-[18px]' : ''}`} />
          </button>
          <button onClick={() => onDelete(item.id)}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
            <Trash2 size={14} />
          </button>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-400">
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Color swatches */}
      {item.metadata?.colors?.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 p-4 mb-4">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Brand Colors</h3>
          <div className="flex gap-2">
            {item.metadata.colors.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: c }} />
                <span className="text-[9px] font-mono text-slate-400">{c}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Content</h3>
          <button onClick={() => editing ? handleSave() : setEditing(true)}
            className="flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-600">
            {editing ? (saving ? <><Loader2 size={10} className="animate-spin" /> Saving...</> : <><Check size={10} /> Save</>) : <><Edit3 size={10} /> Edit</>}
          </button>
        </div>
        <div className="p-4">
          {editing ? (
            <textarea value={content} onChange={e => setContent(e.target.value)}
              className="w-full h-[300px] text-[12px] text-slate-700 font-mono border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none" />
          ) : (
            <div className="text-[12px] text-slate-600 leading-relaxed whitespace-pre-wrap">
              {item.content || <span className="text-slate-300 italic">No content</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Brand Memory Card (skills-style) ──
const BrandMemoryCard = ({ item, onView, onToggle, onDelete }) => {
  const cfg = ITEM_TYPES[item.type] || ITEM_TYPES.guidelines;
  const preview = (item.content || '').slice(0, 120);
  const source = item.metadata?.source === 'chat' ? 'From Chat' : item.metadata?.source_url ? 'Crawled' : item.metadata?.source_file ? 'Uploaded' : 'Manual';

  return (
    <div onClick={onView}
      className={`relative bg-white/80 backdrop-blur-sm rounded-2xl border p-5 flex flex-col gap-3 group hover:border-orange-200/60 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${item.enabled ? 'border-slate-200/80' : 'border-slate-200/50 opacity-60'}`}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/[0.02] via-transparent to-amber-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top: name + toggle */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-bold text-slate-800 truncate group-hover:text-orange-700 transition-colors">{item.name}</h3>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onToggle(); }}
          className={`relative w-9 h-[20px] rounded-full shrink-0 transition-all duration-300 ${item.enabled ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-sm shadow-orange-500/30' : 'bg-slate-200'}`}>
          <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${item.enabled ? 'left-[18px]' : 'left-[2px]'}`} />
        </button>
      </div>

      {/* Content preview */}
      <p className="relative text-[11px] text-slate-500 leading-relaxed line-clamp-3 min-h-[44px]">
        {preview || <span className="italic text-slate-300">No content</span>}
      </p>

      {/* Bottom: type badge + source + date + delete */}
      <div className="relative flex items-center gap-2 mt-auto pt-1">
        <TypeBadge type={item.type} />
        <span className="text-[10px] text-slate-400 flex items-center gap-1">
          {source}
        </span>
        <span className="text-[10px] text-slate-300 ml-auto">
          {fmtDate(item.updated_at || item.created_at)}
        </span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all shrink-0">
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

// ── Main Component ──
export const BrandLibrary = ({ adAccountId, token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount, onSendToChat, onPrefillChat }) => {
  const { items, loading, error, enabledCount, fetchItems, createItem, updateItem, deleteItem, toggleItem, crawlUrl, crawlSocial } = useBrandLibrary(adAccountId);
  const [showAskAI, setShowAskAI] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [showWrite, setShowWrite] = useState(false);
  const [showCrawlUrl, setShowCrawlUrl] = useState(false);
  const [showCrawlSocial, setShowCrawlSocial] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const fileRef = useRef(null);

  const filtered = items.filter(item => {
    if (search && !item.name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && item.type !== typeFilter) return false;
    return true;
  });

  // Group: enabled first, then disabled
  const enabledItems = filtered.filter(i => i.enabled);
  const disabledItems = filtered.filter(i => !i.enabled);

  // Type counts for filter pills
  const typeCounts = items.reduce((acc, i) => { acc[i.type] = (acc[i.type] || 0) + 1; return acc; }, {});

  const handleAddSelect = (type) => {
    switch (type) {
      case 'write': setShowWrite(true); break;
      case 'upload': fileRef.current?.click(); break;
      case 'crawl-url': setShowCrawlUrl(true); break;
      case 'crawl-social': setShowCrawlSocial(true); break;
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      if (!text.trim()) return;
      await createItem({
        name: file.name.replace(/\.(pdf|txt|md|doc|docx)$/i, ''),
        type: 'guidelines',
        content: text.slice(0, 50000),
        metadata: { source_file: file.name },
      });
    } catch (err) {
      console.error('Upload failed:', err);
    }
    e.target.value = '';
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this brand item?')) return;
    await deleteItem(id);
    if (selectedItem?.id === id) setSelectedItem(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40">
      <input ref={fileRef} type="file" accept=".txt,.md,.pdf,.doc,.docx" onChange={handleFileUpload} className="hidden" />

      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" /><div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" /></div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2">
                Brand Memory
                {enabledCount > 0 && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {enabledCount} active in AI memory
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {loading ? 'Loading...' : 'Long-term brand memory for AI \u2014 auto-applied to all conversations'}
              </p>
            </div>
            <AccountSelector token={token} onLogin={onLogin} onLogout={onLogout}
              selectedAccount={selectedAccount} selectedBusiness={selectedBusiness} onSelectAccount={onSelectAccount} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onPrefillChat?.('Help me set up my brand library — add brand voice, target audience, and key messaging guidelines.')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50">
              <Sparkles size={13} /> Create with AI
            </button>
            <button onClick={fetchItems} disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* Search + Type filter */}
      <div className="px-6 py-3 shrink-0 bg-white border-b border-slate-100 flex items-center gap-3">
        <div className="relative max-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
            className="w-full pl-9 pr-3 py-1.5 text-[11px] rounded-lg border border-slate-200/80 bg-white/80 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300" />
        </div>
        <div className="flex rounded-md border border-slate-200 bg-white overflow-hidden">
          <button onClick={() => setTypeFilter('all')}
            className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${typeFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
            All ({items.length})
          </button>
          {Object.entries(ITEM_TYPES).map(([key, cfg]) => {
            const count = typeCounts[key] || 0;
            if (count === 0) return null;
            return (
              <button key={key} onClick={() => setTypeFilter(typeFilter === key ? 'all' : key)}
                className={`px-2.5 py-1.5 text-[10px] font-medium transition-colors ${typeFilter === key ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {error && <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Content — card grid like skills */}
      <div className="flex-1 overflow-auto px-6 py-5">
        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : filtered.length === 0 && !search ? (
          /* Demo cards when no items exist */
          <div>
            <div className="text-center mb-6">
              <p className="text-sm font-semibold text-slate-700 mb-1">No brand memory yet for this account</p>
              <p className="text-[11px] text-slate-400">Save insights from chat conversations or click "Create with AI" to get started. Here's what it looks like:</p>
            </div>
            <h3 className="text-[10px] font-bold text-slate-300 uppercase tracking-wider mb-3">Demo Preview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-50 pointer-events-none select-none">
              {[
                { id: 'd1', name: 'Brand Voice & Tone', type: 'tone', enabled: true, content: 'We speak with confidence and warmth. Our tone is professional yet approachable — like a trusted friend who happens to be an expert. Avoid jargon. Use short, punchy sentences.', metadata: { source: 'chat' }, created_at: '2026-04-10' },
                { id: 'd2', name: 'Target Audience Profile', type: 'guidelines', enabled: true, content: 'Primary: Women 25-45, health-conscious, mid-to-high income. Interested in skincare, wellness, and beauty treatments. Values quality over price. Active on Instagram and Facebook.', metadata: { source: 'chat' }, created_at: '2026-04-08' },
                { id: 'd3', name: 'Dr.Once Product Messaging', type: 'content', enabled: true, content: 'Key messages: Medical-grade ingredients, salon results at home, clinically tested. Hero product: Anti-hair loss shampoo with DDS nano technology. Price point: $138/bottle.', metadata: { source_url: 'https://dr-once.com' }, created_at: '2026-04-05' },
                { id: 'd4', name: 'Visual Identity', type: 'visual', enabled: true, content: 'Primary colors: Deep blue (#1a365d), Gold (#d69e2e). Typography: Clean sans-serif. Photography: Bright, clinical, aspirational. Product shots on white/light blue backgrounds.', metadata: { source: 'chat' }, created_at: '2026-04-03' },
                { id: 'd5', name: 'Competitor Positioning', type: 'guidelines', enabled: false, content: 'vs. Generic shampoos: We are medical-grade, not mass-market. vs. Salon treatments: Same results, fraction of the cost, use at home. Never mention competitors by name.', metadata: { source: 'chat' }, created_at: '2026-03-28' },
                { id: 'd6', name: 'TopBeauty Page Insights', type: 'crawled', enabled: true, content: 'Brand personality: Fun, trendy, youth-oriented. Content style: Before/after transformations, KOL reviews, limited-time offers. High engagement on video content with personal stories.', metadata: { source_url: 'https://facebook.com/topbeauty' }, created_at: '2026-03-25' },
              ].map(demo => (
                <BrandMemoryCard key={demo.id} item={demo} onView={() => {}} onToggle={() => {}} onDelete={() => {}} />
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <p className="text-sm font-semibold text-slate-700 mb-1">No matches</p>
            <p className="text-[11px] text-slate-400">Try a different search or filter.</p>
          </div>
        ) : (
          <>
            {/* Active in AI memory */}
            {enabledItems.length > 0 && (
              <div className="mb-6">
                <h3 className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active in AI Memory ({enabledItems.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {enabledItems.map(item => (
                    <BrandMemoryCard key={item.id} item={item} onView={() => setSelectedItem(item)}
                      onToggle={() => toggleItem(item.id, false)} onDelete={() => handleDelete(item.id)} />
                  ))}
                </div>
              </div>
            )}
            {/* Disabled */}
            {disabledItems.length > 0 && (
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                  Disabled ({disabledItems.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {disabledItems.map(item => (
                    <BrandMemoryCard key={item.id} item={item} onView={() => setSelectedItem(item)}
                      onToggle={() => toggleItem(item.id, true)} onDelete={() => handleDelete(item.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail modal */}
      {selectedItem && (
        <>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setSelectedItem(null)} />
          <div className="fixed inset-8 z-50 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-2xl w-full max-h-full flex flex-col">
              <ItemDetailPanel
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onUpdate={async (id, updates) => { await updateItem(id, updates); setSelectedItem(prev => ({ ...prev, ...updates })); }}
                onDelete={handleDelete}
                onToggle={async (id, enabled) => { await toggleItem(id, enabled); setSelectedItem(prev => ({ ...prev, enabled })); }}
              />
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      {showWrite && <WriteModal onClose={() => setShowWrite(false)} onSave={createItem} />}
      {editingItem && <WriteModal item={editingItem} onClose={() => setEditingItem(null)} onSave={(data) => updateItem(editingItem.id, data)} />}
      {showCrawlUrl && <CrawlUrlModal onClose={() => setShowCrawlUrl(false)} onSave={createItem} crawlUrl={crawlUrl} />}
      {showCrawlSocial && <CrawlSocialModal onClose={() => setShowCrawlSocial(false)} onSave={createItem} crawlSocial={crawlSocial} token={token} />}
    </div>
  );
};
