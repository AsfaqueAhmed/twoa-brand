# Custom Tee Quote Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Customers request a quote for their custom tee design (name, phone, WhatsApp); the admin prices it and sends a one-time checkout link; the customer places a COD order from the link; the admin downloads the design and artwork as a ZIP.

**Architecture:** One migration adds a `custom_quotes` table, two storage buckets and four RPCs (customer submit / read-by-token / place order, admin pricing). Pure domain modules (customer payload + validation, admin pricing/links/ZIP plan) are unit-tested. Browser-only pieces (canvas preview renderer, uploads, ZIP builder) sit in `application/`. UI: a shared `QuoteRequestModal` wired into both studios, a new admin Custom Quotes page, a `/custom-order` checkout page, and custom-order display in the admin orders.

**Tech Stack:** Next.js 15 static export (`output: 'export'`, so NO dynamic routes — use query params), React 19, TypeScript, Tailwind 4, Supabase (Postgres RPC + Storage), `fflate` (new dependency, ZIP), Vitest (node env, `src/**/*.test.ts`).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-10-29-custom-tee-quotes-design.md`.
- The migration file is WRITTEN but must NOT be applied to any database by implementers (the controller dry-runs it in a rolled-back transaction, takes a backup, asks the owner, then applies).
- Static export: the customer link is `/custom-order?token=<token>` (read with `useSearchParams` inside a `<Suspense>` boundary, in a `'use client'` page); admin detail uses `?id=`.
- Security: customers never read or write `custom_quotes` directly (RLS admin-only); all customer access is through the RPCs. Price and token validity are always checked in the database. Private artwork bucket readable only by admin.
- Quote id format `CQ-` + 8 chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`; storage paths `quotes/<quoteId>/preview-<viewId>.png` and `quotes/<quoteId>/artwork-<n>.<ext>`; buckets `custom-previews` (public) and `custom-artwork` (private).
- Phone rules: name 2-100 chars; phone and WhatsApp each 8-15 digits (a leading `+` allowed, other punctuation stripped).
- Statuses: `new`, `contacted`, `quoted`, `ordered`, `declined`, `expired` (`expired` is also computed client-side when `quoted` and past expiry).
- Style: storefront/studio pieces use the existing 8px radius black-and-white style; admin pieces follow the existing admin UI kit (`src/features/admin/presentation/ui/`, sharp corners) like `OrderReturnsPage`.
- Work is on branch `feat/custom-tee-quotes`; do not push or merge to main.
- Vitest only runs `src/**/*.test.ts`; component code is verified with `npx tsc --noEmit` and the browser.

## File Structure

- Create `supabase/migrations/20261029000000_custom_tee_quotes.sql` — Task 1
- Create `src/features/customTee/domain/quote.ts` (+ test), `application/artworkOriginals.ts`, `application/renderPreview.ts`, `infrastructure/customQuoteRepository.ts` — Task 2; modify `application/imageUpload.ts` (register originals)
- Create `src/features/customTee/presentation/QuoteRequestModal.tsx`; modify `studio/StudioEditor.tsx`, `mobile/MobileStudioEditor.tsx`, `mobile/MobileHeader.tsx` — Task 3
- Create `src/features/admin/customQuotes/domain/customQuote.ts` (+ test), `infrastructure/customQuotesAdminRepository.ts`, `application/buildQuoteZip.ts` — Task 4
- Create `src/features/admin/customQuotes/presentation/CustomQuotesPage.tsx`, `src/app/admin/custom-quotes/page.tsx`; modify `src/features/admin/presentation/adminNav.ts` (+ its test if needed) — Task 5
- Create `src/features/customTee/domain/customOrder.ts` (+ test), `src/features/customTee/presentation/CustomOrderPage.tsx`, `src/app/custom-order/page.tsx`; modify `shared/domain/types.ts`, `features/orders/infrastructure/firestoreOrdersRepository.ts` (item mapping) — Task 6
- Modify admin order presentation (`OrderItemsPanel.tsx`, `EditOrderPage.tsx`) — Task 7

---

### Task 1: Migration file (do NOT apply)

**Files:**
- Create: `supabase/migrations/20261029000000_custom_tee_quotes.sql`

**Interfaces:**
- Produces (database): table `custom_quotes`; buckets `custom-previews`, `custom-artwork`; functions `submit_custom_quote(p_id text, p_name text, p_phone text, p_whatsapp text, p_parent_product_id text, p_tee_size text, p_color_name text, p_design jsonb, p_files jsonb, p_website text) returns text`, `get_quote_for_checkout(p_token text) returns jsonb`, `place_custom_order(p_token text, p_order_id text, p_user_id text, p_user_email text, p_name text, p_phone text, p_address text, p_delivery_fee numeric) returns text`, `set_custom_quote_pricing(p_id text, p_lines jsonb, p_unit_price numeric, p_expires_at timestamptz, p_regenerate boolean) returns text`.

- [ ] **Step 1: Write the migration** with exactly this content:

```sql
-- Custom tee quote requests.
-- Customers submit a design + contact details (anon, via submit_custom_quote). An admin prices it and sends a
-- one-time checkout link; the customer then places a normal cash-on-delivery order via place_custom_order.
-- NOTE: back up the database before applying.

create table custom_quotes (
  id text primary key,
  name text not null,
  phone text not null,
  whatsapp text not null,
  parent_product_id text not null,
  parent_name text not null default '',
  tee_size text not null,
  color_name text,
  design jsonb not null,
  files jsonb not null default '{"previews":[],"artwork":[]}'::jsonb,
  status text not null default 'new' check (status in ('new', 'contacted', 'quoted', 'ordered', 'declined', 'expired')),
  admin_note text not null default '',
  lines jsonb,
  unit_price numeric,
  quote_token text unique,
  quote_expires_at timestamptz,
  order_id text references orders(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_quotes_status_created_idx on custom_quotes (status, created_at desc);
create index custom_quotes_phone_created_idx on custom_quotes (phone, created_at desc);

alter table custom_quotes enable row level security;
create policy custom_quotes_admin_all on custom_quotes for all using (is_admin()) with check (is_admin());

-- --- Storage ---
-- Previews are public by URL (mock-ups only); artwork is private (admin read). Anonymous visitors may only INSERT under quotes/.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('custom-previews', 'custom-previews', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']),
  ('custom-artwork', 'custom-artwork', false, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy custom_previews_insert on storage.objects for insert
  with check (bucket_id = 'custom-previews' and name like 'quotes/%');
create policy custom_artwork_insert on storage.objects for insert
  with check (bucket_id = 'custom-artwork' and name like 'quotes/%');
create policy custom_artwork_admin_read on storage.objects for select
  using (bucket_id = 'custom-artwork' and is_admin());
create policy custom_files_admin_delete on storage.objects for delete
  using (bucket_id in ('custom-previews', 'custom-artwork') and is_admin());

-- --- RPCs ---

create or replace function submit_custom_quote(
  p_id text,
  p_name text,
  p_phone text,
  p_whatsapp text,
  p_parent_product_id text,
  p_tee_size text,
  p_color_name text,
  p_design jsonb,
  p_files jsonb,
  p_website text default ''
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '[^0-9+]', '', 'g');
  v_whatsapp text := regexp_replace(coalesce(p_whatsapp, ''), '[^0-9+]', '', 'g');
  v_parent_name text;
  v_recent int;
  v_file jsonb;
begin
  -- Honeypot: bots fill the hidden field; pretend success without saving anything.
  if coalesce(p_website, '') <> '' then
    return p_id;
  end if;

  if p_id is null or p_id !~ '^CQ-[A-Z0-9]{8}$' then
    raise exception 'Invalid request.';
  end if;
  if length(btrim(coalesce(p_name, ''))) < 2 or length(p_name) > 100 then
    raise exception 'Please enter your name.';
  end if;
  if length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 8 and 15 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if length(regexp_replace(v_whatsapp, '[^0-9]', '', 'g')) not between 8 and 15 then
    raise exception 'Please enter a valid WhatsApp number.';
  end if;
  if p_design is null or jsonb_typeof(p_design) <> 'object' or octet_length(p_design::text) > 300000 then
    raise exception 'Invalid design.';
  end if;
  if p_files is null or jsonb_typeof(p_files) <> 'object' or octet_length(p_files::text) > 20000 then
    raise exception 'Invalid files.';
  end if;

  -- Every referenced file must live under this quote's own folder.
  for v_file in
    select * from jsonb_array_elements(coalesce(p_files -> 'previews', '[]'::jsonb) || coalesce(p_files -> 'artwork', '[]'::jsonb))
  loop
    if coalesce(v_file ->> 'path', '') !~ ('^quotes/' || p_id || '/[A-Za-z0-9._-]+$') then
      raise exception 'Invalid file reference.';
    end if;
  end loop;

  select name into v_parent_name from parent_products where id = p_parent_product_id;
  if v_parent_name is null then
    raise exception 'That tee is no longer available.';
  end if;
  if not exists (select 1 from parent_product_size_stock where parent_id = p_parent_product_id and size = p_tee_size) then
    raise exception 'That size is not available.';
  end if;

  select count(*) into v_recent from custom_quotes where phone = v_phone and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'Too many requests. Please try again later.';
  end if;

  insert into custom_quotes (id, name, phone, whatsapp, parent_product_id, parent_name, tee_size, color_name, design, files)
  values (p_id, btrim(p_name), v_phone, v_whatsapp, p_parent_product_id, v_parent_name, p_tee_size, nullif(btrim(coalesce(p_color_name, '')), ''), p_design, p_files);

  return p_id;
end;
$$;

-- Admin: set quantities per size, the price per piece and the expiry; returns the checkout token.
create or replace function set_custom_quote_pricing(
  p_id text,
  p_lines jsonb,
  p_unit_price numeric,
  p_expires_at timestamptz,
  p_regenerate boolean default false
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  q custom_quotes%rowtype;
  line jsonb;
  v_token text;
begin
  if not is_admin() then
    raise exception 'Not authorized';
  end if;

  select * into q from custom_quotes where id = p_id for update;
  if not found then
    raise exception 'Quote not found';
  end if;
  if q.status = 'ordered' then
    raise exception 'This quote has already been ordered.';
  end if;

  if p_lines is null or jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 then
    raise exception 'Add at least one size with a quantity.';
  end if;
  for line in select * from jsonb_array_elements(p_lines)
  loop
    if coalesce((line ->> 'qty')::int, 0) < 1 or (line ->> 'qty')::int > 1000 then
      raise exception 'Invalid quantity.';
    end if;
    if not exists (select 1 from parent_product_size_stock where parent_id = q.parent_product_id and size = line ->> 'size') then
      raise exception 'Unknown size %.', line ->> 'size';
    end if;
  end loop;
  if p_unit_price is null or p_unit_price <= 0 or p_unit_price > 1000000 then
    raise exception 'Enter a valid price per piece.';
  end if;
  if p_expires_at is null or p_expires_at <= now() then
    raise exception 'Choose an expiry in the future.';
  end if;

  v_token := q.quote_token;
  if v_token is null or p_regenerate then
    v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  end if;

  update custom_quotes
  set lines = p_lines, unit_price = p_unit_price, quote_token = v_token, quote_expires_at = p_expires_at,
      status = 'quoted', updated_at = now()
  where id = p_id;

  return v_token;
end;
$$;

-- Customer: what the checkout link shows. Returns null unless the quote is currently quoted and not expired.
create or replace function get_quote_for_checkout(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', id,
    'name', name,
    'phone', phone,
    'parentProductId', parent_product_id,
    'parentName', parent_name,
    'teeSize', tee_size,
    'colorName', color_name,
    'lines', lines,
    'unitPrice', unit_price,
    'previews', files -> 'previews',
    'expiresAt', quote_expires_at
  )
  from custom_quotes
  where quote_token = p_token and status = 'quoted' and quote_expires_at > now();
$$;

-- Customer: place the COD order for a quote. The price and stock come from the database, never from the browser.
create or replace function place_custom_order(
  p_token text,
  p_order_id text,
  p_user_id text,
  p_user_email text,
  p_name text,
  p_phone text,
  p_address text,
  p_delivery_fee numeric
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  q custom_quotes%rowtype;
  line jsonb;
  v_qty int;
  v_stock int;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric := 0;
  v_preview text;
  v_item jsonb;
begin
  select * into q from custom_quotes where quote_token = p_token for update;
  if not found or q.status <> 'quoted' or q.quote_expires_at is null or q.quote_expires_at <= now() then
    raise exception 'This quote link is no longer valid.';
  end if;

  if length(btrim(coalesce(p_name, ''))) < 2 or length(p_name) > 100 then
    raise exception 'Please enter your name.';
  end if;
  if length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) not between 8 and 20 then
    raise exception 'Please enter a valid phone number.';
  end if;
  if length(btrim(coalesce(p_address, ''))) < 5 or length(p_address) > 500 then
    raise exception 'Please enter a valid address.';
  end if;
  if p_delivery_fee is null or p_delivery_fee < 0 or p_delivery_fee > 1000 then
    raise exception 'Invalid delivery fee.';
  end if;
  if p_order_id is null or length(p_order_id) > 60 then
    raise exception 'Invalid order id.';
  end if;

  v_preview := q.files -> 'previews' -> 0 ->> 'path';

  -- Check every size first, then decrement (same pooled-stock rule as place_order).
  for line in select * from jsonb_array_elements(q.lines)
  loop
    v_qty := (line ->> 'qty')::int;
    select stock into v_stock from parent_product_size_stock
    where parent_id = q.parent_product_id and size = line ->> 'size' for update;
    if v_stock is null then
      raise exception 'Stock record not found for size %', line ->> 'size';
    end if;
    if v_stock < v_qty then
      raise exception 'Only % left in size %. Please contact us to adjust your order.', v_stock, line ->> 'size';
    end if;
  end loop;

  for line in select * from jsonb_array_elements(q.lines)
  loop
    v_qty := (line ->> 'qty')::int;
    update parent_product_size_stock set stock = stock - v_qty
    where parent_id = q.parent_product_id and size = line ->> 'size';

    v_subtotal := v_subtotal + q.unit_price * v_qty;
    v_item := jsonb_build_object(
      'productId', 'custom-' || q.id,
      'name', 'Custom Tee - ' || q.parent_name,
      'price', q.unit_price,
      'quantity', v_qty,
      'selectedSize', line ->> 'size',
      'parentProductId', q.parent_product_id,
      'customQuoteId', q.id,
      'customPreviewPath', v_preview
    );
    if q.color_name is not null then
      v_item := v_item || jsonb_build_object('selectedVariant', jsonb_build_object('id', 'custom-color', 'name', q.color_name));
    end if;
    v_items := v_items || jsonb_build_array(v_item);
  end loop;

  insert into orders (id, user_id, user_name, user_email, address, phone, items, total_amount, promo_code, discount, status, payment_method, created_at, updated_at)
  values (p_order_id, coalesce(p_user_id, 'guest'), btrim(p_name), coalesce(p_user_email, ''), btrim(p_address), btrim(p_phone), v_items, v_subtotal + p_delivery_fee, null, null, 'pending', 'cash_on_delivery', now(), now());

  update custom_quotes set status = 'ordered', order_id = p_order_id, updated_at = now() where id = q.id;

  return p_order_id;
end;
$$;

revoke execute on function set_custom_quote_pricing(text, jsonb, numeric, timestamptz, boolean) from public, anon;
grant execute on function set_custom_quote_pricing(text, jsonb, numeric, timestamptz, boolean) to authenticated;
grant execute on function submit_custom_quote(text, text, text, text, text, text, text, jsonb, jsonb, text) to anon, authenticated;
grant execute on function get_quote_for_checkout(text) to anon, authenticated;
grant execute on function place_custom_order(text, text, text, text, text, text, text, numeric) to anon, authenticated;
```

- [ ] **Step 2: Sanity-check the SQL by reading it** against `supabase/migrations/20260802191915_init_schema.sql` (the `orders` insert column list must match exactly, `parent_product_size_stock` column names are `parent_id`, `size`, `stock`, and `is_admin()` exists). Do NOT run it against any database and do not run Supabase tools/CLI.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20261029000000_custom_tee_quotes.sql
git commit -m "feat(custom-quotes): migration for quotes table, storage buckets and RPCs (not applied)"
```

---

### Task 2: Customer domain, preview renderer and repository

**Files:**
- Create: `src/features/customTee/domain/quote.ts`, `src/features/customTee/domain/quote.test.ts`
- Create: `src/features/customTee/application/artworkOriginals.ts`, `src/features/customTee/application/renderPreview.ts`
- Create: `src/features/customTee/infrastructure/customQuoteRepository.ts`
- Modify: `src/features/customTee/application/imageUpload.ts` (register originals)

**Interfaces:**
- Consumes: `StudioDesign` from `./design`; `StudioView` from `./views`; `Layer` types from `./layers`; `FONT_CATALOG`/font helpers from `./fonts` and `ensureFontsLoaded` from `../application/fontLoader`; `supabase` from `@/shared/infrastructure/supabase/client`.
- Produces:
  - `quote.ts`: `QuoteContact = { name: string; phone: string; whatsapp: string }`, `validateQuoteContact(c): { ok: true; value: QuoteContact } | { ok: false; errors: Partial<Record<keyof QuoteContact, string>> }`, `generateQuoteId(rand?: () => number): string`, `QUOTE_ID_PATTERN`, `extractArtwork(design: StudioDesign): { design: StudioDesign; sources: string[] }` (image layer `src` replaced by `artwork:<n>`; identical data URLs share an index), `dataUrlMime(dataUrl): string`, `extForMime(mime): string`, `buildQuoteFiles(quoteId: string, views: { id: string; label: string }[], artworkMimes: string[]): { previews: { viewId: string; label: string; path: string }[]; artwork: { name: string; path: string }[] }`.
  - `artworkOriginals.ts`: `registerOriginal(dataUrl: string, file: File): void`, `getOriginal(dataUrl: string): File | undefined`.
  - `renderPreview.ts`: `renderViewPng(params: { baseImageUrl: string; layers: Layer[]; width?: number }): Promise<Blob>` (default width 1200).
  - `customQuoteRepository.ts`: `submitQuote(input: { id: string; contact: QuoteContact; parentProductId: string; teeSize: string; colorName?: string; design: StudioDesign; files: QuoteFiles; website: string }): Promise<void>` calling `submit_custom_quote`, and `uploadQuoteFile(bucket: 'custom-previews' | 'custom-artwork', path: string, blob: Blob): Promise<void>`; type `QuoteFiles`.

- [ ] **Step 1: Write the failing test** `quote.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { createImageLayer, createTextLayer } from './layers';
import type { StudioDesign } from './design';
import {
  QUOTE_ID_PATTERN,
  buildQuoteFiles,
  dataUrlMime,
  extForMime,
  extractArtwork,
  generateQuoteId,
  validateQuoteContact,
} from './quote';

describe('generateQuoteId', () => {
  it('produces CQ- plus 8 characters from the allowed alphabet', () => {
    let i = 0;
    const id = generateQuoteId(() => (i++ % 10) / 10);
    expect(id).toMatch(QUOTE_ID_PATTERN);
  });
  it('is not constant with real randomness', () => {
    expect(generateQuoteId()).not.toBe(generateQuoteId());
  });
});

describe('validateQuoteContact', () => {
  it('accepts and normalizes valid contacts', () => {
    const r = validateQuoteContact({ name: '  Rahim Uddin ', phone: '01711-223344', whatsapp: '+880 1711 223344' });
    expect(r).toEqual({ ok: true, value: { name: 'Rahim Uddin', phone: '01711223344', whatsapp: '+8801711223344' } });
  });
  it('reports each invalid field', () => {
    const r = validateQuoteContact({ name: 'A', phone: '123', whatsapp: 'abc' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['name', 'phone', 'whatsapp']);
  });
  it('rejects overlong names and numbers', () => {
    expect(validateQuoteContact({ name: 'x'.repeat(101), phone: '01711223344', whatsapp: '01711223344' }).ok).toBe(false);
    expect(validateQuoteContact({ name: 'Ok Name', phone: '1'.repeat(16), whatsapp: '01711223344' }).ok).toBe(false);
  });
});

describe('extractArtwork', () => {
  const A = 'data:image/png;base64,AAAA';
  const B = 'data:image/jpeg;base64,BBBB';
  const design: StudioDesign = {
    parentProductId: 'p',
    size: 'M',
    layersByView: {
      'view-0': [createImageLayer({ id: 'a', name: 'a', src: A, aspect: 1 }), createTextLayer({ id: 't', text: 'Hi' })],
      'view-1': [createImageLayer({ id: 'b', name: 'b', src: B, aspect: 1 }), createImageLayer({ id: 'c', name: 'c', src: A, aspect: 1 })],
    },
  };
  it('replaces image sources with artwork references and de-duplicates', () => {
    const { design: out, sources } = extractArtwork(design);
    expect(sources).toEqual([A, B]);
    const l0 = out.layersByView['view-0'];
    const l1 = out.layersByView['view-1'];
    expect(l0[0]).toMatchObject({ type: 'image', src: 'artwork:0' });
    expect(l1[0]).toMatchObject({ src: 'artwork:1' });
    expect(l1[1]).toMatchObject({ src: 'artwork:0' });
    expect(l0[1]).toMatchObject({ type: 'text', text: 'Hi' });
  });
  it('does not mutate the input', () => {
    extractArtwork(design);
    expect(design.layersByView['view-0'][0]).toMatchObject({ src: A });
  });
  it('handles designs with no artwork', () => {
    const r = extractArtwork({ parentProductId: 'p', size: 'M', layersByView: {} });
    expect(r.sources).toEqual([]);
  });
});

describe('mime helpers and file paths', () => {
  it('reads mime types and picks extensions', () => {
    expect(dataUrlMime('data:image/png;base64,AA')).toBe('image/png');
    expect(dataUrlMime('nonsense')).toBe('image/png');
    expect(extForMime('image/jpeg')).toBe('jpg');
    expect(extForMime('image/webp')).toBe('webp');
    expect(extForMime('image/png')).toBe('png');
  });
  it('builds storage paths under the quote folder', () => {
    const files = buildQuoteFiles('CQ-ABCD2345', [{ id: 'view-0', label: 'Front' }, { id: 'view-1', label: 'Back' }], ['image/png', 'image/jpeg']);
    expect(files.previews).toEqual([
      { viewId: 'view-0', label: 'Front', path: 'quotes/CQ-ABCD2345/preview-view-0.png' },
      { viewId: 'view-1', label: 'Back', path: 'quotes/CQ-ABCD2345/preview-view-1.png' },
    ]);
    expect(files.artwork).toEqual([
      { name: 'artwork-1.png', path: 'quotes/CQ-ABCD2345/artwork-1.png' },
      { name: 'artwork-2.jpg', path: 'quotes/CQ-ABCD2345/artwork-2.jpg' },
    ]);
  });
});
```

- [ ] **Step 2: Run to see it fail.** `npx vitest run src/features/customTee/domain/quote.test.ts` — FAIL (module missing).

- [ ] **Step 3: Implement `quote.ts`**

```ts
import type { StudioDesign } from './design';
import type { Layer } from './layers';

export const QUOTE_ID_PATTERN = /^CQ-[A-Z0-9]{8}$/;
const ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const cryptoRandom = (): number => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

export function generateQuoteId(rand: () => number = cryptoRandom): string {
  let id = 'CQ-';
  for (let i = 0; i < 8; i++) id += ID_ALPHABET[Math.floor(rand() * ID_ALPHABET.length)];
  return id;
}

export type QuoteContact = { name: string; phone: string; whatsapp: string };

// Keeps digits and one leading "+".
function normalizeNumber(raw: string): string {
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\\D/g, '');
  return trimmed.startsWith('+') ? `+${digits}` : digits;
}
const digitCount = (n: string) => n.replace(/\\D/g, '').length;

export function validateQuoteContact(
  c: QuoteContact,
): { ok: true; value: QuoteContact } | { ok: false; errors: Partial<Record<keyof QuoteContact, string>> } {
  const errors: Partial<Record<keyof QuoteContact, string>> = {};
  const name = c.name.trim();
  const phone = normalizeNumber(c.phone);
  const whatsapp = normalizeNumber(c.whatsapp);
  if (name.length < 2 || name.length > 100) errors.name = 'Please enter your name.';
  if (digitCount(phone) < 8 || digitCount(phone) > 15) errors.phone = 'Please enter a valid phone number.';
  if (digitCount(whatsapp) < 8 || digitCount(whatsapp) > 15) errors.whatsapp = 'Please enter a valid WhatsApp number.';
  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, value: { name, phone, whatsapp } };
}

// Replaces each image layer's data URL with `artwork:<n>` (identical images share an index) so the design JSON stays small.
export function extractArtwork(design: StudioDesign): { design: StudioDesign; sources: string[] } {
  const sources: string[] = [];
  const indexOf = (src: string) => {
    const existing = sources.indexOf(src);
    if (existing >= 0) return existing;
    sources.push(src);
    return sources.length - 1;
  };
  const layersByView: Record<string, Layer[]> = {};
  for (const [viewId, layers] of Object.entries(design.layersByView)) {
    layersByView[viewId] = layers.map((l) => (l.type === 'image' ? { ...l, src: `artwork:${indexOf(l.src)}` } : l));
  }
  return { design: { ...design, layersByView }, sources };
}

export function dataUrlMime(dataUrl: string): string {
  return /^data:(image\\/[a-z0-9.+-]+)[;,]/i.exec(dataUrl)?.[1]?.toLowerCase() ?? 'image/png';
}

export function extForMime(mime: string): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

export function buildQuoteFiles(
  quoteId: string,
  views: { id: string; label: string }[],
  artworkMimes: string[],
): { previews: { viewId: string; label: string; path: string }[]; artwork: { name: string; path: string }[] } {
  return {
    previews: views.map((v) => ({ viewId: v.id, label: v.label, path: `quotes/${quoteId}/preview-${v.id}.png` })),
    artwork: artworkMimes.map((mime, i) => {
      const name = `artwork-${i + 1}.${extForMime(mime)}`;
      return { name, path: `quotes/${quoteId}/${name}` };
    }),
  };
}
```
(In the file, write regex escapes as single backslashes, e.g. `/\D/g` and `/^data:(image\/[a-z0-9.+-]+)[;,]/i`; the doubled backslashes above are only for this document.)

- [ ] **Step 4: Run tests.** `npx vitest run src/features/customTee/domain/quote.test.ts` — PASS.

- [ ] **Step 5: `artworkOriginals.ts`**

```ts
// Remembers the original uploaded File for each downscaled data URL while the studio tab is open,
// so a quote can upload the full-quality artwork when it is still available.
const originals = new Map<string, File>();

export function registerOriginal(dataUrl: string, file: File): void {
  originals.set(dataUrl, file);
}

export function getOriginal(dataUrl: string): File | undefined {
  return originals.get(dataUrl);
}
```
Modify `imageUpload.ts` `fileToDataUrl`: after computing `src`, call `registerOriginal(src, file)` before returning (import from `./artworkOriginals`). Also search the mobile studio for any other place that creates data URLs from uploaded files (`grep -rn "readAsDataURL\|fileToDataUrl" src/features/customTee`) and register originals there too.

- [ ] **Step 6: `renderPreview.ts`** — draws the tee image and all visible layers into a PNG. Requirements: `await ensureFontsLoaded()` then `await document.fonts.ready` and, for each text layer, `document.fonts.load(fontShorthand)` (ignore failures); load the base image with `crossOrigin = 'anonymous'` (reject with a clear error if it fails); canvas width = `width` (default 1200), height from the base image aspect; for each visible layer in stack order apply the same geometry as the studio canvas: translate to `(x*W, y*H)`, rotate by `rotation` degrees, scale by `(flipX ? -1 : 1, flipY ? -1 : 1)`; image layers are drawn centered with width `scale*W` and height `width/aspect` (load the image from its data URL); text layers use font `${italic ? 'italic ' : ''}${bold ? '700' : '400'} ${scale*TEXT_FONT_FRACTION*W}px ${fontFamily}`, `fillStyle = color`, `textBaseline = 'middle'`, line height 1.15 x font size, multi-line (`\n`), alignment from `align` (`left`/`center`/`right` relative to the block's width, with the block centered on the layer position), and letter spacing via `ctx.letterSpacing = `${letterSpacing}em`` when supported (feature-detect `'letterSpacing' in ctx`; otherwise skip). Return `canvas.toBlob(..., 'image/png')` as a Promise<Blob> (reject if null). Keep functions small and typed; no unit test (browser-only).

- [ ] **Step 7: `customQuoteRepository.ts`**

```ts
import { supabase } from '@/shared/infrastructure/supabase/client';
import type { StudioDesign } from '../domain/design';
import type { QuoteContact } from '../domain/quote';

export type QuoteFiles = {
  previews: { viewId: string; label: string; path: string }[];
  artwork: { name: string; path: string }[];
};

export async function uploadQuoteFile(bucket: 'custom-previews' | 'custom-artwork', path: string, blob: Blob): Promise<void> {
  const { error } = await supabase.storage.from(bucket).upload(path, blob, { contentType: blob.type || 'image/png', upsert: false });
  if (error) throw new Error(error.message);
}

export async function submitQuote(input: {
  id: string;
  contact: QuoteContact;
  parentProductId: string;
  teeSize: string;
  colorName?: string;
  design: StudioDesign;
  files: QuoteFiles;
  website: string;
}): Promise<void> {
  const { error } = await supabase.rpc('submit_custom_quote', {
    p_id: input.id,
    p_name: input.contact.name,
    p_phone: input.contact.phone,
    p_whatsapp: input.contact.whatsapp,
    p_parent_product_id: input.parentProductId,
    p_tee_size: input.teeSize,
    p_color_name: input.colorName ?? null,
    p_design: input.design,
    p_files: input.files,
    p_website: input.website,
  });
  if (error) throw new Error(error.message);
}
```

- [ ] **Step 8: Typecheck and run all tests.** `npx tsc --noEmit && npx vitest run` — clean/pass.

- [ ] **Step 9: Commit**
```bash
git add src/features/customTee/domain/quote.ts src/features/customTee/domain/quote.test.ts src/features/customTee/application/artworkOriginals.ts src/features/customTee/application/renderPreview.ts src/features/customTee/application/imageUpload.ts src/features/customTee/infrastructure/customQuoteRepository.ts
git commit -m "feat(custom-quotes): quote payload/validation domain, preview renderer and submit repository"
```
(also stage any mobile file you changed in Step 5.)

---

### Task 3: Quote request modal and studio wiring

**Files:**
- Create: `src/features/customTee/presentation/QuoteRequestModal.tsx`
- Modify: `src/features/customTee/presentation/studio/StudioEditor.tsx`, `src/features/customTee/presentation/mobile/MobileStudioEditor.tsx`, `src/features/customTee/presentation/mobile/MobileHeader.tsx`

**Interfaces:**
- Consumes: Task 2 exports; existing `Modal` (`./Modal`, props `{ onClose, title, children }`), `StudioDesign`, `StudioView`, `pruneLayersByView`.
- Produces: `QuoteRequestModal({ parentProductId: string; parentName: string; size: string; colorName?: string; design: StudioDesign; views: StudioView[]; onClose(): void })` — default export.

- [ ] **Step 1: Write `QuoteRequestModal.tsx`.** Behavior:
  - Uses the existing `Modal` shell with title "Request a quote". Heading text: "Tell us how to reach you and we'll send you a price on WhatsApp."
  - Fields: Name, Phone, WhatsApp number, a checkbox "WhatsApp number is the same as my phone" (when checked, the WhatsApp field mirrors phone and is disabled), and a visually hidden honeypot input `name="website"` (`tabIndex={-1}`, `autoComplete="off"`, `aria-hidden`) kept in state and passed through as `website`.
  - On submit: `validateQuoteContact` (show per-field errors); then a staged async run with a status line ("Preparing your design…", "Uploading your artwork…", "Sending your request…"): (1) `const id = generateQuoteId()`; (2) `extractArtwork(design)`; (3) `const files = buildQuoteFiles(id, views.map(v => ({ id: v.id, label: v.label })), sources.map(dataUrlMime))`; (4) for each view that has layers OR is the first view, `renderViewPng({ baseImageUrl: view.image, layers: design.layersByView[view.id] ?? [] })` and upload to `custom-previews` at its path — views with no layers are still rendered (clean tee) only for the first view; build `files.previews` only from views actually rendered/uploaded; (5) upload each artwork source: `getOriginal(src)` if present (use the File's own mime/type for the upload — if its mime differs from the predicted one, update the extension/mime in `files.artwork` before uploading), else convert the data URL to a Blob (`await (await fetch(src)).blob()`), to `custom-artwork`; (6) `submitQuote({ id, contact, parentProductId, teeSize: size, colorName, design: extractedDesign, files, website })`.
  - Success view: check icon, "Request sent", "Your quote request <ID> is in. We'll contact you on WhatsApp soon.", a Close button. Error view keeps the form with an inline alert and a Try again path (no partial-success message). Disable inputs while sending. Prevent double submit.
  - Style: studio/popup style (8px radius, black buttons `text-[11px] font-bold uppercase tracking-widest`, labels `text-[10px] font-bold uppercase tracking-wider text-[#717171]`), inputs `rounded-lg border border-[#EEEEEE] ... focus:border-black`.

- [ ] **Step 2: Wire the desktop studio (`StudioEditor.tsx`).** Replace the disabled "Add to Cart" button with a **Request a quote** button (`aria-label="Request a quote"`) that opens `QuoteRequestModal`; it is disabled (with `title="Add something to your design first"`) when the pruned design has no layers in any view. Build the design object for the modal the same way `save` does (`parentProductId`, `size`, `colorName`, `layersByView: pruneLayersByView(studio.layersByView, views.map(v => v.id))`). Remove the "Add to Cart and pricing are coming soon." line. Keep Save Design. The pinned action area layout must still fit the fit-to-screen editor (no new scrolling): the two buttons stay in one grid row, with the text "Request a quote" (fit it on one line at 360px width by using `text-[10px]`/shorter padding if needed).

- [ ] **Step 3: Wire the mobile studio.** In `MobileHeader.tsx` add an `onRequestQuote` prop and a compact **Quote** button next to Save (same style family as the existing header buttons); in `MobileStudioEditor.tsx` hold the `quoteOpen` state, build the same design object as its `save` does, and render `QuoteRequestModal` (the modal uses the shared `Modal`, which is a bottom sheet on phones). Disable the Quote button when the design is empty.

- [ ] **Step 4: Typecheck and run all tests.** `npx tsc --noEmit && npx vitest run`.

- [ ] **Step 5: Browser check (no database writes):** open the studio, add a text layer, click Request a quote; confirm validation errors for empty fields, the "same as phone" checkbox, that the button is disabled with no layers, and — by stubbing `window.fetch`/`supabase` is NOT required — only verify the form UI and that submitting with valid data reaches the "Preparing your design…" stage and then shows an error alert (the migration is not applied, so the RPC/upload fails). Do not try to bypass the error.

- [ ] **Step 6: Commit**
```bash
git add src/features/customTee/presentation/QuoteRequestModal.tsx src/features/customTee/presentation/studio/StudioEditor.tsx src/features/customTee/presentation/mobile/MobileStudioEditor.tsx src/features/customTee/presentation/mobile/MobileHeader.tsx
git commit -m "feat(custom-quotes): quote request form wired into desktop and mobile studios"
```

---

### Task 4: Admin domain, repository and ZIP builder

**Files:**
- Create: `src/features/admin/customQuotes/domain/customQuote.ts`, `.../domain/customQuote.test.ts`
- Create: `src/features/admin/customQuotes/infrastructure/customQuotesAdminRepository.ts`
- Create: `src/features/admin/customQuotes/application/buildQuoteZip.ts`
- Modify: `package.json` / lockfile (`npm install fflate`)

**Interfaces:**
- Produces from `customQuote.ts`:
  - Types `QuoteStatus`, `QuoteLine = { size: string; qty: number }`, `QuoteFilesRef = { previews: { viewId: string; label: string; path: string }[]; artwork: { name: string; path: string }[] }`, `CustomQuote = { id; name; phone; whatsapp; parentProductId; parentName; teeSize; colorName?: string; design: Record<string, any>; files: QuoteFilesRef; status: QuoteStatus; adminNote: string; lines: QuoteLine[]; unitPrice?: number; quoteToken?: string; quoteExpiresAt?: string; orderId?: string; createdAt: string; updatedAt: string }`.
  - `STATUS_LABELS: Record<QuoteStatus, string>`, `effectiveStatus(q, now?: Date): QuoteStatus`, `quoteTotals(lines, unitPrice): { pieces: number; subtotal: number }`, `validateQuotePricing(lines, unitPrice, validSizes): string | null`, `buildQuoteLink(origin, token): string`, `whatsappUrl(number, text): string`, `quoteMessage(q, link, expiresAt): string`, `buildZipPlan(q: CustomQuote): ZipEntry[]` where `ZipEntry = { zipPath: string; source: { kind: 'public'; bucket: 'custom-previews'; path: string } | { kind: 'private'; bucket: 'custom-artwork'; path: string } | { kind: 'text'; content: string } }`, `quoteReadme(q): string`.
  - Repository: `listQuotes(): Promise<CustomQuote[]>`, `getQuote(id): Promise<CustomQuote | null>`, `updateQuote(id, patch: { status?: QuoteStatus; adminNote?: string }): Promise<void>`, `setQuotePricing(id, lines, unitPrice, expiresAt: Date, regenerate: boolean): Promise<string>` (returns the token via `set_custom_quote_pricing`), `previewUrl(path): string` (public URL from `custom-previews`), `downloadQuoteFile(bucket, path): Promise<Blob>`, `validSizesForParent(parentProductId): Promise<string[]>` (reads `parent_products.size_order`).
  - `buildQuoteZip.ts`: `downloadQuoteZip(q: CustomQuote): Promise<void>` — builds the ZIP from `buildZipPlan` (public entries via `fetch(previewUrl)`, private via `downloadQuoteFile`, text via encoder) with `fflate` (`zipSync`/`strToU8`), and triggers a browser download named `custom-tee-<quote id>.zip`.

- [ ] **Step 1: Write the failing test** `customQuote.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  buildQuoteLink,
  buildZipPlan,
  effectiveStatus,
  quoteMessage,
  quoteReadme,
  quoteTotals,
  validateQuotePricing,
  whatsappUrl,
  type CustomQuote,
} from './customQuote';

const quote: CustomQuote = {
  id: 'CQ-ABCD2345',
  name: 'Rahim Uddin',
  phone: '01711223344',
  whatsapp: '+8801711223344',
  parentProductId: 'p1',
  parentName: 'Forest Green Tshirt',
  teeSize: 'M',
  colorName: 'Green',
  design: { layersByView: { 'view-0': [{ type: 'image', src: 'artwork:0' }, { type: 'image', src: 'artwork:1' }] } },
  files: {
    previews: [{ viewId: 'view-0', label: 'Front', path: 'quotes/CQ-ABCD2345/preview-view-0.png' }],
    artwork: [
      { name: 'artwork-1.png', path: 'quotes/CQ-ABCD2345/artwork-1.png' },
      { name: 'artwork-2.jpg', path: 'quotes/CQ-ABCD2345/artwork-2.jpg' },
    ],
  },
  status: 'quoted',
  adminNote: '',
  lines: [{ size: 'M', qty: 3 }, { size: 'L', qty: 2 }],
  unitPrice: 650,
  quoteToken: 'tok',
  quoteExpiresAt: '2026-11-05T00:00:00.000Z',
  createdAt: '2026-10-29T00:00:00.000Z',
  updatedAt: '2026-10-29T00:00:00.000Z',
};

describe('effectiveStatus', () => {
  it('turns an expired quoted quote into expired', () => {
    expect(effectiveStatus(quote, new Date('2026-11-04T00:00:00Z'))).toBe('quoted');
    expect(effectiveStatus(quote, new Date('2026-11-06T00:00:00Z'))).toBe('expired');
    expect(effectiveStatus({ ...quote, status: 'ordered' }, new Date('2030-01-01'))).toBe('ordered');
  });
});

describe('pricing', () => {
  it('computes pieces and subtotal', () => {
    expect(quoteTotals(quote.lines, 650)).toEqual({ pieces: 5, subtotal: 3250 });
    expect(quoteTotals([], 650)).toEqual({ pieces: 0, subtotal: 0 });
  });
  it('validates lines and price', () => {
    const sizes = ['M', 'L', 'XL'];
    expect(validateQuotePricing([{ size: 'M', qty: 2 }], 500, sizes)).toBeNull();
    expect(validateQuotePricing([], 500, sizes)).toMatch(/size/i);
    expect(validateQuotePricing([{ size: 'M', qty: 0 }], 500, sizes)).toMatch(/quantity/i);
    expect(validateQuotePricing([{ size: 'S', qty: 1 }], 500, sizes)).toMatch(/size/i);
    expect(validateQuotePricing([{ size: 'M', qty: 1 }, { size: 'M', qty: 2 }], 500, sizes)).toMatch(/once|duplicate/i);
    expect(validateQuotePricing([{ size: 'M', qty: 1 }], 0, sizes)).toMatch(/price/i);
  });
});

describe('links and messages', () => {
  it('builds the checkout link', () => {
    expect(buildQuoteLink('https://twoa-brand.web.app', 'a b')).toBe('https://twoa-brand.web.app/custom-order?token=a%20b');
  });
  it('builds WhatsApp URLs, adding the Bangladesh country code to local numbers', () => {
    expect(whatsappUrl('01711223344', 'Hi there')).toBe('https://wa.me/8801711223344?text=Hi%20there');
    expect(whatsappUrl('+880 1711-223344', 'x')).toBe('https://wa.me/8801711223344?text=x');
    expect(whatsappUrl('8801711223344', 'x')).toBe('https://wa.me/8801711223344?text=x');
  });
  it('writes a customer message with the link and totals', () => {
    const msg = quoteMessage(quote, 'https://x/custom-order?token=tok', new Date('2026-11-05T00:00:00Z'));
    expect(msg).toContain('Rahim Uddin');
    expect(msg).toContain('https://x/custom-order?token=tok');
    expect(msg).toContain('5');
    expect(msg).toContain('650');
  });
});

describe('zip plan', () => {
  it('lists previews, private artwork, design.json and a README', () => {
    const plan = buildZipPlan(quote);
    const paths = plan.map((e) => e.zipPath);
    expect(paths).toEqual(['previews/Front.png', 'artwork/artwork-1.png', 'artwork/artwork-2.jpg', 'design.json', 'README.txt']);
    expect(plan[0].source).toEqual({ kind: 'public', bucket: 'custom-previews', path: 'quotes/CQ-ABCD2345/preview-view-0.png' });
    expect(plan[1].source).toEqual({ kind: 'private', bucket: 'custom-artwork', path: 'quotes/CQ-ABCD2345/artwork-1.png' });
  });
  it('maps artwork references to zip file names in design.json', () => {
    const design = buildZipPlan(quote).find((e) => e.zipPath === 'design.json')!;
    expect(design.source.kind).toBe('text');
    const parsed = JSON.parse((design.source as { kind: 'text'; content: string }).content);
    expect(parsed.artworkFiles).toEqual({ 'artwork:0': 'artwork/artwork-1.png', 'artwork:1': 'artwork/artwork-2.jpg' });
    expect(parsed.design.layersByView['view-0']).toHaveLength(2);
  });
  it('writes a README with customer and tee details', () => {
    const readme = quoteReadme(quote);
    for (const needle of ['CQ-ABCD2345', 'Rahim Uddin', '01711223344', '+8801711223344', 'Forest Green Tshirt', 'M x 3', 'L x 2', '650']) {
      expect(readme).toContain(needle);
    }
  });
  it('sanitizes preview file names', () => {
    const q = { ...quote, files: { ...quote.files, previews: [{ viewId: 'view-0', label: 'Left / Sleeve?', path: 'quotes/CQ-ABCD2345/preview-view-0.png' }] } };
    expect(buildZipPlan(q)[0].zipPath).toBe('previews/Left-Sleeve.png');
  });
});
```

- [ ] **Step 2: Run to see it fail.** `npx vitest run src/features/admin/customQuotes` — FAIL.

- [ ] **Step 3: Implement `customQuote.ts`** satisfying the tests and the interfaces above. Rules: `effectiveStatus` returns `'expired'` only when `status === 'quoted'` and `quoteExpiresAt` is in the past; `quoteTotals` sums `qty` and `qty * unitPrice`; `validateQuotePricing` messages: no lines → "Add at least one size with a quantity."; qty not an integer in 1..1000 → "Each quantity must be a whole number from 1 to 1000."; unknown size → `Unknown size "<size>".`; duplicate size → "Each size can only be listed once."; price not a finite number > 0 → "Enter a valid price per piece."; `buildQuoteLink` uses `encodeURIComponent(token)`; `whatsappUrl`: digits only; if the number (after stripping a leading `+` and non-digits) starts with `0` and has 11 digits, replace the leading `0` with `880`; use `encodeURIComponent` for the text; `quoteMessage` is a short friendly English message including the customer's name, the tee name, a summary like `5 pieces (M x 3, L x 2) at 650 each = 3250`, the link, and the expiry date (`toLocaleDateString('en-GB')`); `buildZipPlan` order: previews (public bucket, `previews/<sanitized label>.png`, sanitize = replace runs of non-alphanumeric chars with `-`, trim `-`; make names unique by suffixing `-2`, `-3`... if repeated), artwork (private, `artwork/<name>`), `design.json` (text: `JSON.stringify({ quoteId, parentProductId, teeSize, colorName, design: q.design, artworkFiles: { 'artwork:<i>': 'artwork/<name>' } }, null, 2)`), `README.txt` (text from `quoteReadme`). `quoteReadme` lists quote id, created date, customer name/phone/WhatsApp, tee name, selected size and color, the lines `M x 3`, unit price and subtotal when priced, the admin note, and a short "how to use these files" paragraph (previews = mock-ups, artwork = original images, design.json = exact placement per view).

- [ ] **Step 4: Run tests** until PASS: `npx vitest run src/features/admin/customQuotes`.

- [ ] **Step 5: Install the ZIP library:** `npm install fflate` (commit the lockfile change).

- [ ] **Step 6: Implement the repository** with the signatures above. Map rows: `row.parent_product_id → parentProductId`, `row.parent_name`, `row.tee_size`, `row.color_name`, `row.design`, `row.files` (default `{ previews: [], artwork: [] }`), `row.admin_note`, `row.lines` (array or `[]`), `row.unit_price` (Number or undefined), `row.quote_token`, `row.quote_expires_at`, `row.order_id`, `row.created_at`, `row.updated_at`. `listQuotes` orders by `created_at desc`. `updateQuote` sets `updated_at`. `setQuotePricing` calls `supabase.rpc('set_custom_quote_pricing', { p_id, p_lines, p_unit_price, p_expires_at: expiresAt.toISOString(), p_regenerate })` and returns the token string. `previewUrl` uses `supabase.storage.from('custom-previews').getPublicUrl(path).data.publicUrl`. `downloadQuoteFile` uses `supabase.storage.from(bucket).download(path)`. `validSizesForParent` reads `size_order` from `parent_products`.

- [ ] **Step 7: Implement `buildQuoteZip.ts`** as described (use `fflate`'s `zipSync` with `{ [path]: Uint8Array }`, level 0 for images). Handle fetch/download errors by throwing a clear Error naming the failing file.

- [ ] **Step 8: Typecheck and run all tests.** `npx tsc --noEmit && npx vitest run`.

- [ ] **Step 9: Commit**
```bash
git add src/features/admin/customQuotes package.json package-lock.json
git commit -m "feat(custom-quotes): admin quote domain, repository and ZIP builder"
```

---

### Task 5: Admin Custom Quotes page

**Files:**
- Create: `src/features/admin/customQuotes/presentation/CustomQuotesPage.tsx`, `src/app/admin/custom-quotes/page.tsx`
- Modify: `src/features/admin/presentation/adminNav.ts` (and `adminNav.test.ts` if it asserts the full nav list)

**Interfaces:**
- Consumes: Task 4 domain/repository/zip; the admin UI kit in `src/features/admin/presentation/ui/` and `AdminPageHeader`/`AdminCard` (read `OrderReturnsPage.tsx` and `src/app/admin/returns/page.tsx` first and mirror their structure, loading/error handling and styling).
- Produces: route `/admin/custom-quotes`; nav item "Custom Quotes" (icon `Shirt` from lucide-react) under the "Orders" section after "Order Returns".

- [ ] **Step 1: Nav + route.** Add the nav item and `page.tsx` rendering `<CustomQuotesPage />` (`'use client'`, same as the returns page). Update `adminNav.test.ts` only if needed.

- [ ] **Step 2: `CustomQuotesPage.tsx`** — list + detail in one page (static export: no dynamic route; the selected quote id lives in the `?id=` query param via `useSearchParams` inside a `<Suspense>`; clicking a row sets it with `router.replace`, closing clears it):
  - **List:** loads `listQuotes()`; status filter chips (All, New, Contacted, Quoted, Ordered, Declined, Expired using `effectiveStatus`) with counts; search box (id, name, phone, WhatsApp, tee); table columns: Quote (id + date), Customer (name + phone), Tee (name, size, thumbnail of the first preview via `previewUrl`), Status badge, Total (`quoteTotals`) when priced. Empty/loading/error states like the returns page.
  - **Detail panel** (right side on wide screens, full width below the list on narrow): header with id and status badge; contact block with **Call** (`tel:`) and **WhatsApp** (`whatsappUrl(q.whatsapp, 'Hi <name>, ...')`) buttons and the raw numbers; the design previews as a gallery (each with its view label); tee info (name, size, color); a **Notes** textarea with Save (`updateQuote`); a **Status** select limited to `new`, `contacted`, `declined` (admin-settable; `quoted`/`ordered` are set by the system) — disabled when ordered; **Pricing** editor (hidden when `ordered`): rows of `size` (select from `validSizesForParent`) + `qty`, add/remove row, a `Price per piece` input, a live total (`quoteTotals`), `Expires` days input (default 7; show the resulting date), validation via `validateQuotePricing`, and a **Generate link** button calling `setQuotePricing(...)` then showing the checkout link (`buildQuoteLink(window.location.origin, token)`) with **Copy link** and **Send on WhatsApp** (`whatsappUrl(q.whatsapp, quoteMessage(...))`, `target="_blank"`), plus a **New link** button (`regenerate = true`) that invalidates the old link; when the quote is already `quoted`, show the existing link (from `quoteToken`) and expiry; when `ordered`, show a link to the order (`/admin/orders` with the order id in the text) instead of the editor; **Download ZIP** button (`downloadQuoteZip`, with busy/error states).
  - After every successful action, reload the quote and list data.
  - Follow admin styling (sharp corners, existing kit components for badges/buttons/inputs where they exist).

- [ ] **Step 3: Typecheck and run all tests.** `npx tsc --noEmit && npx vitest run`.

- [ ] **Step 4: Browser check.** Admin pages need an admin Google sign-in, so you cannot view the real page. Add a TEMPORARY, uncommitted harness route (e.g. `src/app/tmpquotes/page.tsx`, NOT starting with an underscore) that renders the page's presentational parts with a hard-coded sample `CustomQuote` or mocks the repository module, load it in the browser, verify layout, the pricing editor, link/WhatsApp buttons and ZIP button rendering, then DELETE the harness (and clear any `.next` cache for it) before committing. If mocking the whole page is impractical, split the presentational pieces into small components you can render directly with sample props.

- [ ] **Step 5: Commit**
```bash
git add src/features/admin/customQuotes/presentation src/app/admin/custom-quotes src/features/admin/presentation/adminNav.ts src/features/admin/presentation/adminNav.test.ts
git commit -m "feat(custom-quotes): admin Custom Quotes page with pricing, checkout link and ZIP download"
```

---

### Task 6: Custom checkout page and order item mapping

**Files:**
- Create: `src/features/customTee/domain/customOrder.ts`, `src/features/customTee/domain/customOrder.test.ts`
- Create: `src/features/customTee/infrastructure/customOrderRepository.ts`
- Create: `src/features/customTee/presentation/CustomOrderPage.tsx`, `src/app/custom-order/page.tsx`
- Modify: `src/shared/domain/types.ts` (`OrderItem`), `src/features/orders/infrastructure/firestoreOrdersRepository.ts` (`toOrderItem`)

**Interfaces:**
- Produces:
  - `customOrder.ts`: `QuoteCheckout = { id: string; name: string; phone: string; parentProductId: string; parentName: string; teeSize: string; colorName?: string; lines: { size: string; qty: number }[]; unitPrice: number; previews: { viewId: string; label: string; path: string }[]; expiresAt: string }`, `parseQuoteCheckout(raw: unknown): QuoteCheckout | null` (tolerant of null/garbage), `customOrderSubtotal(q): number`, `describeLines(lines): string` (`'M x 3, L x 2'`).
  - Repository: `fetchQuoteForCheckout(token: string): Promise<QuoteCheckout | null>` (RPC `get_quote_for_checkout`), `placeCustomOrder(input: { token: string; orderId: string; userId: string; userEmail: string; name: string; phone: string; address: string; deliveryFee: number }): Promise<string>` (RPC `place_custom_order`), `previewPublicUrl(path): string`.
  - `OrderItem` gains `customQuoteId?: string; customPreviewPath?: string`; `toOrderItem` maps `item.customQuoteId` / `item.customPreviewPath`, and when `customPreviewPath` is set and `image_url` is empty it sets `image` to the public preview URL (`supabase.storage.from('custom-previews').getPublicUrl(path).data.publicUrl`).

- [ ] **Step 1: Failing test** `customOrder.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { customOrderSubtotal, describeLines, parseQuoteCheckout } from './customOrder';

const raw = {
  id: 'CQ-ABCD2345',
  name: 'Rahim',
  phone: '01711223344',
  parentProductId: 'p1',
  parentName: 'Forest Green Tshirt',
  teeSize: 'M',
  colorName: 'Green',
  lines: [{ size: 'M', qty: 3 }, { size: 'L', qty: 2 }],
  unitPrice: 650,
  previews: [{ viewId: 'view-0', label: 'Front', path: 'quotes/CQ-ABCD2345/preview-view-0.png' }],
  expiresAt: '2026-11-05T00:00:00Z',
};

describe('parseQuoteCheckout', () => {
  it('reads a valid payload', () => {
    const q = parseQuoteCheckout(raw)!;
    expect(q.id).toBe('CQ-ABCD2345');
    expect(q.unitPrice).toBe(650);
    expect(q.lines).toHaveLength(2);
    expect(q.colorName).toBe('Green');
  });
  it('returns null for null, junk, or unpriced payloads', () => {
    expect(parseQuoteCheckout(null)).toBeNull();
    expect(parseQuoteCheckout('x')).toBeNull();
    expect(parseQuoteCheckout({ ...raw, unitPrice: null })).toBeNull();
    expect(parseQuoteCheckout({ ...raw, lines: [] })).toBeNull();
  });
  it('drops malformed lines and previews', () => {
    const q = parseQuoteCheckout({ ...raw, lines: [{ size: 'M', qty: 2 }, { size: 5 }, null], previews: [null, { path: 1 }] })!;
    expect(q.lines).toEqual([{ size: 'M', qty: 2 }]);
    expect(q.previews).toEqual([]);
  });
});

describe('totals', () => {
  it('computes the subtotal and describes lines', () => {
    const q = parseQuoteCheckout(raw)!;
    expect(customOrderSubtotal(q)).toBe(3250);
    expect(describeLines(q.lines)).toBe('M x 3, L x 2');
  });
});
```

- [ ] **Step 2: Implement `customOrder.ts`** (typed manual parsing, numbers via `Number()` with finite checks, lines require string `size` and integer `qty >= 1`, previews require string `viewId`/`label`/`path`; `unitPrice` must be a finite number > 0). Run the tests until PASS.

- [ ] **Step 3: Repository + types + order mapping** as per the interfaces. In `placeCustomOrder` map to the RPC params `p_token, p_order_id, p_user_id, p_user_email, p_name, p_phone, p_address, p_delivery_fee` and return the id.

- [ ] **Step 4: `CustomOrderPage.tsx`** (`'use client'`; the route page wraps it in `<Suspense>` and the usual storefront shell: `Navbar`, `main`, like `src/app/checkout/page.tsx`). Behavior: read `token` from `useSearchParams`; states: loading; **invalid/expired/used** ("This quote link is no longer valid. Please contact us on WhatsApp." — do not reveal which); ready. Ready view mirrors the existing checkout look (read `CheckoutForm.tsx` and reuse `DeliveryInfoCard`, `DeliveryZoneCard`, `PaymentCard` and the `computeDeliveryFeeByZone`/`computeTotal`/`generateOrderId` helpers and the same required-field validation and address formatting): a summary card with the preview image(s), tee name, size/colour, `describeLines`, price per piece, subtotal, delivery fee, grand total; the delivery form with the name and phone prefilled from the quote; a Place order button (disabled while placing; show server errors verbatim, e.g. stock messages); no coupon field. On success: `addGuestOrderId(orderId)` when the user is not signed in (like `CheckoutForm`), `pixelPurchase` like checkout, and `router.push('/orders')`. Use the signed-in user (`useAuth`) when present for `userId`/`userEmail`, else `'guest'`/`''`.

- [ ] **Step 5: Route** `src/app/custom-order/page.tsx` (client page with Suspense fallback text).

- [ ] **Step 6: Typecheck and run all tests.** `npx tsc --noEmit && npx vitest run`.

- [ ] **Step 7: Browser check.** Without the migration the RPC fails, so verify: `/custom-order` with no token and with a bogus token shows the "no longer valid" state without console errors; then temporarily stub `window.fetch` for the `get_quote_for_checkout` RPC response in the browser to render the ready state (sample payload) and check the layout and validation messages (do not place an order). Report what you saw.

- [ ] **Step 8: Commit**
```bash
git add src/features/customTee/domain/customOrder.ts src/features/customTee/domain/customOrder.test.ts src/features/customTee/infrastructure/customOrderRepository.ts src/features/customTee/presentation/CustomOrderPage.tsx src/app/custom-order src/shared/domain/types.ts src/features/orders/infrastructure/firestoreOrdersRepository.ts
git commit -m "feat(custom-quotes): custom checkout page and custom item mapping on orders"
```

---

### Task 7: Admin order integration

**Files:**
- Modify: `src/features/admin/orders/presentation/OrderItemsPanel.tsx`, `src/features/admin/orders/presentation/EditOrderPage.tsx` (read both first; also check `AdminOrderCard.tsx` for where item thumbnails are listed).

**Interfaces:**
- Consumes: `OrderItem.customQuoteId`, `getQuote` and `downloadQuoteZip` from Task 4.
- Produces: custom lines are recognizable and downloadable in the admin orders UI.

- [ ] **Step 1: `OrderItemsPanel.tsx`** — for items with `customQuoteId`: show a "Custom design" badge next to the name (same tag style as size), the preview image (the item's `image` is already the public preview URL after Task 6), a link "Quote <id>" to `/admin/custom-quotes?id=<id>`, and a **Download design ZIP** button which loads the quote with `getQuote(customQuoteId)` and calls `downloadQuoteZip` (busy and error states; if the quote can't be loaded show "Quote not found"). If an order has several custom lines from the same quote show one button (de-duplicate by `customQuoteId`).
- [ ] **Step 2: `EditOrderPage.tsx`** — if any item has `customQuoteId`, the items editor is read-only: hide add/remove/quantity controls for ALL items of that order and show a short note "This order contains a custom tee quote. Items can't be edited here; contact the customer or create a new order."; customer details (name/phone/address) and notes stay editable. Do not change `admin_update_order`.
- [ ] **Step 3: Typecheck and run all tests.** `npx tsc --noEmit && npx vitest run`.
- [ ] **Step 4: Browser check** via a temporary uncommitted harness rendering `OrderItemsPanel` with a sample order item having `customQuoteId` (admin pages need Google sign-in); verify badge, link and button render; delete the harness.
- [ ] **Step 5: Commit**
```bash
git add src/features/admin/orders/presentation
git commit -m "feat(custom-quotes): show custom designs on admin orders with ZIP download; lock item editing"
```

---

### Task 8: Verification and rollout (controller, with the owner)

- [ ] **Step 1:** Dry-run the migration against the live database inside a transaction that is rolled back (SQL syntax and constraint check), using the Supabase tools.
- [ ] **Step 2:** Whole-branch code review of Tasks 1-7; fix findings.
- [ ] **Step 3:** Ask the owner for the go-ahead; take the backup (`create table backup_..._<date> as select ...` for tables the migration touches: it adds new objects only, so back up `orders` and `parent_product_size_stock` which the new RPCs write to), apply the migration, verify objects exist, run the Supabase advisors.
- [ ] **Step 3b:** End-to-end test on the live project with a clearly marked test quote: submit from the studio, price it as admin (requires an admin session — the owner performs or watches this step), open the link, place a test COD order, download the ZIP; then clean up the test rows/files.
- [ ] **Step 4:** Update `docs/superpowers/custom-tee-progress.md` and the local memory note.
