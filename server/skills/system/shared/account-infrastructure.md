---
name: account-infrastructure
description: Business manager, pixels, CAPI, lead forms, product catalogs, automation rules — account setup and infrastructure tools.
layer: system
---

# Account Infrastructure

## Business Manager Tools

- `/api/meta/adaccounts` — list ad accounts
- `/api/meta/businesses` — list businesses
- `/api/meta/pages` — list pages
- `/api/meta/batch` — batch multiple API calls

## Pixel & Tracking Tools

- `get_pixels()` — list pixels
- `create_pixel(name)` — create pixel
- `get_pixel_events(pixel_id)` — check events firing
- `send_conversion_event(pixel_id, event_name, event_data)` — server-side CAPI event
- `create_custom_conversion(pixel_id, name, rule)` — custom conversion rule

## Lead Form Tools

- `get_lead_forms(page_id)` — list forms
- `create_lead_form(page_id, name, questions, privacy_policy_url)` — create form
- `get_leads(form_id)` — retrieve leads
- `export_leads(form_id, format)` — export as CSV

## Product Catalog Tools

- `get_catalogs()` — list catalogs
- `get_catalog_products(catalog_id)` — list products
- `get_product_sets(catalog_id)` — list product sets
- `create_product_set(catalog_id, name, filter)` — create product set
- `update_product(catalog_id, product_id, data)` — update product
- `batch_update_products(catalog_id, updates)` — bulk update

## Automation Rules Tools

- `/api/rules` — CRUD for automation rules (auto-pause, auto-scale, notifications)
- `/api/labels` — CRUD for labels + assign to objects
- `/api/meta/block-lists` — manage block lists

## Rules

- Always check current status before making changes
- Require privacy policy URL for lead forms
- Confirm batch operations before executing
- Show clear success/failure for all operations
