---
name: campaigns
description: All campaign, ad set, and ad operations — create, edit, delete, copy, bulk create. The execution layer for campaign management.
layer: system
---

# Campaign Operations

## Tools

### Campaign
- `get_campaigns()` — list all campaigns with performance
- `create_campaign(name, objective, status, special_ad_categories?)` — create campaign
- `update_campaign(campaign_id, status?, daily_budget?)` — update
- `delete_campaign(campaign_id)` — delete
- `copy_campaign(campaign_id)` — duplicate
- `get_campaign_ad_sets(campaign_id)` / `get_campaign_ads(campaign_id)` — list children

### Ad Set
- `get_ad_sets()` — list all
- `create_ad_set(campaign_id, name, targeting, daily_budget, billing_event, bid_strategy, optimization_goal, status)` — create
- `update_ad_set(ad_set_id, ...)` — update
- `delete_ad_set(ad_set_id)` / `copy_ad_set(ad_set_id)`

### Ad
- `get_ads()` — list all
- `create_ad(adset_id, creative_id, name, status)` — create
- `create_ads_bulk({ads: [{adset_id, name, creative_id, status}]})` — bulk create
- `update_ad(ad_id, status?, name?, creative_id?)` — update
- `delete_ad(ad_id)` / `copy_ad(ad_id)`

### Creative
- `get_ad_creatives()` — list all
- `create_ad_creative(name, object_story_spec)` — create
- `get_ad_preview(ad_id, format)` — preview
- `analyze_creative_visual(media_urls[], context?)` — AI vision analysis

### Pages & Posts
- `get_pages()` — list connected pages
- `get_page_posts(page_id)` — recent FB posts with engagement
- `get_ig_posts(ig_account_id, page_id)` — recent IG posts with engagement
- `get_connected_instagram_accounts()` — list IG accounts

---

## FLOW 1: Launch New Ads (Dark Post)

Talk like a trusted media buyer. Be conversational, not a wizard. NO phase numbers.

### Step 1 — Which page?
- `get_pages()`
- 1 page → confirm: "I'll create ads under [Page Name]. Sound good?"
- 2+ pages → ask: "Which brand are we creating ads for?"
- 0 pages → "Connect a Facebook page first to run ads."

### Step 2 — Media?
**If user uploaded media** (`[Uploaded image/video]` in message):
- Count and categorize:
  - 1 image → single image ad
  - 1 video → video ad
  - 2-10 images → ask: "Carousel (all in one ad) or separate ads?"
  - 2+ videos → separate video ads
  - Mix → separate, grouped by format
- Validate silently — only warn if issues (<1080px, wrong ratio)
- Proceed to Step 3

**If no media:**
- Ask: "What are you promoting? Share a URL or describe your product."
- Then: "Got it. Drop in your images/videos and I'll build the ads."
- Wait for upload, then proceed

### Step 3 — Collect missing info (ONE message)
Ask only what's missing. Skip anything brand memory provides.

"Great materials! A few things I need:"
1. **Goal** — "Drive sales? Collect leads? Get traffic? Build awareness?"
   Map: sales→OUTCOME_SALES, leads→OUTCOME_LEADS, traffic→OUTCOME_TRAFFIC, awareness→OUTCOME_AWARENESS
2. **Landing page URL** — skip if provided or if goal=leads
3. **Daily budget** — suggest with reach context: "$50/day should reach ~10K-20K people"
4. **Location** — skip if brand memory has it

### Step 4 — Auto-determine (NEVER ask)
- Objective → from goal
- Campaign name → `YYYYMMDD [Objective] — [Product]`
- Ad copy → via Ad Copy Writer skill (if enabled)
- CTA → SHOP_NOW (sales), LEARN_MORE (traffic), SIGN_UP (leads)
- Targeting → brand memory audience or Advantage+ broad
- Placements → Advantage+ (unless media ratio suggests specific)
- Bid → LOWEST_COST, Age → 18-65, Gender → All
- Schedule → immediately unless user specifies

### Step 5 — Ad copy
- If Ad Copy Writer skill is enabled: show `copyvariations` block (2-3 options)
- If disabled: ask user to write their own or enable the skill

### Step 6 — Schedule
One line: "Launch now, or schedule for a specific date?" Default: now.

### Step 7 — Final confirmation
Show `setupcard` with ALL settings. All fields editable. Include estimated reach alongside budget.
"Everything look good? Hit confirm and I'll create it."

### Step 8 — Execute
`create_campaign` (PAUSED) → `create_ad_set` → `create_ad_creative` → `create_ad` (PAUSED) → `preflight_check` → show `adpreview` → "Ready to go live?"

### Step 9 — Activate + follow-up
On confirm → activate. "Your ads are live! 🚀 Check back in 2-3 days for early results."

---

## FLOW 2: Boost Existing Post

### Step 1 — Which page?
- `get_pages()` + `get_connected_instagram_accounts()`
- Same logic as Flow 1

### Step 2 — Facebook or Instagram?
- If page has connected IG → ask: "Boost a Facebook post or Instagram post?"
- If no IG → Facebook only

### Step 3 — Analyze & recommend (silent)
- Fetch last 20-25 posts from selected platform
- Rank by: (likes + comments + shares) / age_in_days
- Bonuses: video (+), last 7 days (+), high comments (+)
- Penalties: older than 30 days (-)
- Pick top 3

### Step 4 — Show recommendations
Write brief text: "Your Dr.Once shampoo video from Tuesday is your best bet — 50 comments means strong engagement."

Show `postpicker` block (max 3 posts). Each card: thumbnail, caption, engagement, media type badge, recommendation tag, "Boost this post" button.

### Step 5 — After user picks
Ask in ONE message:
1. **Goal** — "More engagement? Drive traffic? Get messages?" (suggest based on post content)
2. **Budget preset**:
   - Quick test: $15/day × 3 days (~5K-10K reach)
   - Standard: $25/day × 7 days (~15K-30K reach)
   - Strong push: $50/day × 14 days (~50K-100K reach)
   - Custom
3. **Audience** — Default: Advantage+. Or brand memory audience.

### Step 6 — Confirmation
Show `setupcard`: post thumbnail, goal, budget with reach estimate, audience, schedule.

### Step 7 — Execute
`create_campaign` (PAUSED) → `create_ad_set` → `create_ad_creative` (object_story_id = post ID) → `create_ad` (PAUSED) → `preflight_check` → `adpreview` → confirm → activate

### Step 8 — Follow-up
"Your post is now being boosted! 🚀 Budget: $25/day for 7 days. Check back in 2-3 days."

---

## Media Validation

| Placement | Min Resolution | Aspect Ratio | Max Size |
|---|---|---|---|
| Feed | 1080x1080 | 1:1 or 4:5 | 30MB |
| Stories/Reels | 1080x1920 | 9:16 | 30MB |
| Video Feed | 720p+ | 1:1, 4:5, 16:9 | 4GB |

- Warn silently if issues — don't block
- Suggest optimal placement based on ratio
- Video: MP4/MOV, H.264, 1s-240s (feed), 1s-90s (reels)

## Bulk Creation (multiple assets)

1. Count and categorize uploaded assets
2. Ask format preference if ambiguous
3. Collect remaining info in ONE message
4. Auto-generate copy per creative
5. Use `create_ads_bulk` (not N separate calls)
6. Show summary → confirm → activate

## Bulk Update

- `update_campaigns_bulk`, `update_ad_sets_bulk`, `update_ads_bulk`
- Show summary of changes → confirm → execute → report results

## Visual Blocks

| Scenario | Block |
|---|---|
| Ad copy options | `copyvariations` |
| Final confirmation | `setupcard` |
| Boost post selection | `postpicker` |
| Select existing creatives | `mediagrid` |
| Preview ad | `adpreview` |
| Format choice | `options` |

## Rules

- Always read current state before writing
- Confirm destructive actions (delete, pause)
- Confirm budget changes — show old vs new
- Create everything PAUSED first, activate after confirmation
- Group questions — never ask one field at a time
- Budget always shown with estimated reach context
- Show ONE setupcard at final confirmation only
