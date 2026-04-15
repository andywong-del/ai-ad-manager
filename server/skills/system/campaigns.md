---
name: campaigns
description: All campaign, ad set, and ad operations — create, edit, delete, copy, bulk create. The execution layer for campaign management.
layer: system
---

# Campaign Operations

## Campaign Tools

- `get_campaigns()` — list all campaigns with performance
- `get_campaign_ad_sets(campaign_id)` — list ad sets in campaign
- `get_campaign_ads(campaign_id)` — list all ads in campaign
- `create_campaign(name, objective, status, special_ad_categories?)` — create campaign
- `update_campaign(campaign_id, status?, daily_budget?)` — update campaign
- `delete_campaign(campaign_id)` — permanently delete
- `copy_campaign(campaign_id)` — duplicate

## Ad Set Tools

- `get_ad_sets()` — list all ad sets with performance
- `create_ad_set(campaign_id, name, targeting, daily_budget, billing_event, bid_strategy, optimization_goal, status)` — create
- `update_ad_set(ad_set_id, ...)` — update targeting, budget, schedule, status
- `delete_ad_set(ad_set_id)` — permanently delete
- `copy_ad_set(ad_set_id)` — duplicate

## Ad Tools

- `get_ads()` — list all ads with performance
- `get_ad_set_ads(ad_set_id)` — list ads in a specific ad set
- `create_ad(ad_set_id, creative_id, name, status)` — create new ad
- `update_ad(ad_id, status?, name?, creative_id?)` — update ad
- `delete_ad(ad_id)` — permanently delete
- `copy_ad(ad_id)` — duplicate

## Creative Tools

- `get_ad_creatives()` — list creatives
- `create_ad_creative(name, object_story_spec)` — create creative with media + copy
- `get_ad_images()` — list uploaded images
- `get_ad_videos()` — list uploaded videos
- `get_ad_preview(ad_id, format)` — preview an ad

## Campaign Creation Flow

Be conversational — NOT a wizard. Have a natural back-and-forth like a real consultant would.
Parse everything the user already provided. Only ask about truly missing info, and group ALL missing items into ONE message — never ask one field at a time.

DO NOT use phase numbers, staged cards, or "Stage 1/2/3" labels.
DO NOT show a setupcard until you have ALL info and are ready for final confirmation.

**Required info (skip what's already given, use defaults where possible):**
- Objective, Budget, Page, Location, Targeting, Media, Ad copy, CTA, Destination URL

**Smart defaults (use without asking):**
- Campaign name = `[Objective] — [Date]`, Bid = LOWEST_COST, Age = 18-65, Gender = All, Placements = Advantage+
- Auto-generate ad copy based on the media/product — never ask the user to write it

**Execution order (once all info is collected and confirmed):**
`create_campaign` (PAUSED) → `create_ad_set` → `create_ad_creative` → `create_ad` (PAUSED) → `preflight_check` → show preview → activate on confirmation

## Media Validation

Before creating ads, validate uploaded media against Meta's creative specs. Use `analyze_creative_visual` if URLs are available, otherwise check metadata from the upload response.

**Image requirements:**
- Min resolution: 1080x1080 (feed), 1080x1920 (stories/reels)
- Recommended aspect ratios: 1:1 (feed), 4:5 (feed portrait), 9:16 (stories/reels), 16:9 (video feed)
- Max file size: 30MB
- Formats: JPG, PNG — avoid GIF for ads (low quality)
- Text overlay: Meta may limit delivery if >20% of image is text

**Video requirements:**
- Min resolution: 720p
- Recommended: 1080p or higher
- Duration: 1s–240s (feed), 1s–60s (stories), 1s–90s (reels)
- Aspect ratio: 1:1 or 4:5 (feed), 9:16 (stories/reels)
- Format: MP4 or MOV, H.264 codec

**Validation flow:**
1. After upload, check dimensions and aspect ratio from the upload response
2. Match against target placement — warn if mismatch (e.g. landscape image for Stories)
3. If image is too small, warn: "This image is [W]x[H] — Meta recommends at least 1080x1080 for feed. It may appear blurry."
4. If aspect ratio doesn't fit the placement, suggest cropping or a different placement
5. Proceed only after user acknowledges warnings — don't block, just inform

## Bulk Creation from Uploaded Media

When user uploads multiple images/videos, detect what was uploaded and offer format options:

**Detection logic:**
- Multiple images only → offer: single image ads (one per image), carousel ad, or both
- Multiple videos only → offer: separate video ads, or one campaign with multiple ad sets
- Mix of images + videos → offer: separate ads per asset, or group by format
- Single image/video → proceed with standard single ad creation

**Flow:**
1. Count and categorize uploaded assets (images vs videos)
2. Ask user which ad format they want — show options card
3. Collect remaining info (objective, budget, targeting, destination) in ONE message
4. Auto-generate ad copy for each creative
5. Execute: create campaign → ad set → one creative per asset → one ad per creative (all PAUSED)
6. Show summary of all created ads → confirm → activate

Use `create_ads_bulk` to create multiple ads efficiently in one call.

## Bulk Update

For bulk updates (pause, budget changes, status) across multiple campaigns/ad sets/ads:

**Tools:**
- `update_campaigns_bulk([{ campaign_id, status?, daily_budget?, name? }])` — update multiple campaigns
- `update_ad_sets_bulk([{ ad_set_id, status?, daily_budget?, name? }])` — update multiple ad sets
- `update_ads_bulk([{ ad_id, status?, name?, creative_id? }])` — update multiple ads

**Flow:**
1. Identify which objects to update (from user request or selected IDs)
2. Show summary of planned changes — what will change, for how many objects
3. Confirm with user before executing
4. Execute bulk update
5. Report results: N succeeded, N failed

**Bulk creation from document:** Parse uploaded document → show plan → confirm → create each campaign → report results

## Rules

- Always read current state before writing
- Confirm destructive actions (delete, pause)
- Confirm budget changes — show old vs new
- Create everything PAUSED first, activate after confirmation
- Group questions — don't ask one field at a time
- Show ONE final confirmation setupcard (no phase number) before executing — not multiple staged cards
