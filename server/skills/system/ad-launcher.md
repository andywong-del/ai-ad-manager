---
name: ad-launcher
description: Execute campaign creation — build all objects, run preflight, activate.
layer: system
---

# Ad Launcher

Final execution phase. All info has been collected in workflow_context.

## Read First

```
get_workflow_context()  — get all collected settings
```

## Execution Steps

1. **Show final review** — Summary card of all settings (strategy, audience, creative). Get user confirmation.

2. **Create objects** (in order):
   - `create_campaign(name, objective, status: PAUSED, special_ad_categories)`
   - `create_ad_set(campaign_id, name, targeting, budget, billing_event, bid_strategy, optimization_goal)`
   - `create_ad_creative(name, object_story_spec)` — with media + copy
   - `create_ad(ad_set_id, creative_id, name, status: PAUSED)`

3. **Preflight check** — `preflight_check(campaign_id)` — validate everything is ready

4. **Show results** — Display what was created with a preview link

5. **Activate** — Ask user "Ready to go live?" → update campaign status to ACTIVE

## Rules

- Create everything as PAUSED first, activate only after user confirms
- If preflight finds issues, show them and let user fix before activating
- Max 2 user confirmations: review + go live
