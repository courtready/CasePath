# Stripe checkout diagnostic — repair report (CasePath)

**Date:** 2026-05-13  
**Scope:** Full project scan for Stripe/Supabase checkout paths, keys, price IDs, and failure modes.

---

## 1. Search summary

| Pattern | Result |
|--------|--------|
| `price_*` literals in repo | **None** hardcoded. Price IDs come only from Edge env vars (`STRIPE_PRICE_*`) via `billing.ts`. |
| `pk_test` / `pk_live` / `sk_test` / `sk_live` | **None** in application source. Checkout uses **server-side** `STRIPE_SECRET_KEY` in Edge only. No `loadStripe` / `redirectToCheckout` (no Stripe.js client checkout). |
| `create-checkout-session` / `stripe-webhook` | Present under `supabase/functions/`; `supabase/config.toml` sets `stripe-webhook.verify_jwt = false`, `create-checkout-session.verify_jwt = true`. |
| `purchase_type`, `metadata.plan`, `metadata.feature` | **Not used** in Edge checkout. Session `metadata` only includes `internal_sku` (see `create-checkout-session/index.ts`). |
| `STRIPE` / entitlement strings | Client: `openPricingCheckout` + `resolveStripePriceId` (reads optional `window.STRIPE_PRICE_*` for display/debug — **not** sent to Edge). Server: `billing.ts` SKU → env price ID. |

---

## 2. Architecture (actual checkout flow)

**Pricing button** → `onclick="openPricingCheckout('starter_monthly'|…)"` in `components/pricing.html` (and duplicates under `components\pricing.html`).

**Handler:** `assets/js/app.js` — `openPricingCheckout(plan)`  
- Aliases: `doconce` → `credits_1`, `casepack` → `parenting_pack`, `full`/`pro` → `pro_monthly`, etc.  
- **Requires** `window.SUPABASE_PROJECT_URL` + `window.supabaseClient`.  
- **Requires** JWT (`getSession().access_token`) unless `DEV_MODE` (token still needed for Edge 401).  
- **Blocks** checkout if email not verified (non-DEV).  
- **POST** `{ sku: planKey, return_path: location.pathname }` to  
  `{SUPABASE_PROJECT_URL}/functions/v1/create-checkout-session`  
  with `Authorization: Bearer <jwt>`, `apikey: <anon>`, `Content-Type: application/json`.

**Edge:** `supabase/functions/create-checkout-session/index.ts`  
- CORS: `resolveBrowserCors` from `_shared/cors.ts` — **strict**; wrong/missing allowlist → **403** `Forbidden origin`.  
- Auth: validates user via anon client + `Authorization`.  
- SKU: must be in `ALLOWED_CHECKOUT_SKUS` (`billing.ts`).  
- Price: `resolveSkuToPriceId` — env value must start with `price_`.  
- Stripe: `checkout.sessions.create` → returns `{ url }` → client sets `window.location.href = data.url`.

**Webhook:** `supabase/functions/stripe-webhook/index.ts` — `STRIPE_WEBHOOK_SECRET`, service role, `buildPriceEntitlementMap()`; unknown price ID → **500** after audit.

**Frontend keys:** `assets/js/supabase.js` — project URL + **anon** JWT (publishable in Supabase sense). No Stripe publishable key in repo (correct for server-created Checkout sessions).

---

## 3. Root causes — why “pricing buttons don’t redirect to Stripe”

### A. **CORS allowlist vs production origin (highest likelihood)**

`supabase/functions/_shared/cors.ts` only allows:

- Origins in `CASEPATH_ALLOWED_ORIGINS` (comma-separated **https** URLs), and  
- `https` origin parsed from `SITE_URL`, and  
- Optional localhost http if `CASEPATH_ALLOW_LOCALHOST=true`.

If the live site is `https://www.example.com` but `SITE_URL` is set to `https://example.com` (or vice versa), **only one** may be in the set → requests from the other host get **403 Forbidden origin** before Stripe runs. Same if env is empty/wrong.

**Symptoms:** Network tab shows 403 on `create-checkout-session`; alert may show `Forbidden origin` in JSON body if parsed.

### B. **Missing / invalid Edge secrets**

`create-checkout-session` returns **500** if `STRIPE_SECRET_KEY` or `SITE_URL` missing; **400** if `STRIPE_PRICE_*` for that SKU empty or not `price_*`; Stripe API errors return **400** with message.

### C. **User not signed in or email unverified**

`openPricingCheckout` opens auth or alerts; **no fetch** → no redirect (by design).

### D. **Missing `openPricing` global (hero / deep links)**

`components/home/hero/index.html` calls `openPricing('casepack')` but **`openPricing` is not defined** in `assets/js/app.js`. The hero falls back to `showPage('pricing')` only — **no** `__pricingHighlightPending` flush for pack highlight, and no direct checkout.

### E. **Lawyer portal & credits_10 (product gaps, not wiring bugs)**

- **Lawyer portal:** `components/pricing.html` — CTA is **disabled** (“Notify me at launch”). No `openPricingCheckout('lawyer_portal')` in UI.  
- **credits_10:** Allowed server-side (`billing.ts`) but **no pricing button** calls `openPricingCheckout('credits_10')`.

### F. **Not observed**

- No `pk_`/`sk_` in frontend repo copy.  
- `_headers` has no CSP blocking `connect-src` to Supabase (no CSP lines in file).  
- No deprecated `stripe.redirectToCheckout` path.

---

## 4. File / line reference

| Item | Location |
|------|-----------|
| Checkout client | `assets/js/app.js` — `openPricingCheckout` (~1293–1382) |
| Supabase init | `assets/js/supabase.js` — URL + anon key |
| Edge checkout | `supabase/functions/create-checkout-session/index.ts` |
| SKU / price env map | `supabase/functions/_shared/billing.ts` |
| CORS | `supabase/functions/_shared/cors.ts` |
| Webhook | `supabase/functions/stripe-webhook/index.ts` |
| Pricing CTAs | `components/pricing.html` (mirror path may exist) |
| Broken hero helper | `components/home/hero/index.html` line ~8 — `openPricing` undefined |

---

## 5. Required ops (cannot be fixed only in git)

1. **Supabase Edge secrets:** `STRIPE_SECRET_KEY` (live), all `STRIPE_PRICE_*` = **live** `price_…` IDs, `SITE_URL` = canonical **https** site base (no trailing slash issues handled in code), `CASEPATH_ALLOWED_ORIGINS` including **every** browser origin used in prod (www + apex if both used).  
2. **Stripe Dashboard:** Webhook → `stripe-webhook` URL; signing secret → `STRIPE_WEBHOOK_SECRET`.  
3. **Verify live vs test:** Repo cannot prove live keys; operators must confirm Dashboard mode matches keys.

---

## 6. Code repairs applied (post-report)

1. **`supabase/functions/_shared/cors.ts`** — When merging `SITE_URL` and each `CASEPATH_ALLOWED_ORIGINS` entry, register **www ↔ apex** `https` origin pairs (`mergeHttpsOriginPair`) so a single canonical `SITE_URL` still allows the alternate hostname.  
2. **`assets/js/app.js`** — Implement **`window.openPricing`** (navigate to pricing + `__flushPricingHighlightPending` for hero `openPricing('casepack')` and similar).  
3. **`assets/js/app.js`** — **`openPricingCheckout`:** handle `!res.ok` before treating body as success; user-facing hint for **403 Forbidden origin**; redirect only when `data.url` matches **`https://*.stripe.com/`** (Stripe-hosted checkout).

---

## 7. Recommended final architecture

- **Keep** server-only price resolution (SKU → env `price_*`); never accept price IDs from the client.  
- **Treat CORS + SITE_URL + www/apex** as first-class deploy checklist items.  
- **Single** `openPricing` + `openPricingCheckout` entry points for all marketing CTAs.  
- **Optional:** Add `credits_10` button when product ready; enable lawyer portal CTA when SKU is final.

---

## 8. Validation note

Automated “simulate all clicks” against real Stripe requires deployed Edge + live secrets. After deploy, verify in browser: POST 200 JSON `{ "url": "https://checkout.stripe.com/..." }` then navigation to that URL.
