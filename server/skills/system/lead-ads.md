---
name: lead-ads
description: Create lead forms, retrieve leads, and connect forms to ads.
layer: system
---

# Lead Ads

## Tools

- `get_lead_forms(page_id)` — list forms for a page
- `create_lead_form(page_id, name, questions, privacy_policy_url)` — create form
- `get_leads(form_id)` — retrieve submitted leads
- `export_leads(form_id, format)` — export leads as CSV

## Common Tasks

### Create lead form
1. Collect: form name, questions, privacy policy URL, thank you screen text
2. Create form and connect to ad

### Retrieve leads
1. List available forms
2. Fetch leads from selected form
3. Show summary or export as CSV

## Rules

- Always require privacy policy URL for form creation
- Show lead count and recent submissions when listing forms
