# Changelog

## v1.3.0 — 2026-07-22

### New Features

#### GCash / Konfirma Payment Integration
- GCash payment option at checkout — only appears when the provider has configured their Konfirma keys
- Per-provider Konfirma keys (Public Key, Secret Key, Wallet Account ID) stored in the `providers` table
- New **Wallet** page in the provider sidebar to manage GCash keys and view webhook URL
- Webhook endpoint (`/api/payment/webhook`) verifies Konfirma signatures and promotes orders from `pending_payment` → `placed` on payment confirmation
- GCash orders are hidden from the provider until payment is confirmed — no more ghost orders appearing before payment

#### Order Payment Flow
- New `pending_payment` order status — inserted when customer selects GCash at checkout
- Customer sees an "Awaiting GCash Payment" banner on the order detail page while payment is pending
- Order detail page auto-updates via Supabase Realtime when webhook confirms payment — no manual refresh needed
- Orphaned orders (GCash session creation failed) are automatically deleted before showing the customer an error

#### Cancel Rules
- **GCash orders** — cancellable only before payment is confirmed; locked once paid with a clear message
- **COD orders** — cancellable up to `awaiting_pickup`; locked once gallons are picked up
- Cancel rules apply on both customer and provider order detail pages

#### Product Photos
- Providers can upload a product photo when adding or editing a product
- Photos stored in Supabase Storage (`product-images` bucket)
- Fallback to category emoji (💧 / 🔥) when no photo is set

#### Saved Delivery Locations
- Customers can save delivery locations with a category: **Home**, **Partner's House**, **Work**, or **Other**
- After pinning a location on the map at checkout, tap "Save this location" and pick a category
- Saved addresses appear as tappable chips at checkout — instantly fills address + flies map to that pin
- Profile page shows saved addresses with category icons and colors; supports adding and deleting

#### Provider Wallet Page
- Dedicated `/provider/wallet` page in the sidebar for managing Konfirma GCash keys
- Status card shows green "GCash Active" or amber warning when not yet configured
- One-tap copy for the webhook URL
- Webhook secret handled server-side automatically — providers don't need to configure it

### Improvements

- **Order ID on orders list** — each order card shows a short `#XXXXXX` reference ID
- **Correct payment method display** — provider order detail shows GCash or Cash on Delivery correctly (was always showing COD before)
- **Provider dashboard no longer reloads on tab switch** — fixed `onAuthStateChange` firing on `TOKEN_REFRESHED` / `INITIAL_SESSION` events
- **AquaBot** — never asks the customer for an order ID; improved trigger words for recent order queries
- **Map container error fixed** — "Map container is already initialized" resolved by adding stable `key` props to all `MapContainer` instances
- **OrderStatusBadge crash fixed** — safe fallback for unknown status values instead of destructure crash
- **Admin dashboard** — Konfirma key management per provider (view and save PK, SK, Wallet ID, Webhook Secret)

### Database Migrations

Run these in order in the Supabase SQL Editor (see `supabase-migrations.sql`):

| # | Description |
|---|-------------|
| 008 | `payment_status`, `payment_method`, `paylisten_session_id` columns on `orders` |
| 009 | RLS policy — customers can cancel their own orders |
| 010 | `product-images` storage bucket + policies |
| 011 | `konfirma_pk`, `konfirma_sk`, `konfirma_wallet_id`, `konfirma_webhook_secret` on `providers` |
| 012 | Add `pending_payment` to `orders_status_check` constraint |
| 013 | Add `lat`, `lng`, `label` columns to `customer_addresses` |

### New Files

- `app/api/payment/create/route.ts` — creates a Konfirma payment session
- `app/api/payment/webhook/route.ts` — receives and verifies Konfirma payment webhooks
- `app/provider/wallet/page.tsx` — provider GCash key management page
