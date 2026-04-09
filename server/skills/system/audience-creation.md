---
name: audience-creation
description: Create any audience type — video, website, engagement, lookalike, saved, customer list.
layer: system
---

# Audience Creation

## Detect Type

Parse user intent to determine audience type:

| Signal | Type | Action |
|---|---|---|
| "video viewers", "watched" | Video custom | Select page → pick videos → set retention window |
| "website visitors", "pixel" | Website custom | Select pixel → set URL rules → retention window |
| "engaged", "page interaction" | Engagement custom | Select page → engagement type → retention window |
| "lookalike", "similar to" | Lookalike | Select source audience → country → percentage (1-10%) |
| "saved audience", "interest" | Saved | Collect: location, age, gender, interests, behaviors |
| "customer list", "upload list" | Customer list | Upload CSV/file with emails/phones |

## Required Info Per Type

### Custom Audiences (Video/Website/Engagement)
- [ ] Source (page, pixel, or engagement type)
- [ ] Specific content (which videos, which URLs, which interactions)
- [ ] Retention window (default: 30 days)
- [ ] Audience name

### Lookalike
- [ ] Source audience (custom audience to base on)
- [ ] Country
- [ ] Percentage (1-10%, default: 1%)
- [ ] Audience name

### Saved Audience
- [ ] Location
- [ ] Age range
- [ ] Gender
- [ ] Interests and/or behaviors
- [ ] Audience name

## Rules

- Auto-generate audience name if user doesn't provide one
- Show audience size estimate after creation
- Warn if audience is too small (<1000) or has overlap with existing audiences
- Only ask for what's missing from user's request
