# AquaGas System Technical Documentation

> Scope: confirmed from the website repository (`aquagas1`), customer mobile repository (`aquagas-mobile`), and provider mobile repository (`aquagas-provider-mobile`). Secret values are intentionally excluded. Recommendations are labeled separately.

## 1. System overview

AquaGas is a multi-platform marketplace for ordering water-refilling and LPG products from nearby providers. It solves the problem of finding a local supplier, comparing availability and delivery details, placing and paying for an order, and following fulfillment without relying only on calls or messages.

The system has three user groups:

- **Customers** browse stores, manage a cart, order, pay, track, chat, review, reorder, and save addresses/stores.
- **Providers** manage their store, products, stock, orders, delivery slots, maps, sales analytics, wallet, and customer communication.
- **Administrators** oversee providers, customers, orders, payouts, refunds, reports, platform settings, audit activity, and administrator permissions.

It consists of a responsive web application, a customer Android/iOS Expo application, a provider Android/iOS Expo application, Next.js server APIs, and a Supabase backend.

### Overall workflow

1. A user signs in through Supabase Authentication.
2. The frontend loads role-appropriate records from Supabase.
3. A customer selects a provider and products, then checks out.
4. Order creation reserves inventory in the database.
5. COD continues immediately; QR Ph calls the PayMongo server API.
6. Providers accept, prepare, and deliver the order.
7. Supabase Realtime updates order screens and chat.
8. A database webhook calls the notification API, which sends Expo push notifications.
9. Delivered orders contribute to provider analytics and QR Ph wallet balances.

## 2. Technology stack

| Technology | Version | Category | Purpose and location | Why suitable |
|---|---:|---|---|---|
| Next.js | 14.0.4 | Web/full stack | App Router pages and APIs in `app/` | One project supports responsive UI and protected server endpoints. |
| React | 18 web; 19.2.3 mobile | UI | Web components and React Native screens | Shared component/state model across platforms. |
| TypeScript | 5 web; 6 mobile | Language | Website and customer mobile type checking | Detects incorrect data and props during development. |
| React Native | 0.86.3 | Mobile | Native customer/provider interfaces | Produces Android and iOS interfaces from React code. |
| Expo | 57.0.24 | Mobile platform | App configuration, development, native APIs, builds | Simplifies native build and device-service integration. |
| React Navigation | 7.x | Mobile routing | Tabs/stacks under each mobile `navigation/` folder | Standard native navigation and deep linking. |
| Tailwind CSS | 3.3.0 | Web styling | Responsive utility classes throughout web pages | Fast, consistent responsive layouts. |
| Supabase JS | 2.39 web; 2.110 mobile | Backend SDK | Auth, Postgres queries, Storage and Realtime | Provides managed backend services with one client SDK. |
| PostgreSQL/Supabase | Managed | Database/backend | Application data, RPC functions, triggers and RLS | Relational transactions suit orders, stock and payments. |
| Supabase Realtime | Managed | Realtime | Order updates, chat messages, typing/presence | Pushes database changes without repeated polling. |
| PayMongo | REST API | Payments | QR Ph intents, methods, attachment, status and webhook | Supports Philippine QR Ph payments. |
| Google Gemini | `@google/generative-ai` 0.24.1 | AI | Customer `/api/chat` and provider `/api/provider-chat` | Generates contextual marketplace assistance. |
| Expo Notifications | 57.0.20 | Push | Device registration and closed-app notifications | Delivers notifications to installed Android/iOS builds. |
| Leaflet/React Leaflet | 1.9.4/4.2.1 | Maps | Web store, delivery and address maps | Open map rendering with coordinate markers. |
| OpenStreetMap | External map data | Maps | Leaflet tiles/location display | Accessible map data without a proprietary map SDK. |
| Lucide/Ionicons | 0.303/Expo icons | Icons | Web/mobile interface icons | Consistent accessible icons instead of emoji. |
| Node test runner | Node 20 compatible | Testing | `tests/critical-flows.test.mjs` | Lightweight automated checks for critical safeguards. |
| EAS Build | Configured | Mobile deployment | `eas.json` and Expo project IDs | Produces signed APK/AAB builds with native notification support. |

## 3. Development tools

- **Package manager:** npm, using `package.json` and `package-lock.json` in all three repositories.
- **Version control:** Git is configured in the repositories. A specific remote host cannot be confirmed solely from the inspected files.
- **Database management:** Supabase Dashboard/SQL Editor and Supabase CLI migration files.
- **Testing:** `npm test`, `npm run typecheck`, `npm run build`, Expo Android export, device/emulator testing, and browser developer tools.
- **Deployment:** the production API base is `https://www.aquagas.shop`; mobile builds use Expo/EAS. The exact web hosting provider is not conclusively defined by a checked configuration file.
- **Editor/design tools:** not confirmable from source code; Visual Studio Code or another editor may be used, but this is not proven.

## 4. Project structure

### Website (`aquagas1`)

- `app/`: Next.js routes. Route groups separate authentication and customer pages.
- `app/(customer)/`: marketplace, store, cart/checkout, orders, notifications and profile.
- `app/provider/`: provider dashboard, products, orders, slots, map, wallet, analytics and settings.
- `app/admin/`: administration dashboard and operational pages.
- `app/api/`: trusted server APIs for payments, AI, notifications and admin operations.
- `components/`: reusable navigation, customer, provider, admin, map and chat components.
- `lib/`: Supabase clients, contexts, authenticated requests, themes and utilities.
- `supabase/migrations/`: versioned schema changes.
- `supabase-migrations.sql`: earlier/core SQL functions used by critical ordering tests.
- `tests/critical-flows.test.mjs`: automated ordering/payment safety checks.
- `app/layout.tsx`: web root entry layout; `app/page.tsx`: public landing page.

### Customer mobile (`aquagas-mobile`)

- `index.ts`: application entry.
- `App.tsx`: root providers, authentication state, navigation container and notification deep links.
- `navigation/`: authentication stack, tabs and Browse/Cart/Orders/Profile stacks.
- `screens/`: login, registration, browse, store, cart, checkout, orders, profile, notifications, AquaBot and legal screens.
- `components/`: reusable maps, chat and interface parts.
- `lib/`: Supabase, authentication, cart, notifications, offline handling and theme.
- `app.json`, `eas.json`: Expo/native build configuration.

### Provider mobile (`aquagas-provider-mobile`)

- `index.js`, `App.jsx`: entry, provider context and navigation.
- `navigation/ProviderTabs.jsx`: Dashboard, Orders, Products, Delivery Map and More stacks.
- `screens/`: operational provider screens including Wallet and Analytics.
- `lib/provider-context.js`: provider session and shared store/product/order operations.
- `lib/notifications.js`: safe Expo Go handling and full APK push registration.

## 5. Frontend architecture

The web uses Next.js file-based routes. Mobile uses React Navigation native stacks and bottom tabs. Shared application state is handled through React Context:

- `lib/auth-context.tsx`: web authentication/profile.
- `lib/cart-context.tsx`: web cart and persistence.
- `lib/provider-context.tsx`: provider web store/products/orders.
- Mobile equivalents live in each mobile app's `lib/` directory.

Forms validate required values before database/API calls. Examples include checkout address/payment validation, whole-number stock validation, image size below 10 MB, standardized product units, cancellation reasons, and provider profile validation. Responsive web pages use Tailwind breakpoints; native layouts use flexbox, safe areas and scrollable content.

## 6. Backend and API routes

Next.js route handlers are the trusted backend layer. Supabase is also accessed directly from clients where RLS is expected to enforce ownership.

| Endpoint | Method | Function |
|---|---|---|
| `/api/chat` | POST/OPTIONS | Customer Gemini assistant with marketplace/order context and optional cart action. |
| `/api/provider-chat` | POST/OPTIONS | Authenticated provider Gemini assistant; verifies provider role and builds context server-side. |
| `/api/payment/create` | POST | Verifies customer/order, rate-limits attempts, creates and attaches a PayMongo QR Ph payment method, stores intent. |
| `/api/payment/status` | POST | Verifies order ownership and reconciles PayMongo status/amount. |
| `/api/payment/webhook` | POST | Verifies PayMongo signature, captures/updates payments, handles duplicate events safely. |
| `/api/notifications/register` | POST | Validates session, role and Expo token, then upserts the device token. |
| `/api/notifications/order-event` | POST | Validates `x-webhook-secret`, finds role tokens and sends Expo push messages. |
| `/api/admin/data` | GET | Authenticated admin aggregate using service-role access so RLS does not hide platform data. |
| `/api/admin/providers` | POST | Admin-only provider/auth account creation and document handling. |
| `/api/admin/providers/document-url` | POST | Produces a short-lived signed document URL for an authorized admin. |
| `/api/admin/members` | GET/POST/PATCH | Lists, invites, assigns roles and activates/deactivates admins. |
| `/auth/callback` | GET | Completes Supabase OAuth/email authentication callbacks. |

Server-only secrets use non-public environment variables. Client code receives only public URL/anonymous keys.

## 7. Database

Confirmed core tables used by code include:

| Table | Purpose and relationships |
|---|---|
| `profiles` | One profile per auth user; name, phone, avatar, role and suspension state. |
| `providers` | Store linked to provider `user_id`; identity, location, fees, service settings and documents. |
| `products` | Belongs to provider; category, price, unit, image, availability and stock. |
| `orders` | Links customer and provider; status, totals, address/coordinates, payment, scheduling and cancellation reason. |
| `order_items` | Order line items linked to orders/products with quantity and unit price. |
| `customer_addresses` | Saved customer addresses, categories, coordinates and default flag. |
| `customer_favorite_providers` | Composite customer/provider key for saved stores. |
| `reviews` | Customer rating/comment for a provider/order. |
| `order_messages` | Order-scoped customer/provider chat messages and read status. |
| `device_push_tokens` | Expo token, user, role, platform and device data. |
| `batch_slots` | Provider scheduling day/time/capacity configuration. |
| `provider_payouts` | Provider payout requests, states and transfer references. |
| `provider_manual_sales` | Off-system sales used in shop analytics, optionally reducing stock. |
| `platform_settings` | Commission and platform configuration. |
| `admin_members` | Admin permission role and activation state. |
| `admin_audit_logs` | Records protected administrative changes. |
| `payment_refunds` | QR Ph refund workflow and external references. |

Important database functions include atomic order/inventory handling in `supabase-migrations.sql`, `request_provider_payout()` and `record_provider_manual_sale(...)`. RLS policies restrict records by authenticated user/provider/admin. Migration `202609220004` adds `cancel_reason`; `202609220005` adds favorites.

## 8. Feature details and system flows

### Authentication and roles

Supabase Auth stores credentials and issues a session/JWT. Frontends observe the session and load `profiles`. Role guards/layouts select customer, provider or admin experiences. Google OAuth returns through `/auth/callback` on web and app deep links on mobile. Terms and Privacy acceptance is required during customer registration.

### Store discovery and products

Customer action → Browse/Home queries `providers` → filters/sorts by service, distance, rating or time → Store Detail queries `products` and `reviews` → customer searches/sorts products by price or normalized quantity → cart context updates locally.

### Cart, checkout and inventory

Cart data contains one provider at a time. Checkout validates address, coordinates, items, stock and delivery option. Database ordering logic locks relevant rows (`FOR UPDATE`), checks stock, inserts the order/items and subtracts stock atomically. Cancellation/deletion restoration functions prevent releasing inventory more than once.

### QR Ph payment

Checkout creates a pending order → authenticated frontend calls `/api/payment/create` → server confirms order ownership/amount/state → PayMongo creates Payment Intent and QR Ph method → intent is attached → QR URL returns → customer pays → PayMongo webhook verifies its signature and updates `payment_status` → status endpoint can reconcile if webhook/UI timing differs. If PayMongo fails, the API returns a recoverable error and the order remains unpaid rather than falsely paid.

### Provider order fulfillment

Provider order list reads provider-owned orders newest first. Provider accepts or rejects a new order, optionally enters ETA, and advances through confirmed, pickup/preparation, delivery and delivered states. Cancellation requires a reason. Customers receive realtime UI changes and push notifications. Paid QR Ph cancellation is directed to the refund workflow.

### Human order chat: how it works

Main implementations: `components/OrderChat.tsx` (web), plus `components/OrderChat.jsx` in both mobile apps.

1. The component receives `orderId`, current user ID/role, other party name and order status.
2. It loads ordered rows from `order_messages`.
3. Sending inserts `{order_id, sender_id, sender_role, content, is_read:false}`.
4. A Supabase Realtime `postgres_changes` channel receives inserted/updated messages.
5. A separate Presence channel tracks online users.
6. Realtime Broadcast sends temporary typing events.
7. Incoming messages are marked read; the last sent message displays Sent, Delivered or Seen.
8. Chat becomes read-only after delivery or cancellation.

Requirements: Supabase project URL/key, authenticated users, `order_messages` table, correct RLS policies allowing only order participants, Realtime enabled for the table, and network connectivity. Presence/typing is temporary and is not stored. If Realtime disconnects, already loaded messages remain, but new messages may require reopening/reloading.

### Notifications

Installed apps request permission and obtain an Expo push token. `/api/notifications/register` verifies the JWT and profile role before storing the token. A Supabase Database Webhook watches `public.orders` inserts/updates and calls `/api/notifications/order-event` with `x-webhook-secret`. The API selects customer/provider tokens and sends to Expo. Notification data contains the order ID; mobile listeners navigate to Order Detail when tapped. Expo Go cannot test Android remote notifications; a development build or APK is required.

### AquaBot and Provider Assistant

Customer AquaBot sends messages and relevant context to `/api/chat`. The server uses Gemini and may return `{reply, cartAction}`. The provider assistant uses `/api/provider-chat`, which verifies the bearer token and provider role, then derives live store, product and order context on the server. Required: Gemini key, Supabase server configuration, deployed HTTPS API, and network. Failure returns a friendly 4xx/5xx response rather than exposing the key.

### Batch delivery

Providers create day/time slots with capacity and cutoff. Customers select available batch delivery at checkout. Orders store delivery type and scheduled time. Active-order protection should prevent deletion of slots already used by active orders; capacity is shown to providers.

### Provider products/inventory

Providers add/edit images, category, name, description, price, standardized unit, stock and availability. Quick `+`/`−` controls update stock. Low/out-of-stock states appear on cards and notifications. Images must be below 10 MB.

### Analytics, wallet and admin

Provider Analytics merges delivered system orders with `provider_manual_sales`, supports time periods and CSV export, and records cash/other counter sales. Wallet calculates collected QR Ph funds, commission, pending delivery, available balance and payout history. Admin processes payouts, refunds, provider approvals/documents, user states, reports, settings, alerts and audit records.

## 9. User roles and access

| Role | Main access | Protection |
|---|---|---|
| Customer | Browse, cart, checkout, own orders/messages/reviews/addresses/favorites | Supabase session, customer layouts, ownership RLS/API checks. |
| Provider | Own store, products, orders, chat, slots, analytics, wallet | Provider role check, provider ownership queries/RLS, authenticated provider AI. |
| Admin owner | All admin operations and admin membership control | Admin session plus owner requirement in membership mutations. |
| Admin/finance/support | Operational subset according to stored permission role | `admin_members`, server authorization and RLS functions. |

## 10. Security

Confirmed protections:

- Supabase hashed-password authentication and token sessions.
- Authorization bearer checks on payments, push registration and provider AI.
- Service-role key confined to server routes.
- RLS policies for newer operational tables.
- PayMongo webhook HMAC/signature verification using timing-safe comparison.
- Order ownership and exact-amount checks before reconciliation.
- Rate/lock logic for payment session creation.
- Secret header on database notification webhook.
- Signed, expiring provider-document URLs.
- Atomic inventory reservation/restoration.
- Admin audit records and role checks.

Confirmed concerns/recommendations:

- Verify RLS exists and is tested for **every** core table, especially `order_messages`, orders, items, addresses and reviews.
- Validate/chat-limit message length on the database or server, not only UI.
- Add server-side MIME/content inspection for uploaded images/documents.
- Rotate exposed secrets immediately if they ever appear in logs/screenshots; never put service/PayMongo/Gemini secrets in `NEXT_PUBLIC_` or `EXPO_PUBLIC_` variables.
- Add structured server logging, monitoring, webhook retry/dead-letter handling and push receipt processing.
- Replace source-pattern tests with database integration tests against an isolated Supabase instance.

## 11. Environment variables (names only)

Website: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, optional `GEMINI_API_KEY_PROVIDER`, `PAYMONGO_PUBLIC_KEY`, `PAYMONGO_SECRET_KEY`, `PAYMONGO_WEBHOOK_SECRET`, `ORDER_NOTIFICATION_WEBHOOK_SECRET`, `NEXT_PUBLIC_CUSTOMER_APP_URL`, `NEXT_PUBLIC_PROVIDER_APP_URL`.

Mobile apps: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_AQUAGAS_URL`.

## 12. Installation and setup

Prerequisites: Node.js 20+, npm, Git, Supabase project/CLI, Android Studio/JDK for local Android builds, Expo/EAS account, PayMongo account and Gemini API access.

```powershell
# Website
cd C:\xampp\htdocs\aquagas1
npm install
# Create .env.local using the names above; never commit it.
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
npm run dev

# Customer mobile
cd C:\xampp\htdocs\aquagas-mobile
npm install
# Create .env with EXPO_PUBLIC_* values
npx expo start --clear

# Provider mobile
cd C:\xampp\htdocs\aquagas-provider-mobile
npm install
npx expo start --clear
```

Verification/build commands:

```powershell
cd C:\xampp\htdocs\aquagas1
npm test
npm run typecheck
npm run build

cd C:\xampp\htdocs\aquagas-mobile
npx tsc --noEmit
eas build --platform android --profile preview

cd C:\xampp\htdocs\aquagas-provider-mobile
npx expo export --platform android
eas build --platform android --profile preview
```

Configure PayMongo's webhook to the deployed `/api/payment/webhook`. Configure the Supabase orders database webhook for Insert/Update to `/api/notifications/order-event` with header `x-webhook-secret`. Use an APK/development build, not Expo Go, for closed-app push testing.

## 13. Feature-to-code mapping

| Feature | Role | Page/component | Main logic/API | Tables/services |
|---|---|---|---|---|
| Login/OAuth | All | web auth pages; mobile Login | Supabase Auth, `/auth/callback` | `auth.users`, `profiles` |
| Browse/filter stores | Customer | `home/page.tsx`, `BrowseScreen` | Supabase queries + distance/sort UI | `providers` |
| Products/cart | Customer | store pages/screens, cart contexts | Local persisted cart | `products` |
| Checkout/order | Customer | checkout pages/screens | atomic order RPC/database logic | `orders`, `order_items`, `products` |
| QR Ph | Customer/Admin | checkout/order/refund UI | payment create/status/webhook APIs | PayMongo, `orders`, `payment_refunds` |
| Order tracking | Customer | orders pages/screens | Realtime order updates | `orders` |
| Fulfillment | Provider | provider orders/detail | `updateOrderStatus` | `orders` |
| Chat | Customer/Provider | `OrderChat` | Realtime DB + Presence + Broadcast | `order_messages` |
| Push | Customer/Provider | notification libraries/screens | register/order-event APIs | `device_push_tokens`, Expo Push |
| Reviews | Customer | order/store UI | insert/read review | `reviews` |
| Addresses/maps | Customer | profile/checkout, AddressPicker | Leaflet/location coordinates | `customer_addresses`, OSM |
| Favorites | Customer | store web/mobile | upsert/delete favorite | `customer_favorite_providers` |
| AquaBot | Customer | `AquaBot`, `AquaBotScreen` | `/api/chat` | Gemini + marketplace context |
| Provider assistant | Provider | `ProviderBot`, AssistantScreen | `/api/provider-chat` | Gemini + provider context |
| Inventory | Provider | products pages/screens | CRUD and stock controls | `products` |
| Batch slots | Provider/Customer | slots + checkout | capacity/schedule flow | `batch_slots`, `orders` |
| Wallet/payout | Provider/Admin | wallet/payout pages/screens | payout RPC/admin state changes | `provider_payouts`, `platform_settings` |
| Analytics/manual sales | Provider | analytics pages/screens | period aggregation/CSV/RPC | `orders`, `provider_manual_sales` |
| Admin operations | Admin | `app/admin/*` | admin APIs/context | platform operational tables |

## 14. Limitations and improvements

Confirmed limitations:

- Expo Go cannot execute Android remote notifications; install a development build/APK.
- Provider mobile CSV currently uses the native share flow; a dedicated saved `.csv` file experience could be improved.
- Some mobile URL fallbacks are inconsistent (`aquagas.shop`, `www.aquagas.shop`, and an older Vercel fallback in customer Orders); centralize one production API constant.
- Core schema history is split between `supabase-migrations.sql` and timestamped migrations; convert the complete schema into ordered migrations for reproducible deployments.
- Current critical tests inspect source safeguards; they do not execute a real database transaction or PayMongo sandbox flow.

Recommended next work:

- Add Supabase integration tests for order creation, simultaneous stock reservation, cancellation restoration and RLS.
- Add PayMongo sandbox webhook/reconciliation tests.
- Add push receipt cleanup, retries and token invalidation.
- Add error monitoring and analytics for web/mobile production builds.
- Generate typed Supabase definitions after every migration and use them in all apps.
- Add accessibility and end-to-end tests for customer/provider/admin primary flows.

## 15. Simple Taglish presentation script

“Good day. Ang system namin ay **AquaGas**, isang web at mobile marketplace para sa water-refilling at LPG delivery. Ang main users nito ay customers, providers, at administrators.

Sa customer side, puwedeng maghanap ng nearby store, mag-filter at mag-sort, pumili ng product, mag-cart, mag-checkout, at magbayad through Cash on Delivery or QR Ph. Pagkatapos mag-order, makikita nila ang realtime status, notifications, mapa, chat with the provider, receipt reference, review, at reorder option.

Sa provider side, may dashboard para sa orders, inventory at stock, products, batch delivery slots, delivery map, customer chat, analytics, manual shop sales, at wallet/payout requests. Sa admin side naman, minamanage ang providers, customers, orders, payouts, refunds, reports, platform settings, notifications, at audit logs.

Ang website ay ginawa gamit ang Next.js, React, TypeScript at Tailwind CSS. Ang customer at provider mobile applications ay React Native with Expo. Supabase ang ginagamit para sa authentication, PostgreSQL database, file storage at realtime updates. PayMongo ang ginagamit para sa QR Ph, Gemini para sa AquaBot, Leaflet at OpenStreetMap para sa maps, at Expo Notifications para sa phone notifications.

Halimbawa sa order flow: pipili ang customer ng products, iva-validate ng checkout ang data, at ang database function ay magre-reserve ng stock atomically. Kapag QR Ph, tatawag ang secure server API sa PayMongo. Kapag confirmed ang payment, webhook ang mag-a-update ng order. Kapag binago ng provider ang order status, makikita ito realtime ng customer at makakatanggap din siya ng push notification.

Ang chat ay gumagamit ng `order_messages` table at Supabase Realtime. Ang messages ay stored sa database, habang Presence at Broadcast ang ginagamit para sa online at typing indicators. May RLS at authentication para ang tamang participants lang ang magkaroon ng access.

Sa security, gumagamit kami ng Supabase sessions, role checks, Row Level Security, server-only service keys, PayMongo webhook signature verification, exact payment amount checks, at atomic inventory transactions. Hindi nilalagay ang secret keys sa client application.

Current limitations include the need for an APK to test background push notifications, inconsistent legacy API URL fallbacks, and the need for more end-to-end and database integration tests. Future improvements include stronger monitoring, push retry handling, and expanded automated testing.”

## 16. What cannot be confirmed from source alone

- The exact IDE, UI design application, Git remote provider and production web host.
- Whether every listed migration has already been applied to the live Supabase project.
- Live PayMongo/Gemini account configuration and current webhook health.
- Actual production RLS configuration if it differs from repository migrations.

These items should be verified from the Supabase, PayMongo, Gemini, Expo/EAS and hosting dashboards before a final defense or deployment.
