# AquaGas

On-demand water gallon & LPG gas delivery — customer app + provider portal built with Next.js 14 and Supabase.

---

## Changelog

### v1.2 — Maps, AI Chatbot, New Order Flow (2026-07-15)

#### New Features
- **AquaBot** — floating AI chat widget powered by Gemini 3.1 Flash Lite; reads live Supabase data (stores, products, orders) to answer customer questions
- **Leaflet Maps
  - Store map on store detail page
  - Address picker on checkout — click to pin delivery location, "Use my location" GPS button that flies the map to your position
  - Delivery map on provider order detail — shows customer pin, rider's current GPS location, and a "Navigate with Google Maps" button for directions
  - Orders map on provider dashboard — color-coded pins for all active customer orders
  - All maps have a "My Location" button that zooms to current GPS position
- **7-step order flow** replacing the old 3-step flow:
  - `placed → confirmed → awaiting_pickup → picked_up → being_prepared → out_for_delivery → delivered`
  - Water orders: customer instructed to put empty gallons outside for pickup
  - LPG orders: customer instructed to place empty cylinder outside; stepper labels adjusted ("Place Empty Cylinder Outside", "Cylinder Picked Up", "Refilling Your LPG")
- **Estimated delivery time** — provider can set a per-order ETA (e.g. "30-45 minutes") that displays on the customer's order tracking page
- **Role-based routing** — providers logging in are automatically redirected to `/provider`; customers are blocked from accessing provider routes
- **Google login + password reset** — OAuth callback checks role and routes correctly; `PASSWORD_RECOVERY` event handled in auth context redirects to `/auth/reset`
- **Bottom nav bar** — mobile fixed bottom navigation for customer app (Home, Cart, Orders, Profile) with raised circular cart button

#### Changes
- Provider login page removed — single `/login` page handles both roles
- Provider login page (`/provider/login`) deleted; `ProviderSidebar` logout now redirects to `/login`
- `AuthGuard` now redirects providers to `/provider` instead of showing the customer dashboard
- Provider orders list and dashboard updated with new status tabs (`awaiting_pickup`, `picked_up`, `being_prepared`)
- Customer name on provider order detail now fetched via a separate profiles query (fixes RLS join issue showing "Customer")

#### Database (run `supabase-migrations.sql`)
```sql
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS estimated_delivery  text,
  ADD COLUMN IF NOT EXISTS pickup_instruction  text,
  ADD COLUMN IF NOT EXISTS delivery_lat        double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng        double precision;
```
Also adds RLS policy so providers can read profiles of their own customers.


### v1.0 — Initial Platform

#### Customer App (`/`)
| Route | Page |
|-------|------|
| `/` | Homepage — browse & filter stores |
| `/store/[id]` | Store detail + add to cart |
| `/checkout` | Checkout with COD |
| `/orders` | My orders list |
| `/orders/[id]` | Order tracking + cancel + review |
| `/login` | Sign in (email or Google) |
| `/register` | Create account |
| `/auth/reset` | Password reset |

#### Provider Portal (`/provider`)
| Route | Page |
|-------|------|
| `/provider/dashboard` | Stats, revenue chart, active orders, delivery map |
| `/provider/orders` | All orders with status filter tabs |
| `/provider/orders/[id]` | Order detail + status actions + delivery map |
| `/provider/products` | Add / edit / toggle / delete products |
| `/provider/settings` | Store info, hours, delivery fee |

---

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 14 (App Router) |
| Auth & DB | Supabase |
| Styling | Tailwind CSS |
| Maps | Leaflet + OpenStreetMap (free) |
| AI | Gemini 3.1 Flash Lite |
| Icons | Lucide React |

---

## Run Locally

```bash
npm install
npm run dev
```

Copy `.env.local.example` to `.env.local` and fill in your Supabase and Gemini keys:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
GEMINI_API_KEY=AQ...
```

---

## Database Setup

1. Create a free project at supabase.com
2. SQL Editor → run `supabase-schema.sql`
3. SQL Editor → run `supabase-migrations.sql`
4. To promote a user to provider role:
   ```sql
   UPDATE profiles SET role = 'provider' WHERE email = 'your@email.com';
   ```

---

## Roadmap

- Mobile app (React Native / Expo — same Supabase backend)
- In-app payments (PayMongo)
- SMS notifications (Semaphore)
- Live GPS delivery tracking
- Provider subscription / commission billing
