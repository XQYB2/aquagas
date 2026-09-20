# Changelog

## Unreleased — 2026-09-20

### New Features

- **Secure PayMongo QR Ph checkout** — authenticated customers can create payment sessions using server-only credentials, with payment status confirmed through signed webhooks.
- **Inventory-aware ordering** — products now include stock quantities, customers can only add available quantities, and checkout reserves stock atomically to prevent overselling.
- **Automatic stock restoration** — reserved inventory is returned when an eligible order is cancelled or removed.
- **30-minute inactivity timeout** — customer sessions remain available during active use and sign out after 30 minutes without activity.

### Improvements

- **Responsive dashboards** — customer, provider, and admin dashboards now adapt to narrow phones, tablets, and desktop screens with wrapping controls, mobile-safe charts, denser single-column cards, and truncation for long order details.
- **Mobile accessibility** — primary navigation and dashboard controls now use larger touch targets and expose menu state to assistive technology.
- **Centralized payment configuration** — obsolete provider wallet credential management was removed; PayMongo keys are configured through server environment variables.
- **Payment reliability and security** — payment session creation is rate-limited and locked against duplicate requests; webhook signatures enforce timestamp freshness and replay-safe processing.
- **Provider stock management** — providers can enter and update stock counts, while customers see live availability and out-of-stock states.

### Database Migrations

| # | Description |
|---|-------------|
| 015 | Add address category and default-address support |
| 016 | Add order cancellation reasons |
| 017 | Add provider automatic opening-hour schedule fields |
| 018 | Add inventory quantities, atomic order reservation, stock restoration triggers, and payment processing locks |

> Run migration 018 before deploying the inventory-aware checkout. Existing products intentionally start with zero stock and must be updated by providers.

## v1.3.1 — 2026-07-23

> **Branch:** `v1.3-dev` — merge to `main` when all migrations are confirmed in production.

### New Features

#### Batch Delivery (Free Scheduled Delivery)
- Providers can create weekly recurring **delivery slots** (day of week + time + max orders + cutoff window)
- Slots appear on the `/provider/slots` page in the sidebar (CalendarClock icon)
- Customers see a **Batch Delivery — Free** option at checkout when the provider has active slots
- Slot picker shows next occurrence date and disables slots past their cutoff
- Batch orders save `delivery_type = 'batch'`, `slot_id`, and `scheduled_at` on the order row
- Batch orders have **zero delivery fee** — total shown at checkout reflects subtotal only
- Provider **Batch Slots page** (`/provider/slots`):
  - Add recurring slot: pick day, time, max orders, cutoff minutes
  - Toggle slot Active / Paused without deleting it
  - Expand each slot to see current batch orders (customer name, address, items, status)
  - **Dispatch Batch** button — marks all `placed / confirmed / being_prepared` orders in that slot to `out_for_delivery` in one tap
- Customer **Orders list**: each card shows a delivery type pill — green "Batch Delivery · Mon Jul 28, 9:00 AM" or gray "Standard Delivery"
- Customer **Order detail**: dedicated card shows full scheduled date/time and "Free" badge for batch orders; delivery fee row shows "Free"

#### Nearby Stores (15 km Radius Filter)
- Home page now shows only stores within **15 km** of the customer's location
- Stores without a map pin set are completely hidden from browse
- Location sources (in priority order): GPS (`navigator.geolocation`), cached localStorage `aq-user-location`, first pinned saved address
- "Set your location" prompt with **Use my location** GPS button and "Use saved address" link when no location is set
- Green "Showing stores within 15 km" pill when location is active, with a "Change" link to reset
- Stores are sorted nearest-first
- Provider **Settings page** — new map pin section: drop a pin for exact store location; address field auto-fills from pin; pin coordinates saved to `providers.lat` / `providers.lng`; Save button activates when pin changes

#### Dark / Light Theme
- Theme toggle in the Navbar (Sun / Moon icon)
- Theme persists in localStorage (`aq-theme`)
- `ThemeProvider` applies both `data-theme` attribute and `.dark` Tailwind class to `<html>` so CSS variables and `dark:` variants work simultaneously
- Comprehensive dark mode coverage: cards, inputs, textareas, selects, navbar, bottom nav, status badges, banners, modals, address picker

#### Saved Delivery Locations with Categories
- Customers can save addresses with a category: **Home**, **Partner's House**, **Work**, or **Other** (each with a distinct icon and color)
- At checkout: after pinning a location on the map, tap "Save this location" → pick a category → saved
- Saved addresses appear as tappable chips at checkout — instantly fills address and flies the map to that pin
- Profile page: full saved address management — add (with map pin + category picker), delete, pinned badge (`📍 pinned`) shown when lat/lng is stored
- Saving a pinned address also caches lat/lng to localStorage for nearby store filtering

#### Cart Quantity Adjustment at Checkout
- Each cart item on the checkout page has **−** and **+** buttons
- Tapping **−** at qty = 1 shows a confirmation dialog ("Remove [item] from your cart?") before removing
- Uses the existing cart `UPDATE_QTY` dispatch (quantity 0 = remove)

#### AquaBot Voice Input
- Microphone button added to AquaBot chat input (only shown when `SpeechRecognition` / `webkitSpeechRecognition` is available)
- Language set to `en-PH`
- Button pulses red while listening; tap again or let speech end to stop
- Transcript fills the input field automatically

### Improvements

- **Order status banners** — active orders (`confirmed`, `awaiting_pickup`, `picked_up`, `being_prepared`, `out_for_delivery`) appear as colored action banners at the top of the orders list with contextual icons and sub-text
- **Cancel payment button** — `pending_payment` GCash orders show a Cancel button directly on the orders list card
- **Delivery type indicator** — all orders list cards and order detail pages show Standard vs Batch delivery type
- **Provider map pin save button** — fixed: Save button now activates when only the map pin changes (lat/lng were missing from the `changed` check)
- **Address picker always overwrites** — dropping a pin always updates the address field (previously only filled when empty)
- **AquaBot header X removed** — the floating FAB is the only open/close toggle; no duplicate X in header
- **Debug logs removed** — `console.log` statements cleaned from nearby store filter and payment create route
- **GCash retry button** — on `pending_payment` order detail, customer can retry the payment session if the original link expired
- **Delivery fee = Free on batch detail** — order detail fee row reads "Free" for batch orders instead of the provider's standard fee

### Database Migrations

Run these in order in the Supabase SQL Editor (see `supabase-migrations.sql`):

| # | Description |
|---|-------------|
| 012 | Add `pending_payment` to `orders_status_check` constraint |
| 013 | Add `lat`, `lng`, `label` columns to `customer_addresses` |
| 014 | Create `delivery_slots` table; add `delivery_type`, `slot_id`, `scheduled_at` to `orders`; RLS policies |

> **Migration 014 note:** `delivery_type` defaults to `'standard'` — no backfill needed for existing orders.

### New Files

- `app/provider/slots/page.tsx` — provider batch delivery slot management page
- `lib/theme-context.tsx` — `ThemeProvider` + `useTheme` hook

### Modified Files (key changes)

| File | Change |
|------|--------|
| `app/(customer)/page.tsx` | Haversine 15 km filter, location prompt, nearby store sort |
| `app/(customer)/checkout/page.tsx` | Cart qty controls, saved address chips, batch slot picker, delivery type section |
| `app/(customer)/orders/page.tsx` | Active order banners, cancel payment button, delivery type pill |
| `app/(customer)/orders/[id]/page.tsx` | Delivery type card, batch scheduled date, free delivery fee, GCash retry |
| `app/(customer)/profile/page.tsx` | Saved address categories, map pin, pinned badge |
| `app/(customer)/layout.tsx` | ThemeProvider wrapper |
| `app/provider/settings/page.tsx` | Map pin section, lat/lng save, always-overwrite address |
| `app/api/payment/create/route.ts` | Separate provider key fetch (fixes join ambiguity) |
| `components/customer/Navbar.tsx` | Theme toggle (Sun/Moon), full dark mode |
| `components/customer/BottomNav.tsx` | Full dark mode |
| `components/customer/AquaBot.tsx` | Voice input (Mic/MicOff), dark mode, removed header X |
| `components/provider/ProviderSidebar.tsx` | Batch Slots nav item (CalendarClock) |
| `components/provider/OrderStatusBadge.tsx` | `pending_payment` added to all three status maps |
| `lib/provider-context.tsx` | `lat`/`lng` added to ProviderStore type |
| `app/globals.css` | Full dark mode CSS variable overrides for all Tailwind color classes |
| `supabase-migrations.sql` | Migrations 012, 013, 014 |

---

## v1.3.0 — 2026-07-22

### New Features

#### QR Ph / PayMongo Payment Integration
- QR Ph payment option at checkout using the platform PayMongo account
- PayMongo credentials are stored only in server environment variables
- New **Wallet** page in the provider sidebar to manage GCash keys and view webhook URL
- Webhook endpoint (`/api/payment/webhook`) verifies PayMongo signatures and promotes orders from `pending_payment` → `placed` on payment confirmation
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
- Centralized PayMongo configuration managed by the platform
- One-tap copy for the webhook URL
- Webhook secret handled server-side automatically — providers don't need to configure it

### Improvements

- **Order ID on orders list** — each order card shows a short `#XXXXXX` reference ID
- **Correct payment method display** — provider order detail shows GCash or Cash on Delivery correctly (was always showing COD before)
- **Provider dashboard no longer reloads on tab switch** — fixed `onAuthStateChange` firing on `TOKEN_REFRESHED` / `INITIAL_SESSION` events
- **AquaBot** — never asks the customer for an order ID; improved trigger words for recent order queries
- **Map container error fixed** — "Map container is already initialized" resolved by adding stable `key` props to all `MapContainer` instances
- **OrderStatusBadge crash fixed** — safe fallback for unknown status values instead of destructure crash
- **Admin dashboard** — provider payment credentials removed; PayMongo is configured server-side

### Database Migrations

| # | Description |
|---|-------------|
| 008 | `payment_status`, `payment_method`, `paymongo_intent_id` columns on `orders` |
| 009 | RLS policy — customers can cancel their own orders |
| 010 | `product-images` storage bucket + policies |
| 011 | Removes obsolete provider-level gateway credentials |
| 012 | Add `pending_payment` to `orders_status_check` constraint |
| 013 | Add `lat`, `lng`, `label` columns to `customer_addresses` |

### New Files

- `app/api/payment/create/route.ts` — creates a PayMongo QR Ph source
- `app/api/payment/webhook/route.ts` — receives, verifies, and captures PayMongo payments
