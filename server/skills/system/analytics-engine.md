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

| Metric | What it measures | Good/Bad threshold |
|---|---|---|
| ROAS | Revenue / spend | > 2.0x good, < 1.0x losing money |
| CPA | Cost per action | Varies by industry |
| CTR | Click-through rate | > 1% good for feed |
| CPM | Cost per 1000 impressions | Varies by audience |
| Frequency | Avg times each person saw ad | > 3.0 = saturation risk |
| Hook rate | 3-second video views / impressions | > 25% good |

## Comparison Periods

- **Current**: last 7 days
- **Previous**: 7 days before that (week-over-week)
- **Baseline**: last 30 days (trend context)

## Diagnostic Signals

5 signals to evaluate campaign health:
1. **Frequency** — > 3.0 suggests audience saturation
2. **CTR trend** — declining WoW = creative fatigue
3. **CPA vs benchmark** — above account average = underperforming
4. **Spend pace** — underspending budget = delivery issues
5. **Audience size** — too small = limited scale

## Rules

- Always pull current + previous period for comparison
- Show WoW change (↑/↓ with percentage)
- Use account benchmarks, not industry averages
