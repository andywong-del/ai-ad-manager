---
name: ad-gallery
description: Search and analyze competitor ads from Meta Ad Library — competitive research, creative inspiration, and market intelligence.
layer: system
---

# Ad Library (Competitor Research)

## Tools

- `search_ad_library(search_terms, ad_reached_countries, ad_type?, limit?)` — search Meta Ad Library for competitor/industry ads

## Search Flow

### When User Asks to Research Competitors

**Step 1: Collect search parameters**
Required:
- **Search terms**: brand name, keyword, or industry (e.g. "Nike", "skincare", "meal delivery")
- **Countries**: which markets to search (e.g. ["HK"], ["US","GB"])

If the user doesn't specify a country, ask or use the ad account's country.

**Step 2: Execute search**
```
search_ad_library(search_terms="Nike", ad_reached_countries=["HK"], limit=12)
```

**Step 3: Display results**
Format results using the `adlib` block — the UI renders these as visual ad cards:

```adlib
[
  {"page_name":"Nike Hong Kong","headline":"Just Do It","body":"New collection available now...","ad_snapshot_url":"https://...","started":"2026-03-15"},
  {"page_name":"Nike Hong Kong","headline":"Air Max Day","body":"Celebrate with exclusive drops...","ad_snapshot_url":"https://...","started":"2026-03-20"}
]
```

**Step 4: Provide analysis**
After showing ads, provide competitive insights:

```insights
[
  {"severity":"info","title":"Ad Volume","desc":"Nike HK is running 24 active ads — high activity suggests seasonal push","action":"See all"},
  {"severity":"success","title":"Creative Pattern","desc":"80% video ads, 20% carousel — video-first strategy","action":"Analyze"},
  {"severity":"info","title":"Copy Themes","desc":"Urgency + exclusivity: 'Limited edition', 'Only on Nike.com'","action":"Note"}
]
```

```quickreplies
["Search Another Brand", "Analyze Their Strategy", "Create Similar Ad", "Save Insights"]
```

## Common Research Scenarios

### 1. Direct Competitor Research
User: "Show me what [competitor] is running"
→ `search_ad_library(search_terms="[competitor]", ad_reached_countries=["HK"])` 
→ Show ads + analyze creative patterns, copy themes, CTAs

### 2. Industry Research
User: "What ads are running in the skincare space in HK?"
→ `search_ad_library(search_terms="skincare", ad_reached_countries=["HK"], limit=12)`
→ Group by advertiser, identify trends

### 3. Creative Inspiration
User: "I need ideas for my campaign"
→ Ask what industry/product, then search relevant terms
→ Highlight standout creatives and explain why they work

### 4. Market Entry Research
User: "What's the ad landscape in [country] for [product]?"
→ Search multiple terms, analyze volume and patterns
→ Provide market entry recommendations

## Analysis Framework

When analyzing competitor ads, cover:

1. **Volume**: How many ads are they running? (high volume = aggressive spend)
2. **Creative Mix**: Ratio of video/image/carousel
3. **Copy Patterns**: Common themes, CTAs, tone of voice
4. **Offer Strategy**: Discounts, free trials, urgency tactics
5. **Landing Strategy**: Where are they driving traffic?
6. **Recency**: Are they scaling up or winding down?

Present as structured insights, not walls of text.

## Country Codes Reference
Common markets:
- `HK` — Hong Kong
- `TW` — Taiwan
- `US` — United States
- `GB` — United Kingdom
- `SG` — Singapore
- `MY` — Malaysia
- `JP` — Japan
- `AU` — Australia
- `CA` — Canada

## After Research

Always offer actionable next steps:

```quickreplies
["Search Another Brand", "Create Similar Ad", "Save to Brand Library", "Analyze My Ads vs Theirs"]
```
