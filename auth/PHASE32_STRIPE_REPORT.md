# Phase 3.2 — Stripe & entitlement hardening (report)

## Files changed (this phase)

| Area | Path |
|------|------|
| Client checkout | `assets/js/app.js` — `openPricingCheckout` sends only `{ sku, return_path }`; JWT is the user proof |
| Client credits | `assets/js/app.js` — `useCredit` calls Edge `consume-doc-credit` (no direct `members` updates) |
| Edge checkout | `supabase/functions/create-checkout-session/index.ts` |
| Edge webhook | `supabase/functions/stripe-webhook/index.ts` |
| Edge credits | `supabase/functions/consume-doc-credit/index.ts` |
| Price map | `supabase/functions/_shared/billing.ts` (unchanged this pass; canonical map from env-backed Stripe price IDs) |
| DB | `supabase/migrations/20260511120000_phase32_stripe_billing.sql` (existing) |
| DB | `supabase/migrations/20260511120001_phase32_consume_credit_authoritative.sql` — pro no-op debit, row lock, audit |
| DB | `supabase/migrations/20260511120002_phase32_webhook_atomic_apply.sql` — `apply_stripe_checkout_entitlements` atomic claim + grant |
| Deploy | `supabase/config.toml` — `stripe-webhook` has `verify_jwt = false` |

## What is now authoritative

- **Checkout line items**: Webhook resolves Stripe `price_*` IDs through `buildPriceEntitlementMap()` (from Edge secrets only). Unknown price IDs are rejected (HTTP 500 + audit) so misconfiguration does not silently grant wrong entitlements.
- **Checkout session creation**: Only allowlisted `sku` values; price ID and mode come from server env (`SKU_TABLE` / `resolveSkuToPriceId`). Client `priceId`, `plan`, `feature`, `purchase_type`, and `userId` are not accepted.
- **Credits**: `consume_one_document_credit()` runs under `SECURITY DEFINER` with `FOR UPDATE`, blocks negative balances for non‑pro, returns balance for `pro` without debit, and writes `billing_audit_log` rows for debit / insufficient / pro skip.
- **Webhook idempotency**: `checkout.session.completed` uses `apply_stripe_checkout_entitlements`, which inserts into `stripe_processed_events` in the **same transaction** as the `members` upsert and audit row, so a failed write rolls back the claim and Stripe can retry safely. Other event types still use `claim_stripe_event` + audit-only handling.

## Remaining billing / client-trust risks

1. **`hasAccess` / `requireAuth` (client)** — Feature gating still reads `window.currentUser.plan` and related client state. That is appropriate for **UX** only. Anyone can bypass the browser; **authoritative enforcement** belongs in RLS, Edge tools, or signed server checks. Treat client checks as hints, not proof.
2. **Promo essential (`isPromoEssentialEnabled`)** — `useCredit` still short-circuits without calling the server when this returns true, so “free” essential usage is not backed by the same RPC path. If promos must be trusted, move the flag to a server-evaluated claim or table.
3. **Subscription lifecycle beyond Checkout** — Cancels, past-due, proration, and `customer.subscription.updated` are not fully mirrored into `members.plan` yet. Production should store `stripe_customer_id` / `stripe_subscription_id` and reconcile periodically or handle additional webhook types.
4. **Operational** — Edge secrets must define every `STRIPE_PRICE_*` referenced in `SKU_TABLE`; missing env yields checkout 400 and webhook 500 on unknown price (intentional fail-closed).

## Webhook / replay risks (mitigated vs residual)

| Risk | Mitigation |
|------|------------|
| Duplicate `event.id` delivery | `apply_stripe_checkout_entitlements` / `claim_stripe_event` + PK on `event_id` |
| Grant without durable claim (partial failure) | Single-transaction apply for checkout |
| Forged webhooks | Stripe signature verification + `STRIPE_WEBHOOK_SECRET` |
| JWT on webhook | `verify_jwt = false` only for this function; no user JWT required |

Residual: replay of a **different** event that represents the same payment (rare Stripe edge cases) is not deduped by `session_id` alone; add `stripe_checkout_sessions` dedupe table if that becomes a requirement.

## Production readiness blockers (checklist)

- [ ] Apply migrations `20260511120000`, `20260511120001`, `20260511120002` to production Supabase.
- [ ] Deploy Edge functions with secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`, all `STRIPE_PRICE_*` from `billing.ts`, `SUPABASE_SERVICE_ROLE_KEY` (webhook only).
- [ ] Point Stripe webhook endpoint at `stripe-webhook` and use the signing secret from the Dashboard.
- [ ] Confirm `members` has `PRIMARY KEY (id)` for `ON CONFLICT (id)`.
- [ ] Load-test `consume_one_document_credit` under concurrency (row lock behaviour).
- [ ] Implement subscription reconciliation (customer/subscription IDs + extra events) before relying solely on Checkout for long-lived plans.

## Subscription sync / validation (recommended)

1. Add `stripe_customer_id` (and optionally `stripe_subscription_id`) on `members` from Checkout `session.customer` / subscription mode.
2. Handle at minimum: `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid` as needed for your billing model.
3. Nightly job: compare active subscriptions in Stripe to `members.plan` and emit alerts on drift.

## Design note: canonical `PRICE_MAP`

Runtime mapping is built in `buildPriceEntitlementMap()` from environment variables (no literal `price_…` strings in the repo). This keeps secrets out of git while preserving a single server-side map. Unknown IDs are omitted from the map and rejected at webhook time.
