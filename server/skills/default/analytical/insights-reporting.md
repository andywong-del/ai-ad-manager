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
| A — 預算配比效率 | "overview", "how are my ads", "last 7 days", general check-in | Spend efficiency across funnel stages — is TOFU/MOFU/BOFU balanced? |
| B — 素材 vs 市場 | "why is cost high", "diagnose", "what's wrong" | Creative Decay vs Auction Pressure — walk through causal evidence |
| C — 資本損耗 | "what should I pause", "worst performers", "stop loss" | Quantify capital hemorrhage, generate kill list |
| D — 邊際紅利 | "which should I scale", "best performers", "add budget" | Find low-freq low-CPA winners with scaling room |

Default if unclear → Scenario A.

---

## Funnel Classification

Classify each campaign by optimization_goal:
- **TOFU 引流**: REACH, LINK_CLICKS, THRUPLAY, LANDING_PAGE_VIEWS, POST_ENGAGEMENT
- **MOFU 興趣**: CONVERSATIONS, LEAD_GENERATION
- **BOFU 轉化**: OFFSITE_CONVERSIONS, VALUE, APP_INSTALLS

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

**ROAS rule:** Only compute when goal = VALUE or OFFSITE_CONVERSIONS+purchase. Never for messaging/leads.

---

## Data (already loaded by analyze_performance)

`analyze_performance()` returns:
```
{ current_7d, previous_7d, baseline_30d, _benchmarks, account_summary }
```

`_benchmarks[goal]` = { avg_cost_per_result, total_spend, total_results, campaign_count, primary_action_type }

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

**Frequency signal:** ≤3 healthy, 3-5 saturation approaching, >5 audience saturated.

---

## Output Format — Two Panels, Zero Redundancy

Text appears in BOTH panels. Canvas blocks + tables appear ONLY in canvas. Write ALL chat text first, then canvas blocks at the end with NO text between them.

### LEFT PANEL — Chat（深度診斷報告）

1. **[Executive Summary]** — 1 句盤面定調（dominant status + total spend + key finding）
2. **[Full Funnel Strategy]** — TOFU 引流 / MOFU 興趣 / BOFU 轉化 sub-headers, spend share vs result share
3. **[Five Pillars Analysis]**:
   - 🎯 漏斗策略 (Funnel Strategy) — TOFU/MOFU/BOFU 預算配比
   - 🎨 素材疲勞 (Creative Fatigue) — Hook Rate + Frequency 交叉分析
   - 👥 受眾精準度 (Audience Targeting) — Frequency 飽和度
   - 💰 預算節奏 (Budget Pacing) — Daily spend 穩定性
   - 📱 渠道拆解 (Split Channel) — 各 placement 表現差異
4. **[Action Plan]** — `steps` block: 🚨 即時止血 → 📈 分階段加碼 → 🎨 素材迭代
5. `insights` block — top 3 severity-coded findings
6. `quickreplies` — 4 diagnostic-aware buttons

### RIGHT PANEL — Canvas（Meta Ads 視覺儀表板）

Emit blocks back-to-back, NO text between:
1. `metrics` — KPI Overview (Spend, Results, CPR, CTR with WoW%)
2. `budget` — Donut chart: 預算分佈 by funnel stage (TOFU/MOFU/BOFU)
3. `comparison` — Bar chart: 本週 vs 上週 CPA by campaign (a_label="上週", b_label="本週")
4. `trend` — Line chart: 7日 Daily Spend + Conversions
5. Campaign table (markdown): 狀態 | 廣告名稱 | 消耗 | 成本 | WoW | 操盤建議

### Constraints
- Messaging campaigns: 絕對不准出現 ROAS
- Every metric includes WoW% (🔴 > +15%, 🟡 ±15%, 🟢 < -15%)
- Strip campaign name prefixes (Sales_Wts_FB_ etc)
- 註明 48h attribution window at report bottom
- Chat 內不准重複 Canvas 嘅表格數字

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
