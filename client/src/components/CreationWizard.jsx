import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { CheckCircle2, Target, DollarSign, Globe, Users, Image, Film, Upload, Sparkles, Link, X, Plus, LayoutGrid, Layers, GripVertical, Megaphone, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react';

// ── File validation ──────────────────────────────────────────────────────────
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const MAX_IMAGE_MB = 30;
const MAX_VIDEO_MB = 4096;

const validateFiles = (files) => {
  const rejected = [];
  const valid = [];
  for (const file of files) {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const sizeMB = file.size / (1024 * 1024);
    if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
      rejected.push(`${file.name}: unsupported format (use JPG, PNG, WebP, or GIF)`);
    } else if (isImage && sizeMB > MAX_IMAGE_MB) {
      rejected.push(`${file.name}: too large (${sizeMB.toFixed(1)}MB, max ${MAX_IMAGE_MB}MB)`);
    } else if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
      rejected.push(`${file.name}: unsupported format (use MP4, MOV, AVI, or MKV)`);
    } else if (isVideo && sizeMB > MAX_VIDEO_MB) {
      rejected.push(`${file.name}: too large (${(sizeMB / 1024).toFixed(1)}GB, max 4GB)`);
    } else if (isImage || isVideo) {
      valid.push(file);
    } else {
      rejected.push(`${file.name}: unsupported file type`);
    }
  }
  return { valid, rejected };
};

// ── Constants ────────────────────────────────────────────────────────────────
const OBJECTIVES = [
  { id: 'OUTCOME_SALES', label: 'Sales', icon: '💰' },
  { id: 'OUTCOME_LEADS', label: 'Leads', icon: '📋' },
  { id: 'OUTCOME_TRAFFIC', label: 'Traffic', icon: '🔗' },
  { id: 'OUTCOME_AWARENESS', label: 'Awareness', icon: '📢' },
  { id: 'OUTCOME_ENGAGEMENT', label: 'Engagement', icon: '❤️' },
];

const DESTINATIONS = [
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'website', label: 'Website' },
  { id: 'lead_form', label: 'Lead Form' },
  { id: 'messenger', label: 'Messenger' },
  { id: 'instagram', label: 'Instagram DM' },
];

const CTA_TYPES = [
  { id: 'LEARN_MORE', label: 'Learn More' },
  { id: 'SHOP_NOW', label: 'Shop Now' },
  { id: 'WHATSAPP_MESSAGE', label: 'WhatsApp' },
  { id: 'SIGN_UP', label: 'Sign Up' },
  { id: 'CONTACT_US', label: 'Contact Us' },
  { id: 'GET_QUOTE', label: 'Get Quote' },
  { id: 'BOOK_NOW', label: 'Book Now' },
];

const COUNTRIES = [
  { id: 'HK', label: '🇭🇰 Hong Kong' }, { id: 'TW', label: '🇹🇼 Taiwan' }, { id: 'SG', label: '🇸🇬 Singapore' },
  { id: 'MY', label: '🇲🇾 Malaysia' }, { id: 'JP', label: '🇯🇵 Japan' }, { id: 'US', label: '🇺🇸 United States' },
  { id: 'GB', label: '🇬🇧 United Kingdom' }, { id: 'AU', label: '🇦🇺 Australia' }, { id: 'TH', label: '🇹🇭 Thailand' },
  { id: 'PH', label: '🇵🇭 Philippines' }, { id: 'ID', label: '🇮🇩 Indonesia' }, { id: 'VN', label: '🇻🇳 Vietnam' },
  { id: 'KR', label: '🇰🇷 South Korea' }, { id: 'CA', label: '🇨🇦 Canada' },
];

// ── Shared UI atoms ──────────────────────────────────────────────────────────
const SectionLabel = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-2 mb-2 mt-1">
    {Icon && <Icon size={13} className="text-slate-400" />}
    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
  </div>
);

const Chip = ({ selected, onClick, children }) => (
  <button onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all
      ${selected ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm' : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>
    {children}
  </button>
);

const Divider = () => <div className="border-t border-slate-100 my-1" />;

// ── Progress Bar (shows after user confirms) ─────────────────────────────────
const PIPELINE_STEPS = ['Campaign', 'Ad Set', 'Creative', 'Ad'];

const PipelineProgress = ({ step, summary }) => {
  // Map creationStep.current (1-3) to pipeline progress
  const phase = step?.current || 0;
  // phase 1 = campaign+adset being created, phase 2 = creative, phase 3 = ad/review
  const completedSteps = phase === 1 ? 0 : phase === 2 ? 2 : phase >= 3 ? 3 : 0;

  return (
    <div className="bg-white border-b border-slate-200 px-5 py-3">
      <div className="flex items-center gap-1.5">
        <Loader2 size={14} className="text-blue-500 animate-spin" />
        <span className="text-[12px] font-semibold text-slate-600">Creating your ad...</span>
      </div>
      <div className="flex items-center gap-1 mt-2.5">
        {PIPELINE_STEPS.map((label, i) => {
          const done = i < completedSteps;
          const active = i === completedSteps;
          return (
            <React.Fragment key={label}>
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border transition-all
                  ${done ? 'border-emerald-400 bg-emerald-50 text-emerald-600' : active ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 bg-white text-slate-300'}`}>
                  {done ? <CheckCircle2 size={11} /> : i + 1}
                </div>
                <span className={`text-[11px] font-medium ${done ? 'text-emerald-600' : active ? 'text-blue-600' : 'text-slate-300'}`}>{label}</span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div className={`flex-1 h-px min-w-[12px] ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {summary?.phase1 && (
        <p className="text-[10px] text-slate-400 mt-1.5">
          Campaign #{summary.phase1.campaign_id?.slice(-6)} · Ad Set #{summary.phase1.adset_id?.slice(-6)}
        </p>
      )}
    </div>
  );
};

// ── Carousel Card Editor ─────────────────────────────────────────────────────
const CarouselEditor = ({ files, cards, onChange }) => {
  const moveCard = (fromIdx, toIdx) => {
    if (toIdx < 0 || toIdx >= cards.length) return;
    const updated = [...cards];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    onChange(updated);
  };
  const updateCard = (idx, field, value) => {
    onChange(cards.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };

  return (
    <div className="space-y-2 max-h-[200px] overflow-y-auto">
      {cards.map((card, i) => {
        const file = files[i];
        return (
          <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex flex-col items-center gap-0.5 pt-1">
              <button onClick={() => moveCard(i, i - 1)} disabled={i === 0} className="text-slate-400 hover:text-slate-600 disabled:opacity-20"><ChevronRight size={10} className="-rotate-90" /></button>
              <GripVertical size={10} className="text-slate-300" />
              <button onClick={() => moveCard(i, i + 1)} disabled={i === cards.length - 1} className="text-slate-400 hover:text-slate-600 disabled:opacity-20"><ChevronRight size={10} className="rotate-90" /></button>
            </div>
            {file?.preview ? (
              <img src={file.preview} alt="" className="w-11 h-11 rounded-lg object-cover border border-slate-200 shrink-0" />
            ) : (
              <div className="w-11 h-11 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0"><span className="text-[9px] text-slate-400">#{i + 1}</span></div>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <input type="text" placeholder={`Headline ${i + 1}`} value={card.headline} onChange={e => updateCard(i, 'headline', e.target.value)}
                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white focus:border-blue-400 outline-none" />
              <input type="url" placeholder="Link (optional)" value={card.url} onChange={e => updateCard(i, 'url', e.target.value)}
                className="w-full px-2 py-1 text-[11px] border border-slate-200 rounded-lg bg-white focus:border-blue-400 outline-none" />
            </div>
          </div>
        );
      })}
    </div>
  );
};


// ═════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD — single form card
// ═════════════════════════════════════════════════════════════════════════════
export const CreationWizard = ({ step, summary = {}, audiences = [], onSend, onUploadFiles, preUploadedFiles = [] }) => {
  const [submitted, setSubmitted] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [localFiles, setLocalFiles] = useState([]);

  const allFiles = useMemo(() => [...preUploadedFiles, ...localFiles], [preUploadedFiles, localFiles]);
  const imageFiles = useMemo(() => allFiles.filter(f => !f.type?.startsWith('video')), [allFiles]);
  const hasMultipleImages = imageFiles.length >= 2 && imageFiles.length <= 10;
  const hasFiles = allFiles.length > 0;

  // Form state
  const [objective, setObjective] = useState(null);
  const [destination, setDestination] = useState(null);
  const [destinationUrl, setDestinationUrl] = useState('');
  const [country, setCountry] = useState('HK');
  const [budget, setBudget] = useState(200);
  const [adFormat, setAdFormat] = useState('separate');
  const [selectedAudience, setSelectedAudience] = useState('broad');
  const [cta, setCta] = useState('LEARN_MORE');
  const [landingPage, setLandingPage] = useState('');
  const [carouselCards, setCarouselCards] = useState([]);
  const [boostPostId, setBoostPostId] = useState('');

  // Auto-set CTA based on destination
  useEffect(() => {
    if (destination === 'whatsapp') setCta('WHATSAPP_MESSAGE');
    else if (destination === 'website') setCta('LEARN_MORE');
    else if (destination === 'lead_form') setCta('SIGN_UP');
  }, [destination]);

  // Init carousel cards
  useEffect(() => {
    if (adFormat === 'carousel' && imageFiles.length > 0) {
      setCarouselCards(prev => {
        if (prev.length === imageFiles.length) return prev;
        return imageFiles.map((_, i) => prev[i] || { headline: '', url: '' });
      });
    }
  }, [adFormat, imageFiles.length]);

  // ── File handlers ─────────────────────────────────────────────────────────
  const processFiles = useCallback((rawFiles) => {
    const { valid, rejected } = validateFiles(rawFiles);
    if (rejected.length) { setFileError(rejected.join('\n')); setTimeout(() => setFileError(null), 6000); }
    if (valid.length) {
      setLocalFiles(prev => [...prev, ...valid.map(f => ({ name: f.name, type: f.type, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null, _raw: f }))]);
      onUploadFiles?.(valid);
    }
  }, [onUploadFiles]);

  const handleDrop = useCallback((e) => { e.preventDefault(); const f = Array.from(e.dataTransfer?.files || []); if (f.length) processFiles(f); }, [processFiles]);
  const handleFileSelect = useCallback((e) => { const f = Array.from(e.target.files || []); if (f.length) processFiles(f); e.target.value = ''; }, [processFiles]);
  const removeFile = useCallback((idx) => { const li = idx - preUploadedFiles.length; if (li >= 0) setLocalFiles(prev => prev.filter((_, i) => i !== li)); }, [preUploadedFiles.length]);

  const needsDestination = objective && ['OUTCOME_SALES', 'OUTCOME_LEADS', 'OUTCOME_TRAFFIC'].includes(objective);

  // ── Submit everything at once ─────────────────────────────────────────────
  const handleSubmit = useCallback(() => {
    const parts = [];
    const obj = OBJECTIVES.find(o => o.id === objective);
    parts.push(`Create a ${obj?.label || objective} campaign`);
    if (destination) parts.push(`destination: ${destination}`);
    if (destinationUrl) parts.push(`URL: ${destinationUrl}`);
    parts.push(`country: ${country}, daily budget: HKD ${budget}`);
    if (hasMultipleImages) parts.push(`format: ${adFormat === 'carousel' ? 'Carousel' : imageFiles.length + ' Separate Ads'}`);

    // Audience
    if (selectedAudience === 'broad') parts.push('audience: broad targeting');
    else if (selectedAudience === 'new') parts.push('audience: create new');
    else { const a = audiences.find(a => a.id === selectedAudience); parts.push(`audience: ${a?.name || selectedAudience}`); }

    // Creative
    if (cta) parts.push(`CTA: ${cta}`);
    if (landingPage) parts.push(`landing page: ${landingPage}`);
    const fileRefs = allFiles.map(f => f.image_hash ? `[image: ${f.name}, hash: ${f.image_hash}]` : f.video_id ? `[video: ${f.name}, id: ${f.video_id}]` : `[file: ${f.name}]`);
    if (fileRefs.length) parts.push(`creatives: ${fileRefs.join(', ')}`);
    if (adFormat === 'carousel' && carouselCards.length) {
      parts.push(`carousel: ${carouselCards.map((c, i) => `Card ${i + 1}: "${c.headline || 'untitled'}"${c.url ? ` → ${c.url}` : ''}`).join('; ')}`);
    }

    parts.push('— Go ahead and create everything.');
    setSubmitted(true);
    onSend?.(parts.join(', '));
  }, [objective, destination, destinationUrl, country, budget, adFormat, hasMultipleImages, imageFiles.length, selectedAudience, audiences, cta, landingPage, allFiles, carouselCards, onSend]);

  const handleBoost = useCallback(() => {
    setSubmitted(true);
    onSend?.(`Boost post ${boostPostId}, country: ${country}, daily budget: HKD ${budget}`);
  }, [boostPostId, country, budget, onSend]);

  const canSubmit = objective && (!needsDestination || destination) && (hasFiles || !hasFiles); // files optional for guided

  // ── After submit: show pipeline progress ──────────────────────────────────
  if (submitted) {
    return <PipelineProgress step={step} summary={summary} />;
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm max-h-[75vh] overflow-y-auto relative">

      {/* File error toast */}
      {fileError && (
        <div className="sticky top-0 z-20 px-4 py-2">
          <div className="bg-red-50 border border-red-200 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-red-700 mb-0.5">File not supported</p>
              {fileError.split('\n').map((line, i) => <p key={i} className="text-[10px] text-red-600">{line}</p>)}
            </div>
            <button onClick={() => setFileError(null)} className="text-red-400 hover:text-red-600"><X size={12} /></button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-5 pt-4 pb-3 border-b border-slate-100">
        <h2 className="text-[15px] font-bold text-slate-800">New Campaign</h2>
        <p className="text-[11px] text-slate-400 mt-0.5">Fill in the details below — the AI will handle the rest.</p>
      </div>

      <div className="px-5 py-4 space-y-5">

        {/* ── Pre-uploaded files strip ── */}
        {hasFiles && (
          <div>
            <SectionLabel icon={Image} label={`Creatives (${allFiles.length})`} />
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allFiles.map((f, i) => (
                <div key={i} className="relative shrink-0 group">
                  {f.preview ? (
                    <img src={f.preview} alt={f.name} className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
                      {f.type?.startsWith('video') ? <Film size={16} className="text-purple-400" /> : <Image size={16} className="text-blue-400" />}
                    </div>
                  )}
                  {i >= preUploadedFiles.length && (
                    <button onClick={() => removeFile(i)}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border border-slate-200 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                      <X size={8} className="text-slate-500" />
                    </button>
                  )}
                </div>
              ))}
              <label className="w-14 h-14 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors shrink-0">
                <Plus size={16} className="text-slate-400" />
                <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* ── Objective ── */}
        <div>
          <SectionLabel icon={Target} label="Objective" />
          <div className="flex flex-wrap gap-1.5">
            {OBJECTIVES.map(o => (
              <Chip key={o.id} selected={objective === o.id} onClick={() => setObjective(o.id)}>
                {o.icon} {o.label}
              </Chip>
            ))}
          </div>
        </div>

        {/* ── Destination ── */}
        {needsDestination && (
          <div>
            <SectionLabel icon={Link} label="Destination" />
            <div className="flex flex-wrap gap-1.5">
              {DESTINATIONS.map(d => (
                <Chip key={d.id} selected={destination === d.id} onClick={() => setDestination(d.id)}>
                  {d.label}
                </Chip>
              ))}
            </div>
            {destination === 'website' && (
              <input type="url" placeholder="https://yoursite.com" value={destinationUrl} onChange={e => setDestinationUrl(e.target.value)}
                className="mt-2 w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none" />
            )}
          </div>
        )}

        {/* ── Format selector (2-10 images) ── */}
        {hasMultipleImages && (
          <div>
            <SectionLabel icon={LayoutGrid} label="Ad Format" />
            <div className="flex gap-2">
              <button onClick={() => setAdFormat('separate')}
                className={`flex-1 p-2.5 rounded-xl border-2 text-center transition-all ${adFormat === 'separate' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <LayoutGrid size={18} className={`mx-auto mb-1 ${adFormat === 'separate' ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-[11px] font-semibold text-slate-700">Separate Ads</p>
              </button>
              <button onClick={() => setAdFormat('carousel')}
                className={`flex-1 p-2.5 rounded-xl border-2 text-center transition-all ${adFormat === 'carousel' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <Layers size={18} className={`mx-auto mb-1 ${adFormat === 'carousel' ? 'text-blue-500' : 'text-slate-400'}`} />
                <p className="text-[11px] font-semibold text-slate-700">Carousel</p>
              </button>
            </div>
          </div>
        )}

        {/* ── Carousel editor ── */}
        {adFormat === 'carousel' && hasMultipleImages && (
          <CarouselEditor files={imageFiles} cards={carouselCards} onChange={setCarouselCards} />
        )}

        <Divider />

        {/* ── Country + Budget (side by side) ── */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <SectionLabel icon={Globe} label="Country" />
            <select value={country} onChange={e => setCountry(e.target.value)}
              className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white text-slate-700 focus:border-blue-400 outline-none">
              {COUNTRIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <SectionLabel icon={DollarSign} label="Daily Budget" />
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 shrink-0">HKD</span>
              <input type="number" min={50} max={50000} step={50} value={budget} onChange={e => setBudget(Number(e.target.value))}
                className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white text-slate-700 focus:border-blue-400 outline-none" />
            </div>
            <div className="flex gap-1 mt-1.5">
              {[100, 200, 500, 1000].map(v => (
                <button key={v} onClick={() => setBudget(v)}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${budget === v ? 'border-blue-400 bg-blue-50 text-blue-600 font-bold' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Divider />

        {/* ── Audience ── */}
        <div>
          <SectionLabel icon={Users} label="Audience" />
          <div className="flex flex-wrap gap-1.5">
            <Chip selected={selectedAudience === 'broad'} onClick={() => setSelectedAudience('broad')}>
              🌐 Broad (recommended)
            </Chip>
            {audiences.map(a => (
              <Chip key={a.id} selected={selectedAudience === a.id} onClick={() => setSelectedAudience(a.id)}>
                {a.name}
              </Chip>
            ))}
            <Chip selected={selectedAudience === 'new'} onClick={() => setSelectedAudience('new')}>
              <Plus size={11} className="inline -mt-0.5 mr-0.5" /> New Audience
            </Chip>
          </div>
        </div>

        <Divider />

        {/* ── CTA ── */}
        <div>
          <SectionLabel icon={Sparkles} label="Call to Action" />
          <div className="flex flex-wrap gap-1.5">
            {CTA_TYPES.map(c => (
              <Chip key={c.id} selected={cta === c.id} onClick={() => setCta(c.id)}>{c.label}</Chip>
            ))}
          </div>
        </div>

        {/* ── Landing page ── */}
        {(destination === 'website' || !destination) && (
          <div>
            <SectionLabel icon={Link} label="Landing Page (optional)" />
            <input type="url" placeholder="https://yoursite.com/landing" value={landingPage} onChange={e => setLandingPage(e.target.value)}
              className="w-full px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 focus:ring-1 focus:ring-blue-100 outline-none" />
          </div>
        )}

        {/* ── Upload zone (only if no files yet) ── */}
        {!hasFiles && (
          <div onDrop={handleDrop} onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-5 text-center hover:border-blue-400 hover:bg-blue-50/30 transition-colors cursor-pointer">
            <Upload size={20} className="mx-auto text-slate-400 mb-1.5" />
            <p className="text-[11px] font-medium text-slate-600">Drop images/videos here (optional)</p>
            <p className="text-[9px] text-slate-400 mt-0.5">JPG, PNG, WebP, GIF, MP4, MOV · Max 30MB images, 4GB videos</p>
            <label className="mt-2 inline-block px-3 py-1.5 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-lg cursor-pointer hover:bg-slate-200 transition-colors">
              Browse Files
              <input type="file" multiple accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
            </label>
          </div>
        )}

        {/* ── Submit ── */}
        <button onClick={handleSubmit} disabled={!canSubmit}
          className={`w-full py-3 rounded-xl text-[13px] font-bold transition-all
            ${canSubmit ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200 active:scale-[0.98]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
          Create Campaign →
        </button>

        {/* ── Boost post alternative ── */}
        <div className="relative my-1">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
          <div className="relative flex justify-center"><span className="bg-white px-3 text-[9px] text-slate-400 uppercase tracking-wider">or</span></div>
        </div>
        <div className="flex items-center gap-2">
          <Megaphone size={14} className="text-slate-400 shrink-0" />
          <input type="text" placeholder="Paste post ID to boost" value={boostPostId} onChange={e => setBoostPostId(e.target.value)}
            className="flex-1 px-3 py-2 text-[12px] border border-slate-200 rounded-xl bg-white focus:border-blue-400 outline-none" />
          <button onClick={handleBoost} disabled={!boostPostId.trim()}
            className={`px-4 py-2 rounded-xl text-[11px] font-semibold transition-all shrink-0
              ${boostPostId.trim() ? 'bg-orange-500 text-white hover:bg-orange-600' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
            Boost
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreationWizard;
