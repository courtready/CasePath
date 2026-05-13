# CasePath Disaster Recovery Runbook (Phase 3.3)

## Scope

This runbook covers restoration for sensitive case data in:

- Supabase Postgres (`members`, `vault_items`, `vault_shares`, `vault_drafts`, billing/vault audit tables)
- Supabase Storage bucket `casepath-vault`
- Edge Functions deployment state

## Recovery Objectives

- **RPO target:** <= 15 minutes for database data where PITR is enabled.
- **RTO target:** <= 2 hours for full service recovery.
- **Priority order:** auth + entitlements, vault data, generated documents/exports, supporting analytics.

## Incident Classification

- **P1:** confirmed data loss/corruption in vault or entitlements, or unauthorized data exposure.
- **P2:** isolated user data inconsistency, no broad exposure.
- **P3:** non-critical recoverable issue with no current customer impact.

## Database Recovery (Supabase PITR)

1. Put app in maintenance mode (or disable write paths via temporary RLS deny policy).
2. Identify incident timestamp and last known good timestamp.
3. Create fork/restore from Supabase backup or point-in-time to a staging project first.
4. Validate critical tables:
   - `members`
   - `vault_items`
   - `vault_shares`
   - `vault_drafts`
   - `stripe_processed_events`
   - `billing_audit_log`
   - `vault_audit_log`
5. Compare row counts/checksums against pre-incident telemetry.
6. Promote restored instance (or selectively copy corrected data in transaction batches).
7. Re-enable write traffic and monitor error rates + audit logs.

## Storage Recovery (Supabase Storage)

1. Confirm bucket exposure status (`public = false`).
2. Restore lost objects from provider backup/source mirror (if configured).
3. Re-verify object path constraints:
   - `vault/{user_id}/court-orders/...`
   - `vault/{user_id}/affidavits/...`
   - `vault/{user_id}/evidence/...`
   - `vault/{user_id}/financial/...`
   - `vault/{user_id}/parenting/...`
4. Re-run signed URL generation checks (no public URL fallback).
5. Audit for unexpected extensions/types and quarantine suspicious objects.

## Rollback Process (Application / Function Deploy)

1. Identify last known good git commit and function artifact versions.
2. Roll back Edge Functions in order:
   - `stripe-webhook`
   - `create-checkout-session`
   - `consume-doc-credit`
   - any future vault storage signed URL functions
3. Reapply matching SQL migration set for that release window only if schema drift requires it.
4. Run smoke tests:
   - login/session checks
   - vault read/write (owner-only)
   - credit consumption
   - webhook idempotency

## Operational Risks

- Restoring DB without matching storage restore can orphan vault metadata.
- Restoring storage without DB rollback can leave references to missing rows.
- Drift between Stripe state and `members.plan` requires reconciliation pass before reopening billing.
- CDN/proxy caches must be purged for sensitive authenticated routes after incident handling.

## Post-Recovery Validation Checklist

- [ ] RLS policies still enforced for vault/billing tables.
- [ ] `casepath-vault` bucket remains private.
- [ ] No public listing or public object URL access.
- [ ] Signed URLs are short-lived and function-scoped.
- [ ] `Cache-Control: no-store` on authenticated/sensitive routes.
- [ ] Audit logs capture post-recovery sensitive actions.
