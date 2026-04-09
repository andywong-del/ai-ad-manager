---
name: creative-assembly
description: Collect creative materials and generate ad copy — skip what's already provided.
layer: system
---

# Creative Assembly

Called after campaign-setup. Collects media + ad copy for the campaign.

## Read First

```
get_workflow_context()  — check what media/copy already exists
```

## Required Creative Info (collect what's missing)

| Field | Required | Notes |
|---|---|---|
| Media | Yes | Image(s) or video(s). May already be uploaded via drag & drop |
| Primary text | Yes | Auto-generate 3 variations if not provided |
| Headline | Yes | Short, punchy. Auto-generate if not provided |
| Description | No | Optional supporting text |
| CTA button | Yes | Already set in strategy phase usually |
| Destination URL | Yes | Already set in strategy phase usually |

## Behavior

- If media already uploaded (tokens in message) → skip media collection
- If user provided ad copy → use it, don't regenerate
- If no copy provided → auto-generate 3 variations using the product/service context
- Show creative preview as a card before confirming
- Save to `update_workflow_context()`
- When complete → hand off to ad-launcher
