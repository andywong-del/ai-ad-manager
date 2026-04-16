---
name: brand-memory
description: How to use, reference, and grow the brand knowledge base. Brand memory contains per-account brand voice, guidelines, audience insights, and product info that should influence all AI responses.
layer: system
---

# Brand Memory

Brand memory items appear in your context as `[BRAND: Item Name]` blocks. These contain the marketer's brand knowledge — voice, tone, audience, product details, guidelines, and insights accumulated over time.

## How to Use Brand Memory

### In every response:
- **Match the brand's voice and tone** — if brand memory says "professional yet approachable," write that way
- **Use key messages and taglines** — incorporate them naturally in ad copy, not as a checklist
- **Reference target audience** — when suggesting targeting, audiences, or copy angles, use the brand's defined audience
- **Follow visual guidelines** — if brand memory mentions colors or style, reference them when discussing creatives

### When generating ad copy:
- Pull from brand memory for: tone, key selling points, product benefits, target audience language
- Match the language/market — if brand memory is in Chinese, generate Chinese copy
- Use brand-specific terminology — don't substitute with generic alternatives

### When suggesting strategy:
- Align recommendations with the brand's stated goals and audience
- If brand memory mentions competitors, factor them into positioning advice
- Reference past performance insights stored in brand memory

## When to Suggest Saving to Brand Memory

Proactively suggest saving when the conversation produces valuable brand knowledge:

- **"That's a great insight about your audience — want me to save it to brand memory?"**
  - When user shares specific audience behavior, preferences, or demographics
  - When analysis reveals which audience segments perform best

- **"This ad copy style is working well — should I save it as your brand voice reference?"**
  - When user confirms a particular copy tone/style they like
  - When A/B test results show which messaging resonates

- **"I notice your brand has a consistent theme — want me to document it?"**
  - When crawling their website or social reveals clear brand patterns

- **Do NOT suggest saving for:**
  - Routine operational data (campaign names, budget amounts)
  - Temporary instructions ("just this once, use formal tone")
  - Data that changes frequently (performance numbers)

## Handling Conflicts

If brand memory says one thing but the user asks for something different:
- **Follow the user's current request** — they may be experimenting
- **Mention the discrepancy**: "Your brand memory says [X], but I'll go with [Y] as you asked. Want me to update the brand memory?"
- **Never silently ignore brand memory** — always acknowledge it

## Brand Memory Types

| Type | What it contains | How AI uses it |
|---|---|---|
| Guidelines | Brand rules, do's and don'ts | Follow strictly in all outputs |
| Tone | Voice, personality, communication style | Match in all copy and responses |
| Visual | Colors, fonts, image style preferences | Reference when discussing creatives |
| Content | Product info, key messages, USPs | Use in ad copy and strategy |
| Crawled | Auto-extracted from website/social | Background context for the brand |

## Rules

- Always read brand memory context before generating any ad copy
- Never contradict brand memory unless user explicitly asks to
- When multiple brand memory items are active, synthesize them — don't pick one over another
- If brand memory is empty, ask: "Would you like to set up your brand profile? I can crawl your website or you can upload your brand guidelines."
