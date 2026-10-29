# Custom Tee: quote request flow (phase D)

Replaces the "Add to Cart" idea for custom tees. Price is agreed with the customer by the admin, then the customer places a normal cash-on-delivery order from a one-time link.

## Flow

1. **Customer requests a quote.** In the studio (desktop and mobile) the disabled *Add to Cart* becomes **Request a quote** (disabled until the design has at least one layer). A form asks for name, phone and WhatsApp number (checkbox "WhatsApp is the same as phone"); a hidden honeypot field catches bots. On submit the browser renders one preview PNG per view, uploads the preview PNGs and the artwork files, and saves the request (status `new`). The customer sees a confirmation: "We'll contact you on WhatsApp."
2. **Admin contacts the customer** (tap-to-call and WhatsApp links) in a new **Custom Quotes** admin page, sets the quantities per size and a price per piece, an optional expiry (default 7 days) and clicks **Generate link**. The link is copied or opened in WhatsApp with a ready message. Status becomes `quoted`.
3. **Customer opens the link** `/custom-order?token=...` (query param, because the site is a static export). It shows the design preview, tee, sizes and quantities, price per piece, subtotal; the customer enters delivery details (same address/zone logic as normal checkout), sees the delivery fee and total, and places a COD order. The link works once and expires.
4. **Admin downloads the design** from the quote or from the resulting order: one ZIP with preview PNGs per view, the artwork files, a `design.json` (every layer: position, size, rotation, flips, text, font, color, group) and a `README.txt` (customer, tee, size, quantities, quote id).

## Data and security

- Table `custom_quotes` (admin-only via RLS; no public select/insert). Customers use RPCs:
  - `submit_custom_quote(...)` (anon): validates, rate-limits (5 per phone per hour), checks the tee and size exist, requires file paths under `quotes/<quoteId>/`, honeypot returns success silently.
  - `get_quote_for_checkout(token)` (anon): returns the quote only while `status = 'quoted'` and not expired.
  - `place_custom_order(...)` (anon): re-validates the token, checks and decrements pooled parent stock per size, takes the price from the database (never from the browser), inserts the order (items carry `customQuoteId` and `customPreviewPath`), marks the quote `ordered`.
  - `set_custom_quote_pricing(...)` (admin, checks `is_admin()`): stores lines, unit price, expiry, generates the token (64 hex chars), sets `quoted`.
- Storage: bucket `custom-previews` (public read via URL, anon insert under `quotes/`, 5 MB, png/jpeg/webp) and `custom-artwork` (private, anon insert under `quotes/`, admin read/delete, 10 MB, png/jpeg/webp). No update/overwrite for anon.
- Delivery fee is supplied by the browser exactly like normal checkout (existing trust model), bounded 0..1000.
- Design JSON saved in the quote has image layers' pixel data replaced by storage paths.

## Customer client

- `domain/quote.ts` (pure, tested): quote id (`CQ-XXXXXXXX`), contact validation (name, phone, WhatsApp), payload builder that swaps image layer `src` for artwork paths and lists previews/artwork.
- `application/renderPreview.ts`: draws base tee image + layers to a canvas PNG (images, text with font/size/bold/italic/align/letter spacing, rotation, flips); waits for fonts; base image loaded with `crossOrigin='anonymous'`.
- `application/artworkOriginals.ts`: remembers the original uploaded `File` per data URL while the tab is open (registered inside `fileToDataUrl`); the quote uploads the original when available, otherwise the stored (<=1600px) version.
- `QuoteRequestModal` (shared by desktop and mobile studios) with progress states and error handling.

## Admin

- Nav: "Custom Quotes" under Orders; page `/admin/custom-quotes` (list with status filter/search; detail panel selected via `?id=`).
- Detail: contact links, previews (public URLs), note, status, pricing editor (size rows + unit price + expiry), generated link with Copy / WhatsApp, decline, Download ZIP (client-side with `fflate`; private artwork read through the admin session).
- Orders: custom order lines show a "Custom design" badge, the preview, and a Download ZIP button; the admin order edit screen blocks editing custom lines.

## Out of scope

Online payment, automatic WhatsApp/email messages, customer accounts or "my designs", editing a quote after submit, coupons on custom orders.

## Testing

Vitest for the pure domain modules (customer quote payload/validation, admin pricing/link/WhatsApp/ZIP manifest helpers). SQL is dry-run in a rolled-back transaction before it is applied. Browser checks: request form on desktop and mobile, admin flow, custom checkout, order download.
