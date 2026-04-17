# AI Ad Manager — Project Context

## Tech Stack
- **Client:** React 18 + Vite + Tailwind CSS (`client/`)
- **Server:** Express.js + Meta Marketing API v25.0 (`server/`)
- **Database:** Supabase (PostgreSQL)
- **AI:** Google Gemini (via `@google/genai`) for chat, crawling, skill generation
- **Deploy:** Vercel serverless — `vercel --prod` then `vercel alias <url> client-gamma-neon-66.vercel.app`

## File Structure
```
client/src/
  components/    — All UI modules (ChatInterface, AdLibrary, CreativeLibrary, AudienceManager, CampaignManager, BrandLibrary, Optimizations, ReportDashboard, CanvasPanel, Sidebar, Dashboard, etc.)
  hooks/         — useSkills, useBrandLibrary, useChat, etc.
  services/      — api.js (axios instance)
  index.css      — Global styles + CSS custom properties

server/
  src/api/       — Express routers (chat, campaigns, adsets, ads, creatives, assets, audiences, brandLibrary, skills, reports)
  src/lib/       — instructions.js (AI system prompt), supabase.js, tools.js (Meta API tool definitions)
  skills/system/ — Always-on AI context (campaigns, analytics-engine, audiences, brand-memory)
  skills/official/ — Toggleable skills (skill-creator)
  skills/custom/ — User-created skills (stored in Supabase, cached on disk)
  sql/           — Database schema files

api/index.mjs   — Vercel serverless entry point (re-exports Express app)
```

## Design System
- **Font:** DM Sans (Google Fonts)
- **Brand colors:** Orange theme — CSS vars `--brand-orange`, `--brand-amber`
- **Headers:** Dark gradient backgrounds (slate-900 → slate-800)
- **Cards:** White with subtle borders, hover shadows, `rounded-2xl backdrop-blur-sm`
- **Buttons:** Orange gradient (`from-orange-500 to-amber-500`)
- **Optimizations module:** Full dark theme (`bg-slate-950`) with bento grid layout
- **"Upgrade the design"** = apply modern futuristic orange theme with premium feel

## Key Patterns
- `AccountSelector` — ad account dropdown, used in most module headers
- `AskAIButton` / `AskAIPopup` — AI integration button for modules
- `onPrefillChat(message, pillName)` — navigate to chat with prefilled prompt + action pill
- `onSendToChat(message)` — send message from module to active chat
- System skills = always-on background context injected into every AI message
- Official skills = toggleable by user in Skills Library
- Custom skills = user-created via Skill Creator or AI generation
- **Audiences module:** Two-panel layout — left card list + right 8 create cards (no modal). Creation goes to AI chat, not forms.
- **Brand Memory:** 4-folder layout (Website Crawl, Page Crawl, Documents, Saved from Chat) with AI Summary banner on top. Items grouped by source metadata. Header has Refresh + "Ask AI Agent" button. Brand-memory system skill guides setup flow.
- **Reports → Optimizations:** Reports has insights-only AI Summary (no action buttons). Subtle "See recommendations →" link to Optimizations.

## Module Names
Ads Gallery | Creative Hub | Brand Memory | Audiences | Campaigns | Reports | Optimizations | Skills

## Sidebar Navigation (planned)
```
Ads — Campaigns, Audiences, Ad Gallery, Creative Hub
Insights — Brand Memory, Reports, Optimizations
▸ More Tools (collapsed) — Automations, Lead Forms, Events Manager
── Settings
```

## Server Notes
- ESM codebase (`"type": "module"` in package.json)
- CJS packages in ESM: use `createRequire(import.meta.url)` pattern
- Lazy-load optional deps (multer, pdf-parse) with try/catch for Vercel compatibility
- Meta API calls use user's FB access token from `Authorization: Bearer <token>` header
