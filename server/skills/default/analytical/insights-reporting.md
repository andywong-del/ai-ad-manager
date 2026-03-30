---
name: insights-reporting
description: Analyze Facebook ad performance with diagnostic statuses and strategic recommendations
layer: analytical
leads_to: [campaign-manager, adset-manager, creative-manager, targeting-audiences, tracking-conversions]
---

# Insights & Reporting

## Scenario Routing (classify BEFORE writing)

Read the user's message → pick ONE scenario → follow its output structure.

| Scenario | Triggers | Strategic Lens |
|---|---|---|
| A — 預算配比效率 | "overview", "how are my ads", "last 7 days", general check-in | Spend efficiency across goal types — is the funnel top-heavy? |
| B — 素材 vs 市場 | "why is cost high", "diagnose", "what's wrong" | Creative Decay vs Auction Pressure — walk through causal evidence |
| C — 資本損耗 | "what should I pause", "worst performers", "stop loss" | Quantify capital hemorrhage, generate kill list |
| D — 邊際紅利 | "which should I scale", "best performers", "add budget" | Find low-freq low-CPA winners with scaling room |

Default if unclear → Scenario A.

---

## Goal → Primary Metric Map

| optimization_goal | Primary Metric | Primary Action Type |
|---|---|---|
| CONVERSATIONS | Cost/Conversation | `onsite_conversion.messaging_conversation_started_7d` |
| LEAD_GENERATION | CPL | `lead` or `onsite_conversion.lead_grouped` |
| OFFSITE_CONVERSIONS (purchase) | ROAS + CPA | `purchase` / `offsite_conversion.fb_pixel_purchase` |
| OFFSITE_CONVERSIONS (lead) | CPL | `offsite_conversion.fb_pixel_lead` |
| OFFSITE_CONVERSIONS (other) | Cost/LPV | `landing_page_view` |
| LINK_CLICKS | CPC + CTR | `link_click` |
| LANDING_PAGE_VIEWS | Cost/LPV | `landing_page_view` |
| PROFILE_VISIT | Cost/Click | `link_click` (proxy) |
| REACH | CPM + Reach | impressions/reach |
| THRUPLAY | Cost/ThruPlay | `video_thruplay_watched_actions` |
| POST_ENGAGEMENT | CPE | `post_engagement` |
| APP_INSTALLS | CPI | `mobile_app_install` |
| VALUE | ROAS | `purchase` + `action_values` |

**OFFSITE_CONVERSIONS detection:** Check `actions` array for `offsite_conversion.fb_pixel_purchase` → purchase; `fb_pixel_lead` → lead; else → landing_page_view fallback.

**ROAS rule:** Only compute when goal = VALUE or OFFSITE_CONVERSIONS+purchase. Never for messaging/leads.

**Mixed accounts:** Never average ROAS across different goal types. Group by goal, show each group's primary metric separately.

---

## Data (already loaded by analyze_performance)

`analyze_performance()` returns:
```
{ current_7d, previous_7d, baseline_30d, _benchmarks, account_summary }
```

Each campaign row includes: campaign_id, campaign_name, spend, impressions, clicks, ctr, cpm, reach, frequency, actions, video_thruplay_watched_actions, action_values, optimization_goal.

`_benchmarks[goal]` = { avg_cost_per_result, total_spend, total_results, campaign_count, primary_action_type }

**Use `_benchmarks` as evaluation baseline — never compute averages yourself.**

Extract primary result: `actions.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`
Extract primary cost: `cost_per_action_type.find(a => a.action_type === PRIMARY_ACTION_TYPE)?.value`

---

## Diagnostic Evaluation (5 signals)

```
cpa_deviation_pct = ((campaign_cost - _benchmarks[goal].avg_cost_per_result) / avg) * 100
ctr_delta_pct     = ((current_ctr - prev_ctr) / prev_ctr) * 100
cpm_delta_pct     = ((current_cpm - prev_cpm) / prev_cpm) * 100
frequency         = current period value
result_count      = current period primary results (0 vs >0)
```

**Decision tree (first match wins):**

| Status | Condition |
|---|---|
| 🚨 預算流失警告 | spend > 0 AND results = 0 |
| ⚠️ 創意吸引力衰退 | CPA > +20% AND CTR < -10% AND freq > 2.5 |
| ⚔️ 流量競爭加劇 | CPA > +20% AND CTR stable AND CPM > +15% |
| ⚖️ 表現穩定運行 | CPA within ±20% |
| 🚀 爆發增長模式 | CPA < -20% AND CTR stable/improving |
| 📊 數據積累中 | < 3 days data or < $10 spend → skip diagnosis |

**Edge cases:** No prev data → use CPA vs baseline only. No CPA (THRUPLAY/REACH) → use cost_per_thruplay or CPM. `_benchmarks[goal]` missing → use WoW as proxy.

**Frequency signal:** ≤3 healthy, 3-5 saturation approaching, >5 audience saturated.

---

## Output Format

### Chat (left panel) — stream in order:

**1. 🚦 Executive Briefing** — OUTPUT IMMEDIATELY with account totals + dominant diagnostic. Don't wait to compute every campaign.

Example: "### 🚦 ⚔️ 流量競爭加劇 執行官簡報\n**本週總支出 $16,331，WhatsApp 對話成本升至 $181/conv（30天基準：$148，偏離 +22%）。**"

**2. 🧠 Strategic Deep-Dive** — Causal analysis per scenario. No length limit. Use #### sub-headers.
- A: spend_share vs result_share per goal, funnel imbalances
- B: evidence chain for Creative Decay vs Auction Pressure
- C: vampire ads quantified, excess cost calculated
- D: per-winner scaling estimate, frequency headroom

**3. ⚡ Action Plan** — `steps` block with specific campaign names + numbers.

**4. `insights` block** — top 3 severity-coded findings with action buttons.

**5. `quickreplies`** — 4 buttons mapped to dominant diagnostic status.

### Canvas (right panel) — emit AFTER chat:

- `metrics` block (Spend + 3 goal-relevant KPIs)
- `budget` block (spend allocation donut by goal)
- `comparison` block (WoW per goal)
- Goal summary table (one row per goal with Status column)
- Per-campaign detail table sorted by severity: 🚨→⚠️→⚔️→⚖️→🚀

### Global Rules

- WhatsApp/Messaging: NEVER show ROAS
- Every metric must include WoW % change (🟢/🟡/🔴)
- Strip campaign name prefixes — show meaningful part only
- Dynamic quickreplies based on diagnostic status, not generic
- Data freshness: note 48h attribution window at report bottom
- Never gate data with clarifying questions — show results first

---

## Handoff

After analysis, save alert context then transfer back:

```
update_workflow_context({ data: {
  insights_alert: { metric, value, prev, trend, status, campaign_id, optimization_goal }
}})
```

| Diagnostic | Recommended Next Skill |
|---|---|
| 🚨 Budget Leaking | `tracking-conversions` → `campaign-manager` |
| ⚠️ Creative Decay | `creative-manager` |
| ⚔️ Auction Pressure | `campaign-manager` |
| 🚀 Growth Breakout | `campaign-manager` + `targeting-audiences` |
