import { useState, useEffect, useRef } from 'react';
import { Building2, ChevronDown, ChevronRight, Link2 } from 'lucide-react';
import { useBusinesses } from '../hooks/useBusinesses.js';
import { useAdAccounts } from '../hooks/useAdAccounts.js';

export const AccountSelector = ({ token, onLogin, onLogout, selectedAccount, selectedBusiness, onSelectAccount }) => {
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState('business');
  const [activeBiz, setActiveBiz] = useState(selectedBusiness);
  const ref = useRef(null);
  const { businesses, isLoading: bizLoading } = useBusinesses();
  const { adAccounts: accounts, isLoading: accLoading } = useAdAccounts(activeBiz?.id);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!token) {
    return (
      <button onClick={onLogin}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
        <Link2 size={12} /> Connect Facebook to get started
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => { setOpen(v => !v); setLevel(selectedBusiness ? 'accounts' : 'business'); if (selectedBusiness) setActiveBiz(selectedBusiness); }}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors
          ${selectedAccount ? 'border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'}`}>
        <Building2 size={12} />
        {selectedAccount ? selectedAccount.name : 'Select Ad Account'}
        <ChevronDown size={12} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-[280px] bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {level === 'business' && (
            <>
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Business</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {bizLoading ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">Loading businesses...</div>
                ) : businesses.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">No businesses found</div>
                ) : businesses.map(biz => (
                  <button key={biz.id} onClick={() => { setActiveBiz(biz); setLevel('accounts'); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${biz.id === selectedBusiness?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <Building2 size={12} className="text-slate-400 shrink-0" />
                    <span className="text-[12px] font-medium text-slate-700 truncate flex-1">{biz.name}</span>
                    <ChevronRight size={12} className="text-slate-300 shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}
          {level === 'accounts' && (
            <>
              <button onClick={() => setLevel('business')}
                className="w-full flex items-center gap-2 px-3 py-2 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <ChevronDown size={14} className="text-slate-400 rotate-90" />
                <Building2 size={12} className="text-slate-400" />
                <span className="text-[11px] font-medium text-slate-500 truncate">{activeBiz?.name}</span>
              </button>
              <div className="px-3 py-1.5 border-b border-slate-50">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Select Ad Account</p>
              </div>
              <div className="max-h-48 overflow-y-auto">
                {accLoading ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">Loading accounts...</div>
                ) : accounts.length === 0 ? (
                  <div className="px-3 py-4 text-center text-[11px] text-slate-400">No ad accounts found</div>
                ) : accounts.map(acc => (
                  <button key={acc.id} onClick={() => { onSelectAccount?.(activeBiz, acc, { stayOnPage: true }); setOpen(false); }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${acc.id === selectedAccount?.id ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                    <span className="text-[12px] font-medium text-slate-700 truncate flex-1">{acc.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">{acc.id}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
