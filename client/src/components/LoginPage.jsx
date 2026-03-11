import { useState } from 'react';
import { Bot, Shield, BarChart2, Zap, Check } from 'lucide-react';

const Feature = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2 text-blue-100">
    <Icon size={14} className="shrink-0" />
    <span className="text-sm">{text}</span>
  </div>
);

// ── Mock Facebook permission dialog ───────────────────────────────────────────
const FbPermissionModal = ({ onConfirm, onCancel }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = () => {
    setLoading(true);
    setTimeout(() => { setLoading(false); onConfirm(); }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* FB Header */}
        <div className="bg-[#1877F2] px-5 py-4 flex items-center gap-3">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="white">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          <div>
            <p className="text-white text-xs opacity-80">Log in with Facebook</p>
            <p className="text-white font-bold text-sm">AI Ad Manager</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          {loading ? (
            /* Loading state */
            <div className="flex flex-col items-center justify-center py-8 gap-4">
              <div className="w-10 h-10 rounded-full border-4 border-[#1877F2] border-t-transparent animate-spin" />
              <div className="text-center">
                <p className="text-slate-800 font-semibold text-sm">Accessing Business Manager data…</p>
                <p className="text-slate-400 text-xs mt-1">Verifying permissions via Meta Graph API</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-slate-800 font-semibold text-sm mb-1">Continue as Andy Wong?</p>
              <p className="text-slate-500 text-xs mb-4">
                AI Ad Manager will receive the following permissions:
              </p>

              <div className="space-y-2.5 mb-5">
                {[
                  { perm: 'ads_read',            desc: 'View your ad performance data'        },
                  { perm: 'ads_management',      desc: 'Manage and update your campaigns'      },
                  { perm: 'business_management', desc: 'Access and manage your Business Manager account' },
                ].map(({ perm, desc }) => (
                  <div key={perm} className="flex items-start gap-2.5">
                    <div className="w-5 h-5 rounded-full bg-[#1877F2] flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={11} className="text-white" strokeWidth={3} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 font-mono">{perm}</p>
                      <p className="text-xs text-slate-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                className="w-full bg-[#1877F2] hover:bg-[#0e6fdf] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors mb-2"
              >
                Continue as Andy Wong
              </button>
              <button
                onClick={onCancel}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors"
              >
                Cancel
              </button>

              <p className="text-center text-xs text-slate-400 mt-3">
                You can review and change these permissions in your Facebook settings.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main login page ───────────────────────────────────────────────────────────
export const LoginPage = ({ onLogin, isLoading, error }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4 backdrop-blur">
              <Bot size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">AI Ad Manager</h1>
            <p className="text-blue-200 mt-2 text-sm">Intelligent Facebook Ads Automation</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Connect your account</h2>
            <p className="text-slate-500 text-sm mb-6">
              Sign in with Facebook to manage your ad campaigns with AI assistance.
            </p>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              onClick={() => setShowModal(true)}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 bg-[#1877F2] hover:bg-[#0e6fdf] disabled:bg-blue-300 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Continue with Facebook
            </button>

            <p className="text-xs text-slate-400 text-center mt-4">
              Requires:{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">ads_management</code>{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">ads_read</code>{' '}
              <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-600">business_management</code>
            </p>
          </div>

          {/* Features */}
          <div className="mt-6 space-y-2 px-2">
            <Feature icon={BarChart2} text="Real-time campaign performance analytics" />
            <Feature icon={Zap}       text="AI-powered budget optimization decisions" />
            <Feature icon={Shield}    text="Secure token exchange — your secret stays server-side" />
          </div>

          <p className="text-center text-xs text-blue-200/70 mt-4">
            <a
              href="https://juvenile-sauce-34d.notion.site/Privacy-Policy-for-AI-Ad-Manager-3202cc383a9b80df9439ed45e4a8cc74"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-white transition-colors"
            >
              Privacy Policy
            </a>
          </p>
        </div>
      </div>

      {showModal && (
        <FbPermissionModal
          onConfirm={() => { setShowModal(false); onLogin(); }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
};
