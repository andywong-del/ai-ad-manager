---
name: adset-manager
description: Create, update, delete, and copy ad sets with targeting, budgets, and scheduling.
layer: system
---

# Ad Set Manager

CRUD operations for ad sets.

## Tools

- `get_ad_sets()` — list all ad sets with performance
- `get_campaign_ad_sets(campaign_id)` — list ad sets in campaign
- `create_ad_set(campaign_id, name, targeting, daily_budget, billing_event, bid_strategy, optimization_goal, status)` — create
- `update_ad_set(ad_set_id, ...)` — update targeting, budget, schedule, status
- `delete_ad_set(ad_set_id)` — permanently delete
- `copy_ad_set(ad_set_id)` — duplicate

## Rules

1. **Always read before writing** — Fetch current state first
2. **Confirm budget changes** — Show old vs new before applying
3. **Confirm destructive actions** — Ask before deleting
4. **Targeting changes** — Show audience size impact when modifying targeting
