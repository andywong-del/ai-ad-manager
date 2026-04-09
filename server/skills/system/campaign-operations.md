---
name: campaign-operations
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

Be adaptive — parse what user provided, only ask for missing pieces.

**Required info (skip what's already given):**
- Objective, Budget, Page, Location, Targeting, Media, Ad copy, CTA, Destination URL

**Smart defaults:** Campaign name = `[Objective] — [Date]`, Bid = LOWEST_COST, Age = 18-65, Gender = All, Placements = Advantage+

**Execution order:**
1. Collect info → save to `workflow_context`
2. Confirm with user
3. `create_campaign` (PAUSED) → `create_ad_set` → `create_ad_creative` → `create_ad` (PAUSED)
4. `preflight_check` → show preview → activate on confirmation

**Bulk creation:** Parse uploaded document → show plan → confirm → create each campaign → report results

## Rules

- Always read current state before writing
- Confirm destructive actions (delete, pause)
- Confirm budget changes — show old vs new
- Create everything PAUSED first, activate after confirmation
- Group questions — don't ask one field at a time
