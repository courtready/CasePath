# Phase 3.3 — Secure Storage, Vault & Data Safety Hardening

## Files changed

- `supabase/migrations/20260511180000_phase33_storage_vault_security.sql`
- `supabase/functions/vault-signed-url/index.ts`
- `assets/js/app.js`
- `_headers`
- `auth/DISASTER_RECOVERY_RUNBOOK.md`
- `auth/PHASE33_STORAGE_REPORT.md`

## What was hardened

### 1) Supabase storage and policy baseline

- Added private bucket bootstrap for `casepath-vault` (`public = false`).
- Enforced object path model via policy helper:
  - `vault/{auth.uid()}/court-orders/...`
  - `vault/{auth.uid()}/affidavits/...`
  - `vault/{auth.uid()}/evidence/...`
  - `vault/{auth.uid()}/financial/...`
  - `vault/{auth.uid()}/parenting/...`
- Added storage object policy checks that block disallowed path/extension patterns and keep owner scope server-side.
- Bucket-level MIME and size limits included (`15MB`, approved MIME allowlist).

### 2) Vault table security + ownership enforcement

- Added/normalized table layer:
  - `vault_items`
  - `vault_shares` (owner + expiry + revoke flag)
  - `vault_drafts`
  - `vault_audit_log`
- Enabled RLS and owner-only policies across vault entities.
- Added `log_vault_event(...)` RPC (authenticated/service role) for sensitive action audit trail.

### 3) Upload flow hardening in `assets/js/app.js`

- Added explicit client-side preflight checks:
  - extension allowlist (`pdf`, `jpg/jpeg`, `png`, `txt`, `docx`)
  - MIME allowlist
  - max file size (15MB)
  - block dangerous extensions (`exe`, `js`, `php`, `html`, `htm`, `svg`)
  - text-content sniffing for unsafe script markup in `.txt`
- Added upload audit events:
  - accepted uploads
  - rejected uploads
  - failed upload saves
- Vault uploads now request signed upload URLs from Edge (`vault-signed-url`) and upload into private storage bucket paths (`vault/{user_id}/{category}/...`) with randomized object names.

### 4) Autosave and recoverability

- Existing periodic autosave retained (`10s` debounce).
- Added IndexedDB-backed local resiliency:
  - latest encrypted autosave snapshot per user
  - pending encrypted writes queue for offline/server-failure replay
- On vault session init, pending encrypted writes are retried to server.
- Avoids localStorage-only draft reliance for vault autosave data path.

### 5) Export and sharing safety

- Share token inserts now include `user_id` and server-side expiry timestamp in `vault_shares`.
- Added share creation audit logging.
- Added authenticated Edge signed URL issuance for vault upload/download, short-lived by default (max 5 minutes).
- No public storage URLs were introduced.

### 6) Cache controls for sensitive routes

- Updated `_headers` with `Cache-Control: no-store` for:
  - `/index.html`
  - `/document-centre.html`
  - `/share.html`
  - `/avo-centre.html`

## Cloudflare + LiteSpeed cache guidance (validated requirements)

For authenticated/sensitive traffic, ensure CDN/proxy rules honor origin no-store semantics:

1. **Cloudflare**
   - Bypass cache for routes above and any future authenticated paths.
   - Respect origin cache-control headers (no edge cache override for sensitive routes).
   - Disable query-string cache behavior that could cache tokenized pages.
2. **LiteSpeed**
   - Exclude authenticated routes/cookies from LSCache.
   - Ensure LSCache does not cache pages with auth/session cookies.
   - Purge on policy/config changes.

## Remaining storage risks

1. Existing client-side `Vault.init` key derivation uses user identity + local salt; stronger server-mediated key lifecycle (envelope model) should replace this in a later phase.
2. Share token consumer path is intentionally minimal right now; production sharing should enforce owner/recipient authorization checks and explicit token verification endpoints.
3. Download/export UI path is not yet wired to call signed download URL endpoint for object retrieval in the vault UI.

## Remaining cache risks

1. SPA sensitive views rendered from `/index.html` are covered by no-store, but intermediate reverse-proxy rules must be explicitly configured in Cloudflare/LiteSpeed.
2. Any future standalone authenticated HTML route must be added to `_headers` no-store set immediately.

## Remaining upload risks

1. Client validation is defense-in-depth only; keep server-issued signed URL + strict storage/RLS checks as the authority.
2. MIME spoofing is still possible client-side; add content scanning/AV or trusted server-side sniffing as a later phase.

## Draft/mobile persistence risks

1. IndexedDB availability can vary in restricted/private-browser contexts.
2. Autosave queue replay depends on successful auth/session restoration.
3. Mobile OS process termination can still drop in-memory unsaved text between keypress and autosave interval.

## Production readiness blockers

- [ ] Apply migration `20260511180000_phase33_storage_vault_security.sql` in production.
- [ ] Verify existing `vault_items` / `vault_shares` schema compatibility before migration on live data.
- [ ] Deploy Edge function `vault-signed-url` with `SUPABASE_SERVICE_ROLE_KEY` set.
- [ ] Wire vault download/export UI to signed download endpoint for object retrieval.
- [ ] Configure and test Cloudflare + LiteSpeed cache bypass rules for sensitive routes.
- [ ] Run high-concurrency tests for autosave queue replay and vault write consistency.
