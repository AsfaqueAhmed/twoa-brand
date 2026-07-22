# Next.js Clean-Architecture Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the Vite/React SPA in this repo into a Next.js 15 App Router project with SSR for the shop catalog and product detail, everything else client-rendered, organized as feature-first clean-architecture modules under `src/features/*` and `src/shared/*`.

**Architecture:** Each feature has `domain/` (pure functions/types, no React/Firebase), `application/` (use-cases composing domain + infrastructure), `infrastructure/` (Firestore/localStorage/browser APIs), `presentation/` (`'use client'` React components + Context providers). Routes in `src/app/**` are thin — they call application use-cases and render presentation components.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript 5, Tailwind CSS v4, `motion` (Framer Motion), `firebase` JS SDK (client SDK reused isomorphically on the server for public reads — see design doc decision #5), `lucide-react`, Vitest for domain-layer unit tests.

**Design doc:** `docs/superpowers/specs/2026-07-22-nextjs-clean-architecture-design.md` — read it if anything here is ambiguous.

## Global Constraints

- Package manager: **npm** only. Delete `bun.lock`; do not create a new one.
- No `firebase-admin`, no service-account secrets — server-side reads of `products`/`categories` use the same `firebase/firestore` client SDK (works isomorphically in Next.js Server Components since it's plain HTTP under the hood, no DOM needed).
- `firebase/auth` (`getAuth`) is imported **only** from files under `src/features/auth/**`, which are all `'use client'`. Never import it from a Server Component or from `shared/infrastructure/firebase/app.ts`.
- Product images are base64 data URIs — use plain `<img>`, never `next/image`, for product/variant images.
- All new/modified TypeScript files must pass `npx tsc --noEmit` before a task is considered done.
- Path alias: `@/*` maps to `./src/*` (set in `tsconfig.json` in Task 1).
- **Porting existing components:** several tasks port large existing components (e.g. `src/components/CheckoutView.tsx`) into a new feature file. "Port" means: read the exact current file (paths/line ranges are given), copy its JSX/logic into the new file, and apply the listed substitutions (import paths, prop sources, hook calls). The current file's content is the literal spec for what the new file must render — do not redesign the UI while porting.
- Domain layers (`domain/*.ts`) must have zero imports from `react`, `firebase`, or `next/*`. This is what makes them unit-testable with Vitest without a DOM.
- Admin email constant `asfaqueahmedsakkar@gmail.com` must appear in exactly one place: `src/features/auth/domain/adminEmail.ts`. Every other file imports it from there.

---

## Task 1: Next.js scaffolding & tooling

**Files:**
- Create: `next.config.ts`
- Create: `postcss.config.mjs`
- Modify: `tsconfig.json` (replace entirely)
- Modify: `package.json` (replace entirely)
- Create: `src/app/globals.css`
- Create: `src/app/layout.tsx` (placeholder)
- Create: `src/app/page.tsx` (placeholder)
- Create: `vitest.config.ts`
- Delete (end of this task): none yet — old Vite files are removed in Task 13 so the app keeps building throughout the migration if needed. `vite.config.ts` and `index.html` are simply ignored by `next build`/`next dev` from here on.

**Interfaces:**
- Produces: working `npm run dev` (Next dev server on port 3000), `npm run build` (Next build), `npm run test` (Vitest), path alias `@/*` → `./src/*`.

- [ ] **Step 1: Install Next.js and remove unused/Vite-only dependencies**

```bash
npm install next@^15 react@^19 react-dom@^19 firebase lucide-react motion
npm install -D typescript@~5.8 @types/react@^19 @types/react-dom@^19 @types/node@^22 tailwindcss@^4 @tailwindcss/postcss@^4 vitest@^3
npm uninstall @google/genai express dotenv esbuild tsx @vitejs/plugin-react @tailwindcss/vite vite @types/express
rm -f bun.lock
```

- [ ] **Step 2: Write `package.json` scripts**

Replace the `"scripts"` block in `package.json` with:

```json
{
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start --port 3000",
    "lint": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Keep `"name"`, `"private"`, `"version"`, `"type": "module"` fields as-is, and keep `dependencies`/`devDependencies` as npm just wrote them in Step 1.

- [ ] **Step 3: Replace `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {};

export default nextConfig;
```

- [ ] **Step 5: Create `postcss.config.mjs`**

```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
```

- [ ] **Step 6: Create `src/app/globals.css`**

```css
@import "tailwindcss";
```

- [ ] **Step 7: Create placeholder root layout**

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SwiftCart',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 8: Create placeholder home page**

`src/app/page.tsx`:

```tsx
export default function HomePage() {
  return <main className="p-8 text-sm font-bold uppercase">SwiftCart — scaffolding OK</main>;
}
```

- [ ] **Step 9: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

- [ ] **Step 10: Verify the scaffold builds and runs**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: `Compiled successfully`, output shows `/` as a static/SSR route.

Run: `npm run dev` in the background, then `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: `200`. Stop the dev server after checking.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js App Router project (Vite files untouched, removed in cleanup task)"
```

---

## Task 2: Shared domain types & Firebase infrastructure

**Files:**
- Create: `src/shared/domain/types.ts`
- Create: `src/shared/infrastructure/firebase/app.ts`
- Create: `src/shared/lib/formatCurrency.ts`
- Test: `src/shared/lib/formatCurrency.test.ts`

**Interfaces:**
- Produces: `Product`, `ProductVariant`, `CartItem`, `Order`, `OrderItem`, `OrderStatus` types; `db` (Firestore instance) from `@/shared/infrastructure/firebase/app`; `formatCurrency(amount: number): string`.

- [ ] **Step 1: Port shared domain types**

`src/shared/domain/types.ts` — copy verbatim from the current `src/types.ts` (all of it: `ProductVariant`, `Product`, `CartItem`, `OrderStatus`, `OrderItem`, `Order`). No changes to the type definitions themselves.

- [ ] **Step 2: Create the Firestore app singleton**

`src/shared/infrastructure/firebase/app.ts`:

```ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../../../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
```

- [ ] **Step 3: Write the failing test for `formatCurrency`**

`src/shared/lib/formatCurrency.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatCurrency';

describe('formatCurrency', () => {
  it('formats a whole number with two decimals', () => {
    expect(formatCurrency(100)).toBe('$100.00');
  });

  it('formats a fractional number with two decimals', () => {
    expect(formatCurrency(4.9)).toBe('$4.90');
  });

  it('rounds to two decimals', () => {
    expect(formatCurrency(4.999)).toBe('$5.00');
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test -- formatCurrency`
Expected: FAIL — `Cannot find module './formatCurrency'`.

- [ ] **Step 5: Implement `formatCurrency`**

`src/shared/lib/formatCurrency.ts`:

```ts
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npm run test -- formatCurrency`
Expected: PASS, 3 tests.

- [ ] **Step 7: Commit**

```bash
git add src/shared
git commit -m "feat: add shared domain types and Firestore app singleton"
```

---

## Task 3: Shared UI primitives

**Files:**
- Create: `src/shared/ui/Spinner.tsx`
- Create: `src/shared/ui/EmptyState.tsx`

**Interfaces:**
- Produces: `<Spinner className?>` (consumed by `RequireAuth`/`RequireAdmin` in Task 4), `<EmptyState icon, title, description, action?>` (consumed by `CatalogGrid` in Task 6). Only these two primitives are built — they're the ones an actual task in this plan consumes. Don't add a `Button`/`Badge` primitive here: every later task ports existing button/status-pill markup verbatim to preserve exact visual fidelity (see Global Constraints), so a generic `Button`/`Badge` component would go unused. If a genuinely new (non-ported) button/badge need comes up later, add the primitive then.

- [ ] **Step 1: Create `Spinner`**

`src/shared/ui/Spinner.tsx`:

```tsx
import { Loader2 } from 'lucide-react';

export default function Spinner({ className = 'h-8 w-8 text-black' }: { className?: string }) {
  return <Loader2 className={`animate-spin ${className}`} />;
}
```

- [ ] **Step 2: Create `EmptyState`**

`src/shared/ui/EmptyState.tsx`:

```tsx
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-none border border-dashed border-[#EEEEEE] p-12 text-center bg-white my-12">
      <Icon className="mx-auto h-8 w-8 text-[#717171]" />
      <h4 className="mt-3 text-xs font-bold uppercase tracking-wider text-black">{title}</h4>
      <p className="mt-2 text-xs text-[#717171] leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 3: Verify types**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/shared/ui
git commit -m "feat: add shared UI primitives (Spinner, EmptyState)"
```

---

## Task 4: Auth feature

**Files:**
- Create: `src/features/auth/domain/adminEmail.ts`
- Test: `src/features/auth/domain/adminEmail.test.ts`
- Create: `src/features/auth/infrastructure/firebaseAuth.ts`
- Create: `src/features/auth/infrastructure/authListener.ts`
- Create: `src/features/auth/presentation/AuthProvider.tsx`
- Create: `src/features/auth/presentation/RequireAuth.tsx`
- Create: `src/features/auth/presentation/RequireAdmin.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `isAdminEmail(email): boolean`, `ADMIN_EMAIL` constant, `subscribeToAuthChanges(cb)`, `signInWithGoogle()`, `signOutUser()`, `<AuthProvider>`, `useAuth(): { user: User | null; isAdmin: boolean; authLoading: boolean; signIn: () => Promise<void>; signOut: () => Promise<void> }`, `<RequireAuth>{children}</RequireAuth>`, `<RequireAdmin>{children}</RequireAdmin>` (both redirect to `/` via `next/navigation` when the guard fails, after `authLoading` resolves).
- Consumes: none from earlier tasks besides `src/shared/ui` (not needed here).

- [ ] **Step 1: Write the failing test for `isAdminEmail`**

`src/features/auth/domain/adminEmail.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isAdminEmail, ADMIN_EMAIL } from './adminEmail';

describe('isAdminEmail', () => {
  it('returns true for the exact admin email', () => {
    expect(isAdminEmail(ADMIN_EMAIL)).toBe(true);
  });

  it('returns false for a different email', () => {
    expect(isAdminEmail('someone@example.com')).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isAdminEmail(null)).toBe(false);
    expect(isAdminEmail(undefined)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- adminEmail`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `adminEmail.ts`**

`src/features/auth/domain/adminEmail.ts`:

```ts
export const ADMIN_EMAIL = 'asfaqueahmedsakkar@gmail.com';

export function isAdminEmail(email: string | null | undefined): boolean {
  return email === ADMIN_EMAIL;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- adminEmail`
Expected: PASS, 3 tests.

- [ ] **Step 5: Create the client-only Firebase Auth instance**

`src/features/auth/infrastructure/firebaseAuth.ts`:

```ts
import { getAuth } from 'firebase/auth';
import { initializeApp, getApps, getApp } from 'firebase/app';
import firebaseConfig from '../../../../firebase-applet-config.json';

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

- [ ] **Step 6: Create the auth listener wrapper**

`src/features/auth/infrastructure/authListener.ts`:

```ts
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, type User } from 'firebase/auth';
import { auth } from './firebaseAuth';

export type { User };

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithGoogle(): Promise<void> {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export async function signOutUser(): Promise<void> {
  await signOut(auth);
}
```

- [ ] **Step 7: Create `AuthProvider` and `useAuth`**

`src/features/auth/presentation/AuthProvider.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { subscribeToAuthChanges, signInWithGoogle, signOutUser } from '../infrastructure/authListener';
import { isAdminEmail } from '../domain/adminEmail';

interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  authLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  const value: AuthContextValue = {
    user,
    isAdmin: isAdminEmail(user?.email),
    authLoading,
    signIn: signInWithGoogle,
    signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 8: Create `RequireAuth` and `RequireAdmin` guards**

`src/features/auth/presentation/RequireAuth.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Spinner from '@/shared/ui/Spinner';

export default function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
```

`src/features/auth/presentation/RequireAdmin.tsx`:

```tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import Spinner from '@/shared/ui/Spinner';

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      router.replace('/');
    }
  }, [authLoading, isAdmin, router]);

  if (authLoading || !isAdmin) {
    return (
      <div className="flex justify-center py-32">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
```

- [ ] **Step 9: Wire `AuthProvider` into the root layout**

Modify `src/app/layout.tsx` — wrap `{children}` with `AuthProvider`:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/presentation/AuthProvider';

export const metadata: Metadata = {
  title: 'SwiftCart',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 10: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 11: Commit**

```bash
git add src/features/auth src/app/layout.tsx
git commit -m "feat: add auth feature (AuthProvider, RequireAuth, RequireAdmin)"
```

---

## Task 5: Cart feature

**Files:**
- Create: `src/features/cart/domain/cart.ts`
- Test: `src/features/cart/domain/cart.test.ts`
- Create: `src/features/cart/infrastructure/localStorageCartRepository.ts`
- Create: `src/features/cart/presentation/CartProvider.tsx`
- Create: `src/features/cart/presentation/CartDrawer.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces (domain): `addItem(items, product, quantity, selectedSize?, selectedVariant?): CartItem[]`, `updateItemQuantity(items, productId, quantity, selectedSize, selectedVariant, stock): CartItem[]`, `removeItem(items, productId, selectedSize?, selectedVariant?): CartItem[]`, `computeSubtotal(items): number`, `computeCartCount(items): number`.
- Produces (presentation): `<CartProvider>`, `useCart(): { items: CartItem[]; addToCart(product, quantity?, selectedSize?, selectedVariant?): void; updateQuantity(productId, quantity, selectedSize?, selectedVariant?): void; removeFromCart(productId, selectedSize?, selectedVariant?): void; subtotal: number; count: number; isOpen: boolean; openCart(): void; closeCart(): void; clearCart(): void }`.
- Consumes: `Product`, `CartItem`, `ProductVariant` from `@/shared/domain/types`.

- [ ] **Step 1: Write failing tests for cart domain logic**

`src/features/cart/domain/cart.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { addItem, updateItemQuantity, removeItem, computeSubtotal, computeCartCount } from './cart';
import type { CartItem, Product } from '@/shared/domain/types';

const product: Product = {
  id: 'p1',
  name: 'Widget',
  description: 'A widget',
  price: 10,
  image: 'img.png',
  category: 'Gadgets',
  rating: 5,
  stock: 3,
};

describe('cart domain', () => {
  it('adds a new item', () => {
    const result = addItem([], product, 1);
    expect(result).toEqual([{ product, quantity: 1, selectedSize: undefined, selectedVariant: undefined }]);
  });

  it('merges quantity when the same product/size/variant is added again, clamped to stock', () => {
    const initial: CartItem[] = [{ product, quantity: 2 }];
    const result = addItem(initial, product, 5);
    expect(result[0].quantity).toBe(3); // clamped to stock of 3
  });

  it('updates quantity clamped to stock', () => {
    const initial: CartItem[] = [{ product, quantity: 1 }];
    const result = updateItemQuantity(initial, 'p1', 10, undefined, undefined, product.stock);
    expect(result[0].quantity).toBe(3);
  });

  it('removes an item matching product/size/variant', () => {
    const initial: CartItem[] = [{ product, quantity: 1 }];
    const result = removeItem(initial, 'p1');
    expect(result).toEqual([]);
  });

  it('computes subtotal', () => {
    const items: CartItem[] = [{ product, quantity: 2 }];
    expect(computeSubtotal(items)).toBe(20);
  });

  it('computes cart count', () => {
    const items: CartItem[] = [{ product, quantity: 2 }];
    expect(computeCartCount(items)).toBe(2);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- cart.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement cart domain logic**

`src/features/cart/domain/cart.ts` (ported from the cart-related logic in `src/App.tsx:198-265`, made pure — no `setState`):

```ts
import type { CartItem, Product, ProductVariant } from '@/shared/domain/types';

function matches(item: CartItem, productId: string, selectedSize?: string, selectedVariantId?: string): boolean {
  return (
    item.product.id === productId &&
    item.selectedSize === selectedSize &&
    item.selectedVariant?.id === selectedVariantId
  );
}

export function addItem(
  items: CartItem[],
  product: Product,
  quantity: number,
  selectedSize?: string,
  selectedVariant?: ProductVariant
): CartItem[] {
  const existingIndex = items.findIndex((item) => matches(item, product.id, selectedSize, selectedVariant?.id));
  if (existingIndex >= 0) {
    const existing = items[existingIndex];
    const newQty = Math.min(product.stock, existing.quantity + quantity);
    return items.map((item, i) => (i === existingIndex ? { ...item, quantity: newQty } : item));
  }
  return [...items, { product, quantity: Math.min(product.stock, quantity), selectedSize, selectedVariant }];
}

export function updateItemQuantity(
  items: CartItem[],
  productId: string,
  quantity: number,
  selectedSize: string | undefined,
  selectedVariant: ProductVariant | undefined,
  stock: number
): CartItem[] {
  if (quantity <= 0) {
    return removeItem(items, productId, selectedSize, selectedVariant);
  }
  return items.map((item) =>
    matches(item, productId, selectedSize, selectedVariant?.id)
      ? { ...item, quantity: Math.min(stock, quantity) }
      : item
  );
}

export function removeItem(
  items: CartItem[],
  productId: string,
  selectedSize?: string,
  selectedVariant?: ProductVariant
): CartItem[] {
  return items.filter((item) => !matches(item, productId, selectedSize, selectedVariant?.id));
}

export function computeSubtotal(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
}

export function computeCartCount(items: CartItem[]): number {
  return items.reduce((acc, item) => acc + item.quantity, 0);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- cart.test`
Expected: PASS, 6 tests.

- [ ] **Step 5: Implement the localStorage repository**

`src/features/cart/infrastructure/localStorageCartRepository.ts` (ported from `src/App.tsx:74-77,93-95`):

```ts
import type { CartItem } from '@/shared/domain/types';

const STORAGE_KEY = 'swiftcart_cart';

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved ? JSON.parse(saved) : [];
}

export function saveCart(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
```

- [ ] **Step 6: Create `CartProvider`**

`src/features/cart/presentation/CartProvider.tsx`:

```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem, Product, ProductVariant } from '@/shared/domain/types';
import { addItem, updateItemQuantity, removeItem, computeSubtotal, computeCartCount } from '../domain/cart';
import { loadCart, saveCart } from '../infrastructure/localStorageCartRepository';

interface CartContextValue {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  updateQuantity: (productId: string, quantity: number, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  removeFromCart: (productId: string, selectedSize?: string, selectedVariant?: ProductVariant) => void;
  subtotal: number;
  count: number;
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => loadCart());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const value: CartContextValue = {
    items,
    addToCart: (product, quantity = 1, selectedSize, selectedVariant) =>
      setItems((prev) => addItem(prev, product, quantity, selectedSize, selectedVariant)),
    updateQuantity: (productId, quantity, selectedSize, selectedVariant) =>
      setItems((prev) => {
        const stock = prev.find((i) => i.product.id === productId)?.product.stock ?? 0;
        return updateItemQuantity(prev, productId, quantity, selectedSize, selectedVariant, stock);
      }),
    removeFromCart: (productId, selectedSize, selectedVariant) =>
      setItems((prev) => removeItem(prev, productId, selectedSize, selectedVariant)),
    subtotal: computeSubtotal(items),
    count: computeCartCount(items),
    isOpen,
    openCart: () => setIsOpen(true),
    closeCart: () => setIsOpen(false),
    clearCart: () => setItems([]),
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
```

- [ ] **Step 7: Port `CartDrawer`**

`src/features/cart/presentation/CartDrawer.tsx` — port verbatim from `src/components/CartDrawer.tsx:1-213`, with these exact substitutions:
1. Add `'use client';` as the first line.
2. Replace `import { CartItem, ProductVariant } from '../types';` with `import type { ProductVariant } from '@/shared/domain/types';`.
3. Remove the `CartDrawerProps` interface and the destructured props `isOpen, onClose, cartItems, onUpdateQuantity, onRemoveItem, onCheckout`. Instead, at the top of the component body add:
   ```tsx
   import { useCart } from './CartProvider';
   import { useRouter } from 'next/navigation';

   export default function CartDrawer() {
     const { items: cartItems, isOpen, closeCart, updateQuantity, removeFromCart, subtotal } = useCart();
     const router = useRouter();
     const onClose = closeCart;
     const onUpdateQuantity = updateQuantity;
     const onRemoveItem = removeFromCart;
     const onCheckout = () => {
       closeCart();
       router.push('/checkout');
     };
   ```
4. Delete the original `const subtotal = cartItems.reduce(...)` line (now provided by `useCart()`).
5. Keep everything else (JSX, class names, ids, icons) identical.

- [ ] **Step 8: Wire `CartProvider` and `CartDrawer` into the root layout**

Modify `src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/presentation/AuthProvider';
import { CartProvider } from '@/features/cart/presentation/CartProvider';
import CartDrawer from '@/features/cart/presentation/CartDrawer';

export const metadata: Metadata = {
  title: 'SwiftCart',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        <AuthProvider>
          <CartProvider>
            {children}
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 9: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm run build` — expect success.

- [ ] **Step 10: Commit**

```bash
git add src/features/cart src/app/layout.tsx
git commit -m "feat: add cart feature (domain, localStorage repo, CartProvider, CartDrawer)"
```

---

## Task 6: Catalog feature + SSR home page

**Files:**
- Create: `src/features/catalog/domain/filter.ts`
- Test: `src/features/catalog/domain/filter.test.ts`
- Create: `src/features/catalog/infrastructure/firestoreProductsRepository.ts`
- Create: `src/features/catalog/application/getProducts.ts`
- Create: `src/features/catalog/presentation/ProductCard.tsx`
- Create: `src/features/catalog/presentation/CatalogGrid.tsx`
- Create: `src/features/catalog/presentation/Navbar.tsx`
- Create: `src/app/page.tsx` (replace placeholder)

**Interfaces:**
- Produces (domain): `matchesSearch(product, query): boolean`, `filterProducts(products, { search?, category?, subcategory? }): Product[]`, `getCategories(products): string[]`, `getSubcategories(products, category): string[]`.
- Produces (infrastructure/application): `fetchAllProducts(): Promise<Product[]>`, `getProducts(): Promise<Product[]>`.
- Produces (presentation): `<CatalogGrid initialProducts={Product[]} />` (client component doing search/category filtering over server-fetched data), `<ProductCard product onSelect onAddToCart />`, `<Navbar />` (reads `useAuth()` and `useCart()` directly — no props needed from the page).
- Consumes: `useAuth` (Task 4), `useCart` (Task 5), `db` (Task 2).

- [ ] **Step 1: Write failing tests for catalog filter logic**

`src/features/catalog/domain/filter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { matchesSearch, filterProducts, getCategories, getSubcategories } from './filter';
import type { Product } from '@/shared/domain/types';

const products: Product[] = [
  { id: '1', name: 'Black Backpack', description: 'Durable pack', price: 50, image: '', category: 'Bags', subcategory: 'Backpacks', rating: 5, stock: 3 },
  { id: '2', name: 'White Mug', description: 'Ceramic mug', price: 10, image: '', category: 'Kitchen', subcategory: 'Mugs', rating: 4, stock: 0 },
  { id: '3', name: 'Tote Bag', description: 'Canvas tote', price: 20, image: '', category: 'Bags', subcategory: 'Totes', rating: 5, stock: 5 },
];

describe('catalog filter domain', () => {
  it('matchesSearch matches name or description case-insensitively', () => {
    expect(matchesSearch(products[0], 'black')).toBe(true);
    expect(matchesSearch(products[0], 'durable')).toBe(true);
    expect(matchesSearch(products[0], 'nope')).toBe(false);
  });

  it('filterProducts filters by search text', () => {
    expect(filterProducts(products, { search: 'mug' })).toEqual([products[1]]);
  });

  it('filterProducts filters by category', () => {
    expect(filterProducts(products, { category: 'Bags' })).toEqual([products[0], products[2]]);
  });

  it('filterProducts filters by subcategory', () => {
    expect(filterProducts(products, { category: 'Bags', subcategory: 'Totes' })).toEqual([products[2]]);
  });

  it('getCategories returns unique categories prefixed with All', () => {
    expect(getCategories(products)).toEqual(['All', 'Bags', 'Kitchen']);
  });

  it('getSubcategories returns unique subcategories for a category prefixed with All', () => {
    expect(getSubcategories(products, 'Bags')).toEqual(['All', 'Backpacks', 'Totes']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- filter.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement catalog filter domain logic**

`src/features/catalog/domain/filter.ts` (ported from `src/App.tsx:381-398`):

```ts
import type { Product } from '@/shared/domain/types';

export function matchesSearch(product: Product, query: string): boolean {
  const q = query.toLowerCase();
  return product.name.toLowerCase().includes(q) || product.description.toLowerCase().includes(q);
}

export function filterProducts(
  products: Product[],
  opts: { search?: string; category?: string; subcategory?: string }
): Product[] {
  return products.filter((product) => {
    const matchesQuery = !opts.search || matchesSearch(product, opts.search);
    const matchesCategory = !opts.category || opts.category === 'All' || product.category === opts.category;
    const matchesSubcategory =
      !opts.subcategory || opts.subcategory === 'All' || product.subcategory === opts.subcategory;
    return matchesQuery && matchesCategory && matchesSubcategory;
  });
}

export function getCategories(products: Product[]): string[] {
  return ['All', ...Array.from(new Set(products.map((p) => p.category)))];
}

export function getSubcategories(products: Product[], category: string): string[] {
  return [
    'All',
    ...Array.from(
      new Set(
        products
          .filter((p) => p.category === category)
          .map((p) => p.subcategory)
          .filter((sub): sub is string => !!sub)
      )
    ),
  ];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test -- filter.test`
Expected: PASS, 6 tests.

- [ ] **Step 5: Implement the Firestore products repository**

`src/features/catalog/infrastructure/firestoreProductsRepository.ts` (ported from `src/App.tsx:30-61`):

```ts
import { collection, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Product } from '@/shared/domain/types';

function toProduct(id: string, data: Record<string, any>): Product {
  return {
    id,
    name: data.name || '',
    description: data.description || '',
    price: Number(data.price) || 0,
    originalPrice: data.originalPrice ? Number(data.originalPrice) : undefined,
    image: data.image || '',
    category: data.category || '',
    subcategory: data.subcategory || '',
    rating: Number(data.rating) || 5,
    stock: Number(data.stock) || 0,
    sizes: data.sizes || [],
    variants: data.variants || [],
  };
}

export async function fetchAllProducts(): Promise<Product[]> {
  const snapshot = await getDocs(collection(db, 'products'));
  return snapshot.docs.map((docSnap) => toProduct(docSnap.id, docSnap.data()));
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const snap = await getDoc(doc(db, 'products', id));
  if (!snap.exists()) return null;
  return toProduct(snap.id, snap.data());
}

export async function updateProductStock(productId: string, nextStock: number): Promise<void> {
  await updateDoc(doc(db, 'products', productId), { stock: Math.max(0, nextStock) });
}
```

- [ ] **Step 6: Implement the `getProducts` use-case**

`src/features/catalog/application/getProducts.ts`:

```ts
import { fetchAllProducts } from '../infrastructure/firestoreProductsRepository';
import type { Product } from '@/shared/domain/types';

export async function getProducts(): Promise<Product[]> {
  return fetchAllProducts();
}
```

- [ ] **Step 7: Port `ProductCard`**

`src/features/catalog/presentation/ProductCard.tsx` — port verbatim from `src/components/ProductCard.tsx:1-208`, with these substitutions:
1. Add `'use client';` as the first line.
2. Replace `import { Product } from '../types';` with `import type { Product } from '@/shared/domain/types';`.
3. No other changes — props (`product`, `onSelect`, `onAddToCart`) stay the same; the parent (`CatalogGrid`) supplies them.

- [ ] **Step 8: Create `Navbar`**

`src/features/catalog/presentation/Navbar.tsx` — port from `src/components/Navbar.tsx:1-229`, with these substitutions:
1. Add `'use client';` as the first line.
2. Remove the `NavbarProps` interface and props destructuring. Replace with:
   ```tsx
   'use client';

   import Link from 'next/link';
   import { usePathname, useRouter } from 'next/navigation';
   import { ShoppingBag, History, LogIn, LogOut, Loader2, Sliders } from 'lucide-react';
   import { motion } from 'motion/react';
   import { useAuth } from '@/features/auth/presentation/AuthProvider';
   import { useCart } from '@/features/cart/presentation/CartProvider';

   export default function Navbar() {
     const { user, authLoading, isAdmin, signIn, signOut } = useAuth();
     const { count: cartCount, openCart } = useCart();
     const pathname = usePathname();
     const router = useRouter();
     const currentTab: 'shop' | 'orders' | 'admin' =
       pathname.startsWith('/admin') ? 'admin' : pathname.startsWith('/orders') ? 'orders' : 'shop';
     const setTab = (tab: 'shop' | 'orders' | 'admin') =>
       router.push(tab === 'shop' ? '/' : tab === 'orders' ? '/orders' : '/admin');
     const onOpenCart = openCart;
     const onSignIn = signIn;
     const onSignOut = signOut;
   ```
3. Everywhere the original used `onClick={() => setTab('shop')}` on the brand logo / tab buttons, keep it as-is (it now calls the router-based `setTab` defined above).
4. Delete the `NavbarProps` interface entirely and the old function signature line `export default function Navbar({ ... }: NavbarProps) {`.
5. Keep the rest of the JSX (header, nav tabs, mobile bottom nav) identical, including all `id="..."` attributes and Tailwind classes.

- [ ] **Step 9: Create `CatalogGrid`**

`src/features/catalog/presentation/CatalogGrid.tsx` — client-side filtering shell around the catalog markup in `src/App.tsx:438-544` (the hero panel, search input, category/subcategory filters, and product grid), adapted as follows:

```tsx
'use client';

import { useState } from 'react';
import { Search, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { Product } from '@/shared/domain/types';
import { filterProducts, getCategories, getSubcategories } from '../domain/filter';
import { useCart } from '@/features/cart/presentation/CartProvider';
import ProductCard from './ProductCard';
import EmptyState from '@/shared/ui/EmptyState';

export default function CatalogGrid({ initialProducts }: { initialProducts: Product[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState('All');
  const { addToCart } = useCart();
  const router = useRouter();

  const categories = getCategories(initialProducts);
  const subcategories = selectedCategory === 'All' ? [] : getSubcategories(initialProducts, selectedCategory);
  const filteredProducts = filterProducts(initialProducts, {
    search: searchQuery,
    category: selectedCategory,
    subcategory: selectedSubcategory,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8" id="shop-catalog-section">
      <div className="relative overflow-hidden rounded-none bg-black text-white p-8 sm:p-12 mb-10 border border-black">
        <div className="relative z-10 max-w-xl space-y-4">
          <span className="inline-flex items-center space-x-1.5 border border-white/20 bg-white/5 text-white text-[9px] font-bold px-3 py-1 uppercase tracking-[0.2em]">
            <Sparkles className="h-3 w-3" />
            <span>100% Risk-Free Shopping</span>
          </span>
          <h2 className="text-xl sm:text-3xl font-bold uppercase tracking-[0.15em] leading-snug">
            Premium Quality, Paid on Delivery
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A1A1] leading-relaxed">
            Browse elite, curated productivity and lifestyle hardware accessories. Hand over cash only after
            successfully receiving and reviewing your package items.
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="relative max-w-md w-full">
          <Search className="absolute top-3.5 left-4 h-4.5 w-4.5 text-[#717171]" />
          <input
            type="text"
            placeholder="Search catalog products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-none border border-[#EEEEEE] bg-white py-3.5 pl-11 pr-4 text-xs font-semibold text-black placeholder-[#A1A1A1] focus:border-black focus:outline-none transition-colors"
            id="catalog-search"
          />
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full" id="category-selector">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedSubcategory('All');
              }}
              className={`rounded-none px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-200 border ${
                selectedCategory === cat
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory !== 'All' && subcategories.length > 1 && (
        <div
          className="flex flex-wrap items-center gap-2 mb-8 bg-[#FAF9F6] p-4 border border-[#EEEEEE] animate-in fade-in duration-200"
          id="subcategory-selector"
        >
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#717171] mr-2">Subcategories:</span>
          {subcategories.map((sub) => (
            <button
              key={sub}
              onClick={() => setSelectedSubcategory(sub)}
              className={`rounded-none px-4 py-2 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border ${
                selectedSubcategory === sub
                  ? 'bg-black text-white border-black'
                  : 'bg-white border-[#EEEEEE] text-[#717171] hover:border-black hover:text-black'
              }`}
            >
              {sub}
            </button>
          ))}
        </div>
      )}

      {filteredProducts.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No products match your query"
          description="Try adjusting search keywords or clearing department filter."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6" id="product-grid">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={(p) => router.push(`/products/${p.id}`)}
              onAddToCart={(p, e) => {
                e.stopPropagation();
                if ((p.sizes && p.sizes.length > 0) || (p.variants && p.variants.length > 0)) {
                  router.push(`/products/${p.id}`);
                } else {
                  addToCart(p, 1);
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Replace the placeholder home page with the SSR catalog page**

`src/app/page.tsx`:

```tsx
import { getProducts } from '@/features/catalog/application/getProducts';
import CatalogGrid from '@/features/catalog/presentation/CatalogGrid';
import Navbar from '@/features/catalog/presentation/Navbar';

export const revalidate = 60;

export default async function HomePage() {
  const products = await getProducts();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans selection:bg-black selection:text-white">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <CatalogGrid initialProducts={products} />
      </main>
    </div>
  );
}
```

- [ ] **Step 11: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm run test` — expect all tests (formatCurrency, adminEmail, cart, filter) to pass.
Run: `npm run build` — expect success; `/` should be listed as a dynamic/SSR route (it fetches Firestore data per request/revalidation).
Run `npm run dev` in background, then `curl -s http://localhost:3000/ | grep -o "SwiftCart"` — expect at least one match (confirms SSR HTML contains rendered content, not just an empty shell). Stop the dev server after checking.

- [ ] **Step 12: Commit**

```bash
git add src/features/catalog src/app/page.tsx
git commit -m "feat: add catalog feature and SSR home page"
```

---

## Task 7: Product detail feature (SSR route + intercepted modal)

**Files:**
- Create: `src/features/product/application/getProductById.ts`
- Create: `src/features/product/presentation/ProductDetailView.tsx`
- Create: `src/features/product/presentation/ProductDetailModal.tsx`
- Create: `src/app/products/[id]/page.tsx`
- Create: `src/app/@modal/default.tsx`
- Create: `src/app/@modal/(.)products/[id]/page.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `getProductById(id): Promise<Product | null>`, `<ProductDetailView product mode="page" | "modal" />` (mode controls whether the close button navigates back or to `/`).
- Consumes: `fetchProductById` (Task 6), `useCart` (Task 5).

- [ ] **Step 1: Implement `getProductById`**

`src/features/product/application/getProductById.ts`:

```ts
import { fetchProductById } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import type { Product } from '@/shared/domain/types';

export async function getProductById(id: string): Promise<Product | null> {
  return fetchProductById(id);
}
```

- [ ] **Step 2: Port the product detail UI as `ProductDetailView`**

`src/features/product/presentation/ProductDetailView.tsx` — port verbatim from `src/components/ProductDetailModal.tsx:1-332` with these substitutions:
1. Add `'use client';` as the first line.
2. Replace `import { Product, ProductVariant } from '../types';` with `import type { Product, ProductVariant } from '@/shared/domain/types';`.
3. Replace the props interface and function signature:
   ```tsx
   import { useRouter } from 'next/navigation';
   import { useCart } from '@/features/cart/presentation/CartProvider';

   interface ProductDetailViewProps {
     product: Product;
     mode: 'page' | 'modal';
   }

   export default function ProductDetailView({ product, mode }: ProductDetailViewProps) {
     const router = useRouter();
     const { addToCart } = useCart();
     const onClose = () => (mode === 'modal' ? router.back() : router.push('/'));
     const onAddToCart = (p: Product, quantity: number, selectedSize?: string, selectedVariant?: ProductVariant) =>
       addToCart(p, quantity, selectedSize, selectedVariant);
   ```
4. Delete the original `if (!product) return null;` guard (the route/parent guarantees a non-null product) and the `useEffect` that reset state `if (product) { ... }` — replace it with a plain initializer since `product` never changes identity within this component's lifetime once mounted for a given route:
   ```tsx
   const [quantity, setQuantity] = useState(1);
   const [selectedSize, setSelectedSize] = useState<string>(product.sizes?.[0] ?? '');
   const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(product.variants?.[0] ?? null);
   const [showSizeChart, setShowSizeChart] = useState(false);
   ```
5. In `handleAddToCart`, after calling `onAddToCart(...)` and `setQuantity(1)`, call `onClose()` (same as the original modal's `onClose()` call) — this pops the modal / navigates back to `/` after adding to cart, matching current UX.
6. Keep the rest of the JSX (image, price, variant/size selectors, size chart, stock status, add-to-cart button) identical, including all `id="..."` attributes.

- [ ] **Step 3: Create the modal wrapper**

`src/features/product/presentation/ProductDetailModal.tsx`:

```tsx
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import type { Product } from '@/shared/domain/types';
import ProductDetailView from './ProductDetailView';

export default function ProductDetailModal({ product }: { product: Product }) {
  const router = useRouter();
  const onClose = () => router.back();

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 10 }}
          className="relative w-full max-w-3xl max-h-[90vh] md:max-h-[85vh] overflow-y-auto md:overflow-hidden rounded-none border border-[#EEEEEE] bg-[#FDFDFD] shadow-2xl"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 rounded-none border border-[#EEEEEE] bg-white/95 backdrop-blur-xs p-2 text-black hover:bg-black hover:text-white hover:border-black transition-all duration-200 shadow-sm"
          >
            <X className="h-4 w-4" />
          </button>
          <ProductDetailView product={product} mode="modal" />
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
```

Note: `ProductDetailView`'s own close button (ported in Step 2) still renders too — that's fine, it calls the same `router.back()`. Leave both; visually the outer modal close button sits above it via `z-20`.

- [ ] **Step 4: Create the full-page SSR route**

`src/app/products/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductById } from '@/features/product/application/getProductById';
import ProductDetailView from '@/features/product/presentation/ProductDetailView';
import Navbar from '@/features/catalog/presentation/Navbar';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return { title: 'Product not found' };
  return { title: `${product.name} — SwiftCart`, description: product.description };
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16 mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 pt-8">
        <ProductDetailView product={product} mode="page" />
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Create the `@modal` parallel route slot**

`src/app/@modal/default.tsx`:

```tsx
export default function Default() {
  return null;
}
```

`src/app/@modal/(.)products/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import { getProductById } from '@/features/product/application/getProductById';
import ProductDetailModal from '@/features/product/presentation/ProductDetailModal';

export default async function InterceptedProductModal({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return <ProductDetailModal product={product} />;
}
```

- [ ] **Step 6: Wire the `@modal` slot into the root layout**

Modify `src/app/layout.tsx` — `RootLayout` must now accept and render the `modal` parallel route slot:

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/features/auth/presentation/AuthProvider';
import { CartProvider } from '@/features/cart/presentation/CartProvider';
import CartDrawer from '@/features/cart/presentation/CartDrawer';

export const metadata: Metadata = {
  title: 'SwiftCart',
  description: 'Premium Quality, Paid on Delivery',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased overflow-x-hidden">
        <AuthProvider>
          <CartProvider>
            {children}
            {modal}
            <CartDrawer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm run build` — expect success; `/products/[id]` should be listed as a dynamic SSR route.
Run `npm run dev` in background. With no real product id yet (Firestore may be empty), check `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/products/does-not-exist` — expect `404`. Stop the dev server after checking. (Full click-through modal-vs-page behavior is verified visually in Task 13's browser smoke test, once the catalog has real products to click.)

- [ ] **Step 8: Commit**

```bash
git add src/features/product src/app/products src/app/@modal src/app/layout.tsx
git commit -m "feat: add product detail feature with SSR route and intercepted modal"
```

---

## Task 8: Orders infrastructure + catalog stock mutation + checkout pricing domain

**Files:**
- Create: `src/features/orders/infrastructure/firestoreOrdersRepository.ts`
- Create: `src/features/checkout/domain/pricing.ts`
- Test: `src/features/checkout/domain/pricing.test.ts`
- Create: `src/features/checkout/infrastructure/bangladeshAreas.ts`

**Interfaces:**
- Produces: `createOrder(order): Promise<void>`, `fetchOrdersForUser(userId): Promise<Order[]>`, `fetchAllOrders(): Promise<Order[]>`, `updateOrderStatus(orderId, status): Promise<void>` (all in `firestoreOrdersRepository.ts`); `FREE_DELIVERY_THRESHOLD`, `DELIVERY_FEE`, `computeDeliveryFee(subtotal): number`, `computeTotal(subtotal, deliveryFee, discount?): number`, `generateOrderId(): string` (in `pricing.ts`); `divisions, districts, thanas, cityCorporations` (re-exported from ported `bangladeshAreas.ts`).
- Consumes: `db` (Task 2), `Order`, `OrderStatus` (Task 2).

- [ ] **Step 1: Implement the orders repository**

`src/features/orders/infrastructure/firestoreOrdersRepository.ts` (ported from `src/App.tsx:121-168,333-373`):

```ts
import { collection, doc, setDoc, updateDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Order, OrderStatus } from '@/shared/domain/types';

function toOrder(id: string, data: Record<string, any>): Order {
  const createdAtISO = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString();
  const updatedAtISO = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt || new Date().toISOString();
  return {
    id,
    userId: data.userId,
    userName: data.userName,
    userEmail: data.userEmail,
    address: data.address,
    phone: data.phone,
    items: data.items,
    totalAmount: data.totalAmount,
    promoCode: data.promoCode,
    discount: data.discount,
    status: data.status,
    paymentMethod: data.paymentMethod,
    createdAt: createdAtISO,
    updatedAt: updatedAtISO,
  };
}

export async function createOrder(orderId: string, payload: Record<string, any>): Promise<void> {
  await setDoc(doc(db, 'orders', orderId), {
    ...payload,
    id: orderId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchOrdersForUser(userId: string): Promise<Order[]> {
  const q = query(collection(db, 'orders'), where('userId', '==', userId));
  const snapshot = await getDocs(q);
  const orders = snapshot.docs.map((docSnap) => toOrder(docSnap.id, docSnap.data()));
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}

export async function fetchAllOrders(): Promise<Order[]> {
  const snapshot = await getDocs(collection(db, 'orders'));
  const orders = snapshot.docs.map((docSnap) => toOrder(docSnap.id, docSnap.data()));
  orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return orders;
}

export async function updateOrderStatus(orderId: string, status: OrderStatus): Promise<void> {
  await updateDoc(doc(db, 'orders', orderId), { status, updatedAt: serverTimestamp() });
}
```

- [ ] **Step 2: Write failing tests for checkout pricing domain**

`src/features/checkout/domain/pricing.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { computeDeliveryFee, computeTotal, generateOrderId, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from './pricing';

describe('checkout pricing', () => {
  it('charges delivery fee below the free-delivery threshold', () => {
    expect(computeDeliveryFee(50)).toBe(DELIVERY_FEE);
  });

  it('waives delivery fee at or above the free-delivery threshold', () => {
    expect(computeDeliveryFee(FREE_DELIVERY_THRESHOLD)).toBe(0);
    expect(computeDeliveryFee(FREE_DELIVERY_THRESHOLD + 1)).toBe(0);
  });

  it('computes total as subtotal + delivery - discount, rounded to cents', () => {
    expect(computeTotal(100.005, 4.99, 0)).toBe(105);
    expect(computeTotal(50, 4.99, 5)).toBe(49.99);
  });

  it('generates an order id starting with ord_ and 12 hex chars', () => {
    const id = generateOrderId();
    expect(id).toMatch(/^ord_[0-9a-f]{12}$/);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -- pricing.test`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement checkout pricing domain**

`src/features/checkout/domain/pricing.ts` (ported from `src/App.tsx:290-309`):

```ts
export const FREE_DELIVERY_THRESHOLD = 100;
export const DELIVERY_FEE = 4.99;

export function computeDeliveryFee(subtotal: number): number {
  return subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function computeTotal(subtotal: number, deliveryFee: number, discount = 0): number {
  return Math.round((subtotal + deliveryFee - discount) * 100) / 100;
}

export function generateOrderId(): string {
  const randomHex = Array.from({ length: 12 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `ord_${randomHex}`;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test -- pricing.test`
Expected: PASS, 4 tests.

- [ ] **Step 6: Port the Bangladesh address data**

`src/features/checkout/infrastructure/bangladeshAreas.ts` — copy verbatim from `src/data/bangladeshAreas.ts:1-229`. No changes.

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm run test` — expect all tests so far to pass.

- [ ] **Step 8: Commit**

```bash
git add src/features/orders/infrastructure src/features/checkout/domain src/features/checkout/infrastructure
git commit -m "feat: add orders repository, checkout pricing domain, and address data"
```

---

## Task 9: Checkout feature (application + presentation + route)

**Files:**
- Create: `src/features/checkout/application/placeOrder.ts`
- Create: `src/features/checkout/presentation/CheckoutForm.tsx`
- Create: `src/app/checkout/page.tsx`

**Interfaces:**
- Produces: `placeOrder(params: { user: User; cartItems: CartItem[]; deliveryDetails: { name: string; phone: string; address: string; promoCode?: string; discount?: number; finalTotal?: number } }): Promise<string>` (resolves to the new order id).
- Consumes: `createOrder`, `updateProductStock` (Task 8/6), `computeDeliveryFee`, `computeTotal`, `generateOrderId` (Task 8), `useCart`, `useAuth`, `divisions/districts/thanas/cityCorporations` (Task 8).

- [ ] **Step 1: Implement the `placeOrder` use-case**

`src/features/checkout/application/placeOrder.ts` (ported from `src/App.tsx:278-359`):

```ts
import type { User } from 'firebase/auth';
import type { CartItem, OrderItem, OrderStatus } from '@/shared/domain/types';
import { createOrder } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import { updateProductStock } from '@/features/catalog/infrastructure/firestoreProductsRepository';
import { computeDeliveryFee, computeTotal, generateOrderId } from '../domain/pricing';

export interface DeliveryDetails {
  name: string;
  phone: string;
  address: string;
  promoCode?: string;
  discount?: number;
  finalTotal?: number;
}

export async function placeOrder(params: {
  user: User;
  cartItems: CartItem[];
  deliveryDetails: DeliveryDetails;
}): Promise<string> {
  const { user, cartItems, deliveryDetails } = params;
  const orderId = generateOrderId();

  const orderItemsPayload: OrderItem[] = cartItems.map((item) => ({
    productId: item.product.id,
    name: item.product.name,
    price: item.product.price,
    quantity: item.quantity,
    image: item.product.image,
    selectedSize: item.selectedSize || undefined,
    selectedVariant: item.selectedVariant || undefined,
  }));

  const subtotal = cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const deliveryFee = computeDeliveryFee(subtotal);
  const computedTotal = computeTotal(subtotal, deliveryFee, deliveryDetails.discount ?? 0);
  const finalTotal = deliveryDetails.finalTotal !== undefined ? deliveryDetails.finalTotal : computedTotal;

  const payload: Record<string, any> = {
    userId: user.uid,
    userName: deliveryDetails.name,
    userEmail: user.email || '',
    address: deliveryDetails.address,
    phone: deliveryDetails.phone,
    items: orderItemsPayload,
    totalAmount: finalTotal,
    status: 'pending' as OrderStatus,
    paymentMethod: 'cash_on_delivery' as const,
  };
  if (deliveryDetails.promoCode) payload.promoCode = deliveryDetails.promoCode;
  if (deliveryDetails.discount !== undefined) payload.discount = deliveryDetails.discount;

  await createOrder(orderId, payload);

  for (const item of cartItems) {
    const nextStock = Math.max(0, item.product.stock - item.quantity);
    await updateProductStock(item.product.id, nextStock);
  }

  return orderId;
}
```

- [ ] **Step 2: Port `CheckoutForm`**

`src/features/checkout/presentation/CheckoutForm.tsx` — port from `src/components/CheckoutView.tsx` (read the full file first — it is 649 lines covering: delivery details form, division/district/thana/city-corporation cascading selects from `bangladeshAreas`, promo code input, order summary, and submit). Apply these substitutions:
1. Add `'use client';` as the first line.
2. Replace `import { divisions, districts, thanas, cityCorporations } from '../data/bangladeshAreas';` with `import { divisions, districts, thanas, cityCorporations } from '../infrastructure/bangladeshAreas';`.
3. Replace any `import { ... } from '../types'` with the equivalent `import type { ... } from '@/shared/domain/types'`.
4. Replace the component's props (`user`, `cartItems`, `onBack`, `onPlaceOrder`, `isPlacing`) with hook-sourced values:
   ```tsx
   'use client';
   import { useState } from 'react';
   import { useRouter } from 'next/navigation';
   import { useAuth } from '@/features/auth/presentation/AuthProvider';
   import { useCart } from '@/features/cart/presentation/CartProvider';
   import { placeOrder, type DeliveryDetails } from '../application/placeOrder';

   export default function CheckoutForm() {
     const router = useRouter();
     const { user } = useAuth();
     const { items: cartItems, clearCart } = useCart();
     const [isPlacing, setIsPlacing] = useState(false);
     const onBack = () => router.push('/');
     const onPlaceOrder = async (deliveryDetails: DeliveryDetails) => {
       if (!user) return;
       setIsPlacing(true);
       try {
         await placeOrder({ user, cartItems, deliveryDetails });
         clearCart();
         router.push('/orders');
       } finally {
         setIsPlacing(false);
       }
     };
   ```
5. Keep every form field, cascading select handler, promo code logic, and the JSX/order-summary markup identical to the original — only the data source (props → hooks) and the submit handler's side effects (Firestore writes now live in `placeOrder`, not inline) change.
6. If the original file computes subtotal/delivery fee/total inline for display, replace those inline computations with `computeSubtotal` (from `@/features/cart/domain/cart`) and `computeDeliveryFee`/`computeTotal` (from `../domain/pricing`) so the displayed numbers and the submitted numbers can never drift apart.

- [ ] **Step 3: Create the checkout route**

`src/app/checkout/page.tsx`:

```tsx
'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAuth from '@/features/auth/presentation/RequireAuth';
import CheckoutForm from '@/features/checkout/presentation/CheckoutForm';

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAuth>
          <CheckoutForm />
        </RequireAuth>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm run build` — expect success.

- [ ] **Step 5: Commit**

```bash
git add src/features/checkout src/app/checkout
git commit -m "feat: add checkout feature (placeOrder use-case, CheckoutForm, /checkout route)"
```

---

## Task 10: Customer orders feature (order tracking)

**Files:**
- Create: `src/features/orders/application/getUserOrders.ts`
- Create: `src/features/orders/application/cancelOrder.ts`
- Create: `src/features/orders/presentation/OrderTrackingView.tsx`
- Create: `src/app/orders/page.tsx`

**Interfaces:**
- Produces: `getUserOrders(userId): Promise<Order[]>`, `cancelOrder(orderId): Promise<void>`.
- Consumes: `fetchOrdersForUser`, `updateOrderStatus` (Task 8), `useAuth` (Task 4).

- [ ] **Step 1: Implement the use-cases**

`src/features/orders/application/getUserOrders.ts`:

```ts
import { fetchOrdersForUser } from '../infrastructure/firestoreOrdersRepository';
import type { Order } from '@/shared/domain/types';

export async function getUserOrders(userId: string): Promise<Order[]> {
  return fetchOrdersForUser(userId);
}
```

`src/features/orders/application/cancelOrder.ts`:

```ts
import { updateOrderStatus } from '../infrastructure/firestoreOrdersRepository';

export async function cancelOrder(orderId: string): Promise<void> {
  await updateOrderStatus(orderId, 'cancelled');
}
```

- [ ] **Step 2: Port `OrderTrackingView`**

`src/features/orders/presentation/OrderTrackingView.tsx` — read `src/components/OrderTrackingView.tsx` (392 lines: order list, status filter/search, status badge rendering, cancel button, refresh). Port it with these substitutions:
1. Add `'use client';` as the first line.
2. Replace `import { Order, OrderStatus } from '../types';` with `import type { Order, OrderStatus } from '@/shared/domain/types';`.
3. Replace the props (`orders`, `loading`, `onRefresh`, `onUpdateStatus`, `onCancelOrder`) with internal state fetched on mount:
   ```tsx
   'use client';
   import { useState, useEffect, useCallback } from 'react';
   import { useAuth } from '@/features/auth/presentation/AuthProvider';
   import { getUserOrders } from '../application/getUserOrders';
   import { cancelOrder } from '../application/cancelOrder';
   import type { Order } from '@/shared/domain/types';

   export default function OrderTrackingView() {
     const { user } = useAuth();
     const [orders, setOrders] = useState<Order[]>([]);
     const [loading, setLoading] = useState(true);

     const onRefresh = useCallback(async () => {
       if (!user) return;
       setLoading(true);
       try {
         setOrders(await getUserOrders(user.uid));
       } finally {
         setLoading(false);
       }
     }, [user]);

     useEffect(() => {
       onRefresh();
     }, [onRefresh]);

     const onCancelOrder = async (orderId: string) => {
       await cancelOrder(orderId);
       await onRefresh();
     };
   ```
4. This view has no `onUpdateStatus` prop from the customer side (that was always only reachable from the admin panel in the original code, since `OrderTrackingView` never rendered a status-change control for non-admins — verify against the source file; if it does expose an update-status control here, keep it wired to `cancelOrder` only, since customers may only cancel per `firestore.rules`).
5. Keep the rest of the JSX (search/filter controls, order cards, status badges, empty state) identical, including all `id="..."` attributes.

- [ ] **Step 3: Create the orders route**

`src/app/orders/page.tsx`:

```tsx
'use client';

import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAuth from '@/features/auth/presentation/RequireAuth';
import OrderTrackingView from '@/features/orders/presentation/OrderTrackingView';

export default function OrdersPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAuth>
          <OrderTrackingView />
        </RequireAuth>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm run build` — expect success.

- [ ] **Step 5: Commit**

```bash
git add src/features/orders/application src/features/orders/presentation src/app/orders
git commit -m "feat: add customer order tracking feature and /orders route"
```

---

## Task 11: Admin inventory feature

**Files:**
- Create: `src/features/admin/inventory/domain/category.ts`
- Test: `src/features/admin/inventory/domain/category.test.ts`
- Create: `src/features/admin/inventory/infrastructure/firestoreCategoriesRepository.ts`
- Create: `src/features/admin/inventory/infrastructure/firestoreProductAdminRepository.ts`
- Create: `src/features/admin/inventory/infrastructure/imageCompression.ts`
- Create: `src/features/admin/inventory/presentation/ImageCropperModal.tsx`
- Create: `src/features/admin/inventory/presentation/InventoryManager.tsx`
- Create: `src/app/admin/page.tsx`

**Interfaces:**
- Produces: `isValidCategoryName(name): boolean` (domain), `fetchCategories()`, `createCategory()`, `addSubcategory()` (infra), `createProduct(product)`, `updateProduct(id, product)`, `deleteProduct(id)` (infra), `<InventoryManager />` (self-contained: fetches its own products/categories, no props).
- Consumes: `db` (Task 2), `useAuth`/`RequireAdmin` (Task 4).

- [ ] **Step 1: Write failing test for category domain validation**

`src/features/admin/inventory/domain/category.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { isValidCategoryName } from './category';

describe('isValidCategoryName', () => {
  it('rejects empty or whitespace-only names', () => {
    expect(isValidCategoryName('')).toBe(false);
    expect(isValidCategoryName('   ')).toBe(false);
  });

  it('accepts a non-empty trimmed name', () => {
    expect(isValidCategoryName('Bags')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- category.test`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement category domain validation**

`src/features/admin/inventory/domain/category.ts`:

```ts
export function isValidCategoryName(name: string): boolean {
  return name.trim().length > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- category.test`
Expected: PASS, 2 tests.

- [ ] **Step 5: Read the current AdminPanel to extract the inventory portion**

Read `src/components/AdminPanel.tsx` in full (1368 lines) and `src/components/ImageCropperModal.tsx` in full (372 lines) before continuing — this task ports the `adminSubTab === 'inventory'` portion only (product list/search, product editor form with sizes/variants/categories, image cropper integration, category/subcategory CRUD). The `adminSubTab === 'orders'` portion is ported separately in Task 12.

- [ ] **Step 6: Implement the categories repository**

`src/features/admin/inventory/infrastructure/firestoreCategoriesRepository.ts` — port the category-related Firestore calls found in `src/components/AdminPanel.tsx` (search for `categoryDocs`, `arrayUnion`, and the categories collection queries). Export:

```ts
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, orderBy, arrayUnion } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';

export interface CategoryDoc {
  id: string;
  name: string;
  subcategories: string[];
}

export async function fetchCategories(): Promise<CategoryDoc[]> {
  const snapshot = await getDocs(query(collection(db, 'categories'), orderBy('name')));
  return snapshot.docs.map((d) => ({ id: d.id, name: d.data().name, subcategories: d.data().subcategories || [] }));
}

export async function createCategory(name: string): Promise<void> {
  const id = name.trim().toLowerCase().replace(/\s+/g, '-');
  await setDoc(doc(db, 'categories', id), { name: name.trim(), subcategories: [] });
}

export async function addSubcategory(categoryId: string, subcategory: string): Promise<void> {
  await updateDoc(doc(db, 'categories', categoryId), { subcategories: arrayUnion(subcategory.trim()) });
}
```

Match the exact document shape/field names AdminPanel.tsx already uses for `categories` documents — if the original uses different field names, mirror those instead of the placeholders above.

- [ ] **Step 7: Implement the product admin repository**

`src/features/admin/inventory/infrastructure/firestoreProductAdminRepository.ts` — port the product create/update/delete Firestore calls from `src/components/AdminPanel.tsx`:

```ts
import { collection, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/shared/infrastructure/firebase/app';
import type { Product } from '@/shared/domain/types';

export async function createProduct(product: Omit<Product, 'id'> & { id?: string }): Promise<string> {
  const ref = product.id ? doc(db, 'products', product.id) : doc(collection(db, 'products'));
  await setDoc(ref, product);
  return ref.id;
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<void> {
  await updateDoc(doc(db, 'products', id), product);
}

export async function deleteProduct(id: string): Promise<void> {
  await deleteDoc(doc(db, 'products', id));
}
```

- [ ] **Step 8: Port the image compression helper**

`src/features/admin/inventory/infrastructure/imageCompression.ts` — locate the image compression logic in `src/components/AdminPanel.tsx` (search for `compressedDataUrl`) and/or `src/components/ImageCropperModal.tsx`, and move that pure canvas-to-dataURL compression function here verbatim, exported as `compressImage(source: string | Blob, options?: { maxWidth?: number; quality?: number }): Promise<string>` (match whatever signature the original function actually has — do not invent a different one).

- [ ] **Step 9: Port `ImageCropperModal`**

`src/features/admin/inventory/presentation/ImageCropperModal.tsx` — port verbatim from `src/components/ImageCropperModal.tsx:1-372`, with these substitutions:
1. Add `'use client';` as the first line.
2. Update any `import ... from '../types'` to `import type ... from '@/shared/domain/types'` if present.
3. Update the import of the compression helper (if it previously lived inline) to `import { compressImage } from '../infrastructure/imageCompression';`.
4. Keep all other logic (canvas drawing, crop handles, zoom/pan) identical.

- [ ] **Step 10: Port the inventory manager**

`src/features/admin/inventory/presentation/InventoryManager.tsx` — port the `adminSubTab === 'inventory'` JSX and state/handlers from `src/components/AdminPanel.tsx` (product search, product editor form incl. sizes/variants management, category/subcategory management, save/delete). Substitutions:
1. Add `'use client';` as the first line.
2. Replace `import { db } from '../firebase';` and direct `firebase/firestore` calls with calls into `../infrastructure/firestoreProductAdminRepository` and `../infrastructure/firestoreCategoriesRepository`.
3. Replace `import { Product, ProductVariant, Order, OrderStatus } from '../types';` with `import type { Product, ProductVariant } from '@/shared/domain/types';` (drop `Order`/`OrderStatus` — not used by inventory).
4. Replace `import ImageCropperModal from './ImageCropperModal';` with `import ImageCropperModal from './ImageCropperModal';` (same relative import, now within the same `presentation/` directory — no path change needed since both files moved together).
5. Replace the `products` and `onRefreshProducts` props with an internal fetch:
   ```tsx
   'use client';
   import { useState, useEffect, useCallback } from 'react';
   import { fetchAllProducts } from '@/features/catalog/infrastructure/firestoreProductsRepository';
   import type { Product } from '@/shared/domain/types';

   export default function InventoryManager() {
     const [products, setProducts] = useState<Product[]>([]);
     const [productsLoading, setProductsLoading] = useState(true);

     const refreshProducts = useCallback(async () => {
       setProductsLoading(true);
       try {
         setProducts(await fetchAllProducts());
       } finally {
         setProductsLoading(false);
       }
     }, []);

     useEffect(() => {
       refreshProducts();
     }, [refreshProducts]);
   ```
6. Drop the `user` prop — this component is always rendered behind `RequireAdmin` (Task 4), so no internal admin check is needed.
7. Keep every other piece of state, form field, and JSX from the inventory portion identical, including all `id="..."` attributes.

- [ ] **Step 11: Create the admin route**

`src/app/admin/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAdmin from '@/features/auth/presentation/RequireAdmin';
import InventoryManager from '@/features/admin/inventory/presentation/InventoryManager';

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAdmin>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <div className="flex items-center gap-2 mb-6 border-b border-[#EEEEEE] pb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-black border-b-2 border-black pb-4 -mb-4">
                Inventory
              </span>
              <Link
                href="/admin/orders"
                className="text-xs font-bold uppercase tracking-wider text-[#717171] hover:text-black pb-4 -mb-4"
              >
                Orders
              </Link>
            </div>
            <InventoryManager />
          </div>
        </RequireAdmin>
      </main>
    </div>
  );
}
```

- [ ] **Step 12: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm run build` — expect success.

- [ ] **Step 13: Commit**

```bash
git add src/features/admin/inventory src/app/admin/page.tsx
git commit -m "feat: add admin inventory feature (products, categories, image cropper) and /admin route"
```

---

## Task 12: Admin orders feature

**Files:**
- Create: `src/features/admin/orders/application/listAllOrders.ts`
- Create: `src/features/admin/orders/application/updateOrderStatusAsAdmin.ts`
- Create: `src/features/admin/orders/presentation/AdminOrderManager.tsx`
- Create: `src/app/admin/orders/page.tsx`

**Interfaces:**
- Produces: `listAllOrders(): Promise<Order[]>`, `updateOrderStatusAsAdmin(orderId, status): Promise<void>`.
- Consumes: `fetchAllOrders`, `updateOrderStatus` (Task 8).

- [ ] **Step 1: Implement the use-cases**

`src/features/admin/orders/application/listAllOrders.ts`:

```ts
import { fetchAllOrders } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import type { Order } from '@/shared/domain/types';

export async function listAllOrders(): Promise<Order[]> {
  return fetchAllOrders();
}
```

`src/features/admin/orders/application/updateOrderStatusAsAdmin.ts`:

```ts
import { updateOrderStatus } from '@/features/orders/infrastructure/firestoreOrdersRepository';
import type { OrderStatus } from '@/shared/domain/types';

export async function updateOrderStatusAsAdmin(orderId: string, status: OrderStatus): Promise<void> {
  await updateOrderStatus(orderId, status);
}
```

- [ ] **Step 2: Port the admin order management UI**

`src/features/admin/orders/presentation/AdminOrderManager.tsx` — port the `adminSubTab === 'orders'` JSX and state/handlers from `src/components/AdminPanel.tsx` (order search, status filter, status-change controls — the `allOrders`, `ordersLoading`, `orderSearchQuery`, `orderStatusFilter` state seen in the earlier scan of that file). Substitutions:
1. Add `'use client';` as the first line.
2. Replace direct Firestore calls with `listAllOrders` and `updateOrderStatusAsAdmin`:
   ```tsx
   'use client';
   import { useState, useEffect, useCallback } from 'react';
   import { listAllOrders } from '../application/listAllOrders';
   import { updateOrderStatusAsAdmin } from '../application/updateOrderStatusAsAdmin';
   import type { Order, OrderStatus } from '@/shared/domain/types';

   export default function AdminOrderManager() {
     const [allOrders, setAllOrders] = useState<Order[]>([]);
     const [ordersLoading, setOrdersLoading] = useState(true);

     const refreshOrders = useCallback(async () => {
       setOrdersLoading(true);
       try {
         setAllOrders(await listAllOrders());
       } finally {
         setOrdersLoading(false);
       }
     }, []);

     useEffect(() => {
       refreshOrders();
     }, [refreshOrders]);

     const onUpdateStatus = async (orderId: string, status: OrderStatus) => {
       await updateOrderStatusAsAdmin(orderId, status);
       await refreshOrders();
     };
   ```
3. Replace `import { Product, ProductVariant, Order, OrderStatus } from '../types';` with `import type { Order, OrderStatus } from '@/shared/domain/types';` (this file doesn't need `Product`/`ProductVariant`).
4. Keep the rest of the JSX (search/filter bar, order cards, status badges/dropdowns) identical, including all `id="..."` attributes.

- [ ] **Step 3: Create the admin orders route**

`src/app/admin/orders/page.tsx`:

```tsx
'use client';

import Link from 'next/link';
import Navbar from '@/features/catalog/presentation/Navbar';
import RequireAdmin from '@/features/auth/presentation/RequireAdmin';
import AdminOrderManager from '@/features/admin/orders/presentation/AdminOrderManager';

export default function AdminOrdersPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 w-full pb-24 sm:pb-16">
        <RequireAdmin>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
            <div className="flex items-center gap-2 mb-6 border-b border-[#EEEEEE] pb-4">
              <Link
                href="/admin"
                className="text-xs font-bold uppercase tracking-wider text-[#717171] hover:text-black pb-4 -mb-4"
              >
                Inventory
              </Link>
              <span className="text-xs font-bold uppercase tracking-wider text-black border-b-2 border-black pb-4 -mb-4">
                Orders
              </span>
            </div>
            <AdminOrderManager />
          </div>
        </RequireAdmin>
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npm run build` — expect success.

- [ ] **Step 5: Commit**

```bash
git add src/features/admin/orders src/app/admin/orders
git commit -m "feat: add admin order management feature and /admin/orders route"
```

---

## Task 13: Cleanup, final config, and full verification

**Files:**
- Delete: `src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/firebase.ts`, `src/types.ts`, `src/data/` (whole directory), `src/components/` (whole directory), `vite.config.ts`, `index.html`
- Modify: `.env.example`
- Modify: `README.md`
- Modify: `.gitignore` (add `.next/`)

**Interfaces:** none new — this task only removes superseded files and re-verifies the whole app.

- [ ] **Step 1: Confirm nothing still imports the old files**

Run: `grep -rn "from '\.\./types'\|from '\.\./firebase'\|components/AdminPanel\|components/CheckoutView\|components/OrderTrackingView\|components/Navbar\|components/CartDrawer\|components/ProductCard\|components/ProductDetailModal\|components/ImageCropperModal\|data/bangladeshAreas" src/features src/app src/shared`
Expected: no output. If anything matches, fix that file's imports before deleting sources (it means a porting step in an earlier task was missed).

- [ ] **Step 2: Delete the old Vite/CRA source tree**

```bash
git rm -r src/App.tsx src/main.tsx src/index.css src/firebase.ts src/types.ts src/data src/components vite.config.ts index.html
```

- [ ] **Step 3: Update `.gitignore`**

Add `.next/` to `.gitignore` (keep all existing entries):

```
node_modules/
build/
dist/
.next/
coverage/
.DS_Store
*.log
.env*
!.env.example
```

- [ ] **Step 4: Update `.env.example`**

Replace its contents — the old `GEMINI_API_KEY`/`APP_URL` vars are unused (no `@google/genai` or Express server remain in the app):

```
# This app has no required environment variables today.
# Firebase client config is read from firebase-applet-config.json (already committed, contains only public client keys).
```

- [ ] **Step 5: Update `README.md`**

Replace its contents with basic Next.js run instructions:

```markdown
# SwiftCart

Next.js 15 (App Router) e-commerce storefront + admin panel, backed by Firebase (Firestore + Google Auth).

## Architecture

Feature-first clean architecture — see `docs/superpowers/specs/2026-07-22-nextjs-clean-architecture-design.md`.

## Run locally

1. Install dependencies: `npm install`
2. Run the dev server: `npm run dev`
3. Run domain unit tests: `npm run test`
4. Type-check: `npm run lint`
5. Production build: `npm run build`
```

- [ ] **Step 6: Full verification — types, tests, build**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npm run test`
Expected: all Vitest suites pass (formatCurrency, adminEmail, cart, filter, pricing, category — at least 24 tests total across those 6 files).

Run: `npm run build`
Expected: `Compiled successfully`. Review the route list in the output — it must include `/`, `/products/[id]`, `/checkout`, `/orders`, `/admin`, `/admin/orders`, and the `@modal` intercepted route.

- [ ] **Step 7: Start the dev server and smoke-test every route returns 200**

Run in background: `npm run dev`

Then run each of these and confirm `200`:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/checkout
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/orders
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/admin/orders
```

If Firestore already has at least one product, also fetch its id from `/` (e.g. `curl -s http://localhost:3000/ | grep -o 'product-card-[a-zA-Z0-9_-]*' | head -1`) and check `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/products/<that-id>` returns `200`.

- [ ] **Step 8: Manual browser smoke test (golden path)**

With the dev server still running, open `http://localhost:3000/` in a browser and verify:
1. Catalog renders with real Firestore products, search and category filters work.
2. Clicking a product card opens the modal (URL changes to `/products/<id>` but the catalog stays visible behind it); closing it returns to `/`.
3. Directly visiting `/products/<id>` in a new tab renders the full page (no modal chrome).
4. Sign in with Google, add an item to the cart, open the cart drawer, proceed to checkout, fill the delivery form, and place an order — confirm redirect to `/orders` and the new order appears.
5. If signed in as `asfaqueahmedsakkar@gmail.com`, visit `/admin`, confirm the inventory list loads and `/admin/orders` shows the order just placed with a way to change its status.
6. Sign out, then confirm visiting `/orders` or `/admin` redirects back to `/`.

Report any failures found in this step — fix them and re-run before proceeding.

- [ ] **Step 9: Stop the dev server and commit**

```bash
git add -A
git commit -m "chore: remove superseded Vite/SPA source files, update docs and env example"
```

---

## Post-migration note

`firebase.json`, `firebase-blueprint.json`, `firestore.rules`, `firebase-applet-config.json`, and `.firebaserc` are untouched by this plan — they govern Firebase Hosting/Firestore config, not the app framework, and remain valid. If Firebase Hosting is used to deploy this app, a follow-up (out of scope here) will be needed to point hosting at the Next.js build output (e.g. via `@firebase/next-hosting` support or a separate Node host), since static `firebase deploy` hosting alone does not serve SSR routes.
