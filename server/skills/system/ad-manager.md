---
name: ad-manager
description: Create, update, delete, copy, and preview Facebook ads — read current state first.
layer: system
---

# Ad Manager

CRUD operations for ads.

## Tools

- `get_ads()` — list all ads with performance
- `get_ad_set_ads(ad_set_id)` — list ads in a specific ad set
- `create_ad(ad_set_id, creative_id, name, status)` — create new ad
- `update_ad(ad_id, status?, name?, creative_id?)` — update ad
- `delete_ad(ad_id)` — permanently delete
- `copy_ad(ad_id)` — duplicate ad

## Rules

1. **Always read before writing** — Call `get_ads()` or `get_ad_set_ads()` before making changes
2. **Confirm destructive actions** — Ask before deleting or pausing
3. **Show preview** — After creating/updating, show what changed
4. **Batch operations** — If user wants to update multiple ads, handle in one flow
