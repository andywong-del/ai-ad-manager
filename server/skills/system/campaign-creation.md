---
name: campaign-creation
description: Smart campaign creation flow — collects only missing info, adapts to what the user already provided.
layer: system
---

# Campaign Creation

## Approach

**Be adaptive, not rigid.** Parse what the user already provided, identify what's missing, and only ask for the gaps. Never re-ask for information the user already gave.

## FIRST ACTIONS (parallel)

```
get_workflow_context()
get_ad_account_details()
get_minimum_budgets()
get_pages()
```

## Scenario Detection

Detect from user message:

| Scenario | Signal | Behavior |
|---|---|---|
| Materials-first | Message has `[Uploaded image:` or `[Uploaded video:` tokens | Skip creative collection, go straight to strategy + audience |
| Boost | "boost", "promote post" | Fetch posts, let user pick, then budget + audience |
| Guided | No materials, no boost, no doc | Collect strategy → audience → creative |
| Bulk | `[Document:` prefix + campaign plan | Parse doc, confirm campaigns, execute |
| Clone | "duplicate", "clone", "copy" + campaign reference | Copy existing, ask what to change |

## Required Information Checklist

Collect ALL of these before execution. Skip any the user already provided:

### Strategy (what)
- [ ] **Objective** — What's the goal? (Sales, Leads, Traffic, Awareness, Engagement, App installs)
- [ ] **Budget** — How much per day? (Default: account minimum × 2)
- [ ] **Page** — Which Facebook page? (Auto-select if only one)

### Audience (who)
- [ ] **Location** — Which countries/cities? (Default: ad account country)
- [ ] **Targeting** — Saved audience, custom audience, lookalike, or interest-based? (Default: broad/Advantage+)

### Creative (how it looks)
- [ ] **Media** — Image(s) or video(s) (may already be uploaded)
- [ ] **Ad copy** — Primary text, headline, description (auto-generate if not provided)
- [ ] **CTA** — Call to action button (Default based on objective: Sales→SHOP_NOW, Leads→SIGN_UP, Traffic→LEARN_MORE)
- [ ] **Destination** — URL or messaging app (required for most objectives)

## Smart Defaults (pre-fill, never ask)

| Field | Default |
|---|---|
| Campaign name | `[Objective] — [Today's Date]` |
| special_ad_categories | `[]` |
| bid_strategy | `LOWEST_COST_WITHOUT_CAP` |
| billing_event | `IMPRESSIONS` |
| Age | 18-65 |
| Gender | All |
| Placements | Advantage+ (automatic) |

## Flow Rules

1. **Parse first, ask second** — Extract everything you can from the user's message before asking anything
2. **Group questions** — Don't ask one field at a time. Show what you've collected so far and ask for all missing fields at once
3. **Confirm before executing** — Show a summary of all settings and get user confirmation before creating anything
4. **Use cards for choices** — Present options as interactive cards, not text lists. Use `setupcard` for the summary, `options` for choices, `quickreplies` for actions
5. **No API calls until confirmed** — Collect everything into `workflow_context` first. Only create campaign/adset/ad after user confirms

## Execution

When all required info is collected and user confirms:

1. `load_skill("campaign-setup")` — for any remaining setup details
2. `load_skill("creative-assembly")` — if creative needs processing
3. `load_skill("ad-launcher")` — to execute: create campaign → ad set → creative → ad → preflight → activate

## Ad Copy Auto-Generation

If user hasn't provided ad copy, generate 3 variations using:
- **Hook** — Attention-grabbing first line
- **Body** — Value proposition
- **CTA** — Clear next step

Frameworks: Problem/Solution, Before/After, Social Proof. Match tone to the product/service.
