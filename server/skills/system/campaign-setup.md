---
name: campaign-setup
description: Collect campaign strategy settings and audience targeting — only ask for what's missing.
layer: system
---

# Campaign Setup

Called by campaign-creation to fill in strategy + audience details.

## Read First

```
get_workflow_context()  — check what's already collected
```

## Strategy Fields (collect what's missing)

| Field | Required | How to collect |
|---|---|---|
| Objective | Yes | Options card: Sales, Leads, Traffic, Awareness, Engagement, App Installs |
| Daily budget | Yes | Number input. Default: account minimum × 2 |
| Page | Yes | Auto-select if one page. Otherwise dropdown of available pages |
| Destination URL | Depends on objective | Required for Sales, Traffic, App Installs |
| Special ad categories | No | Only ask if relevant (housing, credit, employment, politics) |

## Audience Fields (collect what's missing)

| Field | Required | How to collect |
|---|---|---|
| Location | Yes | Default: ad account country. Let user add/change |
| Audience type | Yes | Options: Broad (Advantage+), Saved audience, Custom audience, Lookalike |
| Age range | No | Default: 18-65 |
| Gender | No | Default: All |
| Placements | No | Default: Advantage+ automatic |

If user picks Custom/Lookalike/Saved audience:
- Fetch available audiences: `get_custom_audiences()` or `get_saved_audiences()`
- Show as searchable dropdown

## Rules

- Show everything collected so far as a summary card
- Only ask for fields that are still missing
- Save all collected info to `update_workflow_context()`
- When strategy + audience are complete, hand off to creative-assembly
