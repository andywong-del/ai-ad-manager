import { useState } from 'react';
import { CheckCircle, Copy } from 'lucide-react';

const SECTIONS = [
  {
    title: 'App Description',
    subtitle: 'Platform Policies — General Description',
    content: `AI Ad Manager is a business productivity tool that helps advertisers manage their Meta ad campaigns through a conversational AI interface. The app connects to the Meta Marketing API to retrieve campaign performance data and execute approved campaign actions on behalf of the authenticated business user.

The app is designed exclusively for business advertisers managing their own ad accounts. It does not collect, store, or share user data beyond the active session. All actions require explicit user confirmation before any API call is made.`,
  },
  {
    title: 'How We Use ads_read',
    subtitle: 'Permission Justification',
    content: `We use ads_read to retrieve campaign performance metrics (spend, ROAS, impressions, clicks, conversions) for ad accounts owned and operated by the authenticated user.

This data is used solely to:
• Display performance summaries in the AI chat interface
• Generate AI-driven optimization recommendations

Data is never stored server-side beyond the session and is never shared with third parties.

Step-by-step flow:
1. User authenticates via Facebook Login (their own account).
2. App calls: GET /act_{ad_account_id}/campaigns?fields=name,status,daily_budget,insights{spend,actions,action_values}
3. The AI engine processes the returned metrics and produces a plain-language performance summary.
4. The user views the campaign report in the chat interface.`,
  },
  {
    title: 'How We Use ads_management',
    subtitle: 'Permission Justification',
    content: `We use ads_management to allow users to make approved campaign changes via the AI chat interface.

Supported actions:
• Pause a campaign   →  POST /{campaign_id}  {"status": "PAUSED"}
• Resume a campaign  →  POST /{campaign_id}  {"status": "ACTIVE"}
• Update daily budget →  POST /{campaign_id}  {"daily_budget": "{value}"}

Every action requires explicit user confirmation before the API call is made:

Step-by-step flow (pause example):
1. User types: "Pause the Brand Awareness campaign"
2. AI responds: "I'll pause Brand Awareness Q1 (ROAS: 1.2x, below 2x target). This will stop $50/day spend. Shall I proceed?"
3. User types: "Yes"
4. App calls: POST /{campaign_id} {"status": "PAUSED", "access_token": "..."}
5. AI confirms: "Done — Brand Awareness Q1 has been paused. Budget saved. 💰"

The app never executes changes autonomously. The user retains full control at all times.`,
  },
  {
    title: 'Test User Instructions',
    subtitle: 'For Meta App Reviewer',
    content: `Test account credentials will be provided separately via the App Review submission notes.

The test account has access to a Business Manager with active ad campaigns.

Steps to verify ads_read:
1. Log in with the provided test Facebook account.
2. The AI Ad Manager chat interface will open.
3. Type: "Show campaign report"
4. Verify: A performance summary appears showing campaign spend, ROAS, and status for all campaigns in the ad account.

Steps to verify ads_management:
5. Type: "Pause Brand Awareness campaign"
6. Verify: AI responds with campaign details and asks for confirmation.
7. Type: "Yes"
8. Verify: AI confirms the campaign has been paused. Check Ads Manager to confirm status = PAUSED.
9. Type: "Enable Retargeting — Cart"
10. Verify: AI asks for confirmation. Type "Yes". Verify status returns to ACTIVE.
11. Type: "Adjust budget for Lookalike Audience"
12. Verify: AI proposes +20% budget increase and asks for confirmation. Type "Yes". Verify daily budget updated in Ads Manager.`,
  },
];

const CopyButton = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <>
          <CheckCircle size={12} className="text-emerald-500" />
          <span className="text-emerald-600">Copied</span>
        </>
      ) : (
        <>
          <Copy size={12} />
          Copy
        </>
      )}
    </button>
  );
};

export const AppReviewGuide = () => (
  <div className="h-full overflow-y-auto bg-slate-50">
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-5">
      {/* Intro */}
      <div className="bg-violet-50 border border-violet-200 rounded-2xl px-5 py-4">
        <p className="text-sm font-semibold text-violet-800 mb-1">Meta App Review — Advanced Access</p>
        <p className="text-xs text-violet-600">
          Permissions: <strong>ads_read</strong> &amp; <strong>ads_management</strong> — copy each section into the corresponding field in your Meta App Review submission.
        </p>
      </div>

      {/* Sections */}
      {SECTIONS.map(({ title, subtitle, content }) => (
        <div key={title} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-800">{title}</p>
              <p className="text-xs text-slate-400">{subtitle}</p>
            </div>
            <CopyButton text={content} />
          </div>
          <pre className="px-5 py-4 text-xs text-slate-700 leading-relaxed whitespace-pre-wrap font-sans">
            {content}
          </pre>
        </div>
      ))}

      {/* Footer note */}
      <p className="text-xs text-slate-400 text-center pb-4">
        Tip: Attach a screen recording of the demo flow as supporting video for the Meta reviewer.
      </p>
    </div>
  </div>
);
