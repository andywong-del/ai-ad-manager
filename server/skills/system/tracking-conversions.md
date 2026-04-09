---
name: tracking-conversions
description: Set up pixels, server-side conversion events (CAPI), and custom conversions.
layer: system
---

# Tracking & Conversions

## Tools

- `get_pixels()` — list pixels for the ad account
- `create_pixel(name)` — create a new pixel
- `get_pixel_events(pixel_id)` — check which events are firing
- `send_conversion_event(pixel_id, event_name, event_data)` — send server-side event via CAPI
- `create_custom_conversion(pixel_id, name, rule)` — create custom conversion rule

## Common Tasks

### Check pixel health
1. `get_pixels()` → list installed pixels
2. `get_pixel_events(pixel_id)` → show which events are firing, last fired time
3. Flag any issues: no events in 24h, missing standard events

### Set up CAPI
1. Guide user through server-side event setup
2. Test with `send_conversion_event()` 
3. Verify event received

### Create custom conversion
1. Collect: pixel, URL rule or event name, conversion name
2. `create_custom_conversion()` → create and confirm

## Rules

- Always check current pixel status before making changes
- Show clear success/failure status for test events
