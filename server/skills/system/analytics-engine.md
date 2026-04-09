---
name: analytics-engine
description: Performance data retrieval and metric definitions — how to pull data, what metrics mean, how to compare periods.
layer: system
---

# Analytics Engine

## Tools

- `analyze_performance()` — returns current_7d, previous_7d, baseline_30d data with benchmarks and account_summary
- `get_ad_account_details()` — account info, currency, timezone, spend limits
- `get_object_insights(object_id, level, date_preset, fields, breakdowns?)` — granular insights for any object

## Key Metrics

| Metric | What it measures |
|---|---|
| ROAS | Revenue / spend |
| CPA | Cost per action |
| CTR | Click-through rate |
| CPM | Cost per 1000 impressions |
| Frequency | Avg times each person saw ad |
| Hook rate | 3-second video views / impressions |

## Comparison Periods

- **Current**: last 7 days
- **Previous**: 7 days before that (week-over-week)
- **Baseline**: last 30 days (trend context)

## Rules

- Always pull current + previous period for comparison
- Show WoW change (↑/↓ with percentage)
- Report the data — do not judge good/bad unless the user has defined benchmarks via a custom skill
