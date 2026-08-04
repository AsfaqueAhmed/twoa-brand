# Supabase migration — remaining follow-up

Code and data migration are complete on this branch (`feat/supabase-migration`). Nothing has been merged or deployed. Before/around shipping this, the following still needs doing.

## 1. Rotate two exposed secrets (do this first)

While wiring up the Google OAuth provider, a shell mistake caused both of these to get printed into the assistant conversation transcript. Treat them as compromised:

- **Google OAuth client secret** — Google Cloud Console → APIs & Services → Credentials → the OAuth client used for Sign in with Google → add a new secret, delete the old one. Then update it in Supabase: put the new value in `.env.migration` as `GOOGLE_OAUTH_CLIENT_SECRET` and run `supabase config push` (project `kixvsiyrrmbwyqpenqqe`) to re-sync.
- **Supabase `service_role` key** — Project Settings → API → regenerate/roll the legacy service key. Update `.env.migration`'s `SUPABASE_SERVICE_ROLE_KEY` afterward. Only used locally by the one-off migration script — nothing deployed depends on it.

## 2. Add GitHub Actions repository variables

`.github/workflows/daily-product-deploy.yml` now needs these (Settings → Secrets and variables → Actions → Variables — non-secret, same tier as the existing `NEXT_PUBLIC_META_PIXEL_ID`):

- `NEXT_PUBLIC_SUPABASE_URL` = `https://kixvsiyrrmbwyqpenqqe.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the publishable key (`supabase projects api-keys --project-ref kixvsiyrrmbwyqpenqqe`)

Without these the daily auto-deploy check and build will fail.

## 3. Before deploying this branch to production

The live site (`twoa-brand.web.app`) is still running the old Firebase-backed code until this branch actually ships. Anything ordered or changed there in the meantime won't be in Supabase automatically.

Right before cutover:

```bash
set -a; source .env.migration; set +a
node scripts/migrate-to-supabase.mjs
```

This is idempotent (upserts keyed on original IDs) — safe to re-run.

## 4. After cutover is confirmed clean

Once the re-sync above has run and the new code is live and verified:

- Remove the `firebase` npm dependency
- Delete `firebase-applet-config.json`
- Delete `scripts/migrate-to-supabase.mjs`
- Delete `.env.migration` locally

`firebase.json`/`.firebaserc` stay — they drive Firebase *Hosting*, which is unrelated to this migration.

## 5. Sanity-check before go-live

- Complete a real Google sign-in end-to-end (only verified up to Google's consent screen so far, no test credentials were available to finish the login)
- Confirm the admin email gate (`asfaqueahmedsakkar@gmail.com`) still resolves correctly through Supabase Auth
- Spot-check a couple of the 7 migrated orders and the coupon against what's expected
