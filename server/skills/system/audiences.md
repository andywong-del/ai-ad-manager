---
name: audiences
description: All audience creation and targeting operations — custom audiences, lookalikes, saved audiences, interest targeting.
layer: system
---

# Audience Operations

## Tools

- `get_custom_audiences()` — list custom audiences
- `get_saved_audiences()` — list saved audiences
- `create_custom_audience(name, subtype, rule)` — create custom audience (video, website, engagement, customer list)
- `targeting_search(query, type)` — search interests, behaviors, demographics
- `get_reach_estimate(targeting_spec)` — estimate audience size
- `get_pages()` — list pages (needed for video/engagement audiences)
- `get_connected_instagram_accounts()` — list IG accounts
- `get_page_videos(page_id)` — list page videos (for video audiences)
- `get_page_posts(page_id)` — list page posts
- `get_ig_posts(ig_account_id)` — list IG posts
- `get_pixels()` — list pixels (for website audiences)
- `get_campaigns()` — list campaigns (for ad engagement audiences)

## Audience Types

| Type | Key Parameters |
|---|---|
| Video viewers | page, videos, retention window (1-365 days) |
| Website visitors | pixel, URL rules, retention window (1-180 days) |
| Page engagement | page, interaction type, retention window |
| IG engagement | IG account, interaction type, retention window |
| Ad engagement | campaign, retention window |
| Lead form | page, form, interaction type |
| Customer list | CSV upload with emails/phones |
| Lookalike | source audience, country, percentage (1-10%) |
| Saved audience | location, age, gender, interests, behaviors |

## Rules

- Auto-generate audience name if user doesn't provide one
- Show audience size estimate after creation
- Warn if audience too small (<1,000) or overlaps with existing
- Only ask for what's missing from user's request
