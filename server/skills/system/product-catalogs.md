---
name: product-catalogs
description: Manage product catalogs, feeds, product sets for dynamic product ads.
layer: system
---

# Product Catalogs

## Tools

- `get_catalogs()` — list catalogs
- `get_catalog_products(catalog_id)` — list products in catalog
- `get_product_sets(catalog_id)` — list product sets
- `create_product_set(catalog_id, name, filter)` — create filtered product set
- `update_product(catalog_id, product_id, data)` — update product info
- `batch_update_products(catalog_id, updates)` — bulk update products

## Common Tasks

### View catalog
1. List catalogs → pick one → show products with stats

### Create product set
1. Collect: catalog, filter rules (category, price range, availability)
2. Create set and show matching product count

### Update products
1. Select products to update
2. Collect changes (price, availability, title, etc.)
3. Apply batch update and confirm

## Rules

- Show product count and sample products when listing
- Confirm batch operations before executing
