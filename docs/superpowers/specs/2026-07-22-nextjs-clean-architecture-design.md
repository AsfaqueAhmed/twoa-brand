# Next.js App Router + Feature-First Clean Architecture Migration

## Goal
Convert the existing Vite/React SPA (e-commerce storefront + admin panel, Firebase-backed)
into a Next.js App Router project with server-side rendering where it earns its keep
(catalog, product detail), and reorganize the codebase into feature-first clean
architecture modules.

## Decisions (confirmed with user)
1. **Backend:** Keep Firebase — Firestore for data, Firebase Auth (Google popup) for sign-in.
2. **SSR scope:** Only the shop catalog (`/`) and product detail (`/products/[id]`) are
   server-rendered. Cart, checkout, order tracking, and admin panel remain client-rendered
   (per-user, auth-gated, highly interactive).
3. **Product detail UX:** Dedicated SSR route `/products/[id]` (shareable, indexable), which
   still opens as a modal overlay when navigated to from the catalog grid, via Next.js
   intercepting/parallel routes. Direct navigation or refresh renders the full page.
4. **Routing:** Real routes replace the old single-page tab-switch: `/`, `/products/[id]`,
   `/checkout`, `/orders`, `/admin`, `/admin/orders`.
5. **Firestore access on the server:** `products` and `categories` are publicly readable per
   `firestore.rules`, so Server Components use the same `firebase/firestore` **client SDK**
   (isomorphic, works in Node) rather than adding `firebase-admin` + service account
   credentials. No new secrets required. `orders` still require an authenticated user, so
   order reads/writes stay on the browser client SDK, matching the existing security rules.

## Architecture
Feature-first, clean-architecture layers per feature, dependencies point inward:
`presentation → application → domain`, `infrastructure → domain`. Domain code has zero
React/Firebase imports so it's independently testable.

```
src/
  app/                                   # Next.js routes — thin, no business logic
    layout.tsx                           # Providers (Auth, Cart), Navbar, global CSS
    page.tsx                             # / — SSR catalog
    products/[id]/page.tsx               # SSR product detail (full page)
    @modal/
      default.tsx                        # returns null (no modal by default)
      (.)products/[id]/page.tsx          # intercepted route → modal overlay variant
    checkout/page.tsx                    # client
    orders/page.tsx                      # client
    admin/page.tsx                       # client — inventory
    admin/orders/page.tsx                # client — order management

  features/
    catalog/        domain | application | infrastructure | presentation
    product/         (product detail specifics)
    cart/             domain (pure calc) | infrastructure (localStorage) | presentation (Context)
    checkout/         domain (totals/promo calc, address data) | application (placeOrder) | infrastructure (FirestoreOrdersRepository, write side) | presentation
    orders/            domain (Order/OrderStatus) | application (getUserOrders, cancelOrder) | infrastructure | presentation
    admin/
      inventory/       domain (Category, Product validation) | application (CRUD use-cases) | infrastructure (Firestore writes, image compression) | presentation (editor, cropper, category/variant/size managers)
      orders/           application (listAllOrders, updateOrderStatus) | presentation (admin order list/filters)
    auth/               application (signIn/signOut) | infrastructure (Firebase Auth listener) | presentation (AuthProvider, useAuth)

  shared/
    domain/            cross-feature types only where truly shared (Product, Money helpers)
    infrastructure/firebase/
      app.ts            initializeApp + getFirestore — isomorphic (server + client)
      auth.ts            getAuth — client-only
    ui/                 small set of extracted primitives: Button, Input, Badge/StatusPill,
                         EmptyState, Spinner (currently duplicated across CheckoutView,
                         AdminPanel, OrderTrackingView)
    lib/                formatCurrency, generateOrderId, etc.
```

### Example: `cart` feature (illustrates the pattern)
- `domain/cart.ts` — pure functions: `addItem`, `updateQuantity`, `removeItem`,
  `computeSubtotal`, `computeDeliveryFee`, `clampToStock`. No React, no storage.
- `infrastructure/localStorageCartRepository.ts` — implements a `CartRepository` port
  (`load()`, `save()`), guarded for `typeof window`.
- `presentation/CartProvider.tsx` — `'use client'` Context + `useReducer` wiring domain
  functions to the repository; `useCart()` hook; `CartDrawer.tsx` UI.

### Auth guarding
No middleware/session-cookie layer — `orders` and `admin` routes are entirely client
components, so a `RequireAuth` / `RequireAdmin` presentation wrapper (in `features/auth`)
redirects via `next/navigation` once the auth listener resolves, mirroring today's
behavior. Firestore rules remain the real security boundary (already enforced today).

### State management
- **Cart:** Context+reducer in `features/cart`, persisted to `localStorage`.
- **Auth:** Context wrapping `onAuthStateChanged` in `features/auth`.
- **Catalog SSR data:** fetched server-side in `app/page.tsx` via
  `features/catalog/application/getProducts`, passed as props into a client
  `CatalogGrid` that does the existing client-side search/category filtering.
- **Admin mutations:** client Firestore SDK, refetch-after-write, same pattern as today.

## Tooling changes
- Next.js 15 (App Router) + React 19 + TypeScript, Tailwind v4, `motion` (all work fine as
  client components).
- **Drop unused deps** (verified unused in `src/`): `@google/genai`, `express`, `dotenv`,
  `tsx`, `esbuild` — leftovers from the AI Studio/Vite template.
- **No new secrets**: no `firebase-admin`, no service account — see decision #5.
- Product images are stored as base64 data URIs in Firestore (from the in-app cropper), so
  plain `<img>` stays instead of `next/image` — optimization doesn't apply to data URIs and
  forcing it adds no value.
- Single package manager: `npm` (drop stray `bun.lock`).

## Out of scope
- No data migration (Firestore schema unchanged).
- No change to `firestore.rules` (already correct and enforced).
- No auth provider change, no new session/cookie mechanism.
