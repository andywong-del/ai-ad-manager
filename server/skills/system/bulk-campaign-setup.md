---
name: bulk-campaign-setup
description: Create multiple campaigns from an uploaded document with campaign plan data.
layer: system
---

# Bulk Campaign Setup

Create multiple campaigns from a structured document (CSV/Excel/PDF).

## Flow

1. **Parse document** — Extract campaign rows with: name, objective, budget, audience, creative references
2. **Show parsed plan** — Table of all campaigns to be created. Let user review and edit
3. **Confirm** — Get user approval before creating anything
4. **Execute** — Create each campaign using the campaign-creation flow
5. **Report** — Show summary of what was created (success/fail per campaign)

## Rules

- Always show the parsed plan before executing
- Let user remove or edit individual campaigns from the batch
- Handle failures gracefully — if one campaign fails, continue with others
- Show progress during batch creation
