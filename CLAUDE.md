# AI Ad Manager — Project Context

## Tech Stack
- **Client:** React 18 + Vite + Tailwind CSS (`client/`)
- **Server:** Express.js (`server/`) — Meta Marketing API v25.0 + Google Ads API
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini via `@google/genai` + `@google/adk` (tool-use agent)
- **Deploy:** `git push origin main` → Vercel auto-deploys. Production = `client-gamma-neon-66.vercel.app`. If Vercel "Staged Promotions" is on, deploys land as staged and need manual promote.

## File Structure
```
client/src/
  components/      — All UI modules
  hooks/           — useSkills, useBrandLibrary, useChat, useGoogleAuth, useGoogleAccounts, useAuth, useAdAccounts, useBusinesses
  services/api.js  — axios instance, baseURL=/api, reads fb_long_lived_token from localStorage
  App.jsx          — top-level state: selectedAccount (Meta), googleCustomerId, auth tokens

server/
  src/
    api/
      meta/        — 15 Meta routers (campaigns, adsets, ads, creatives, assets, targeting, rules, labels, pixels, conversions, leads, catalogs, previews, insights, meta)
      google/      — Google routers (auth, accounts, campaigns, reports, audiences, client helper)
      tiktok/      — future placeholder
      auth.js, chat.js, skills.js, brandLibrary.js, creativeSets.js  — platform-agnostic
    lib/
      tools.js     — Meta AI tools + load_skill + create_skill (shared)
      googleTools.js — 23 Google AI tools
      instructions.js — AI system prompts
      supabase.js, pdfExtract.js
  skills/
    system/meta/   — Meta-only skills (campaigns, audiences, ad-gallery, creative-hub, lead-forms, automations, analytics-engine)
    system/google/ — Google-only skills (campaigns; TODO: keywords, audiences, conversions, analytics-engine)
    system/shared/ — platform-agnostic (brand-memory, account-infrastructure)
    system/tiktok/ — future
    official/      — Toggleable skills (skill-creator)
    custom/        — User-created (stored in Supabase)

api/index.mjs      — Vercel serverless entry (re-exports Express app)
vercel.json        — buildCommand, includeFiles: server/{src,skills}/**
```

## Routes — HTTP paths unchanged despite folder reorg
- Meta: `/api/campaigns`, `/api/adsets`, `/api/ads`, `/api/meta/pages`, `/api/insights`, etc.
- Google: `/api/google/auth/*`, `/api/google/accounts`, `/api/google/campaigns`, `/api/google/reports`, `/api/google/audiences`
- Shared: `/api/auth`, `/api/chat`, `/api/skills`, `/api/brand-library`

## Google Ads integration
- **Env-token mode** (current default): hardcoded refresh token in `server/.env`. All users share same Google account. Good for team/agency use.
  - Needs `ALLOW_GOOGLE_ENV_FALLBACK=true` on Vercel for production to use env token. Otherwise production requires OAuth (and OAuth app must be Google-verified for external users).
- **Per-user OAuth** (built but needs Supabase + Google Cloud Console setup): `/api/google/auth/connect` opens popup → callback stores refresh_token in `platform_tokens` Supabase table keyed by `fb_user_id`.
  - SQL: `server/sql/platform_tokens.sql`
  - Google Cloud Console: add redirect URIs + test users for unverified app
- **MCC handling:** Google rejects metrics queries on manager accounts. Account picker flattens MCC children and filters out managers. Always pass `loginCustomerId=<MCC_ID>` alongside `accountId=<child>` in API calls.
- Cost values in **micros** (1 HKD = 1,000,000 micros)

## Critical Vercel gotchas (learned the hard way)
- **`pdfjs-dist` CANNOT be imported at module top level** — expects browser globals (`DOMMatrix`) that crash Node.js serverless cold start → `FUNCTION_INVOCATION_FAILED`. Always import lazily inside the function that uses it. See `server/src/lib/pdfExtract.js`.
- **`google-ads-api` static imports** work fine. Do NOT use `await import('google-ads-api')` at top level — top-level await is unreliable on Vercel serverless.
- **`NODE_ENV=production`** on Vercel means dev fallbacks don't trigger. Env fallback for Google needs explicit `ALLOW_GOOGLE_ENV_FALLBACK=true`.
- **Server entry**: `app.listen()` is gated on `NODE_ENV !== 'production'` so the module exports the Express app for Vercel's function wrapper.
- **`.vercelignore`** excludes `node_modules`, `.env*`, logs, `server/skills/custom` — keeps upload size down (~50MB vs 700MB).

## Design System
- **Font:** DM Sans (Google Fonts)
- **Brand colors:** Orange — CSS vars `--brand-orange`, `--brand-amber`
- **Headers:** Dark gradient (slate-900 → slate-800)
- **Cards:** White with subtle borders, hover shadows, `rounded-2xl backdrop-blur-sm`
- **Buttons:** Orange gradient (`from-orange-500 to-amber-500`)
- **Optimizations module:** Full dark theme (`bg-slate-950`) bento grid
- **"Upgrade the design"** = apply modern futuristic orange theme with premium feel

## Key Patterns
- `PlatformAccountSelector` (in header) + `AccountConnector` (in ChatInterface) — both support Meta + Google. Dropdown uses React portal to escape parent overflow/stacking contexts.
- `AskAIButton` / `AskAIPopup` — AI integration button for modules
- `onPrefillChat(message, pillName)` — navigate to chat with prefilled prompt + action pill
- `onSendToChat(message)` — send message from module to active chat
- **System skills** = AI-only context, loaded on demand via `load_skill` tool. Path formats: `meta/campaigns`, `google/campaigns`, or bare `campaigns` (resolves shared→meta→google).
- **Official skills** = user-toggleable in Skills Library. Frontmatter supports: name, description, preview, starter_prompt
- **Custom skills** = user-created via Skill Creator, AI generation, or file upload (PDF/DOC/XLS → server extracts → Gemini generates skill)
- Skill file upload: `POST /api/skills/upload-doc` (multer + pdfExtract). Chat doc upload: `POST /api/chat/parse-doc`
- PDF parsing: use `pdfExtract.js`. Never `pdf-parse` (broken in ESM).
- Slash `/` picker shows ALL skills. Selecting adds it as a one-off chip (same as `+` menu)
- **Audiences module:** Two-panel — left card list + right 8 create cards. Creation goes to AI chat.
- **Brand Memory:** 4-folder (Website Crawl, Page Crawl, Documents, Saved from Chat) + AI Summary banner + Refresh + Ask AI Agent buttons.
- **Reports → Optimizations:** Reports shows insights-only AI Summary. Subtle "See recommendations →" links to Optimizations.

## Module Coverage (Meta vs Google)
| Module | Meta | Google | Notes |
|---|---|---|---|
| Campaigns | ✅ full | ⚠️ list-only (Phase 2 pending) | need ad groups CRUD, RSA creation, keyword CRUD expansion |
| Audiences | ✅ full | ⚠️ list-only | need customer match, lookalike equivalents |
| Reports | ✅ full | ✅ working | both platforms with breakdowns |
| Optimizations | demo data only | — | both TBD |
| Ad Gallery | ✅ | ❌ N/A | Meta-only (Google has no public ad library API) |
| Creative Hub | ✅ | ❌ N/A | Meta-only for now |
| Brand Memory | ✅ | ❌ N/A | Meta-only (Facebook Pages) |
| Events Manager | ✅ | ⚠️ conversions only | no pixel equivalent |
| Automations | ✅ | — | internal feature, can extend |
| Lead Forms | ✅ | ❌ N/A | Meta-only |
| Google Keywords | — | pending | new module (Phase 2) |
| Google Search Terms | — | pending | new module (Phase 2) |
| Google Recommendations | — | pending | new module (Phase 2) |

## Server Notes
- ESM codebase (`"type": "module"` in package.json)
- CJS packages in ESM: use `createRequire(import.meta.url)` pattern
- Lazy-load optional/heavy deps inside function handlers (not top-level) for Vercel compat
- Excel extraction: lazy `createRequire(import.meta.url)('xlsx')` inside route
- Meta API calls use user's FB access token from `Authorization: Bearer <token>` header
- Local dev: `cd server && node src/index.js` (so `.env` loads). Client: `cd client && npm run dev` (Vite proxies `/api` → localhost:3001).
