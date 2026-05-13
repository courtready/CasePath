# Phase 3.4 Stabilisation + Hardening Pass

## Scope completed

This pass focused on integrity, resilience, and auditability (not feature expansion):

- migration safety guards
- chronology/evidence linkage integrity
- export bundle reliability + reconstructability
- soft-delete + provenance foundations
- defensive edge-case handling
- strict security posture revalidation notes

## Files changed

- `supabase/migrations/20260511193000_phase34_stabilisation_softdelete_provenance.sql`
- `supabase/migrations/20260511194000_phase34_migration_integrity_guards.sql`
- `assets/js/case-workspace.js`
- `auth/PHASE34_STABILISATION_REPORT.md`

## Migration verification

### Rename continuity (`case_timeline_events` -> `case_chronology_events`)

- Codebase stale reference scan completed.
- Remaining `case_timeline_events` references are migration-only compatibility lines in:
  - `20260511190000_phase34_event_centric_chronology.sql`
  - `20260511194000_phase34_migration_integrity_guards.sql`

### FK/index/RLS survival guards

Added `20260511194000_phase34_migration_integrity_guards.sql` to enforce:

- RLS enabled on:
  - `case_chronology_events`
  - `case_incident_threads`
  - `vault_items`
- Legacy policy-name cleanup from pre-rename naming.
- Recreate/ensure chronology owner policies when missing.
- Guard indexes for chronology status + affidavit filters.

### Soft-delete + provenance schema

Added `20260511193000_phase34_stabilisation_softdelete_provenance.sql`:

- `deleted_at`, `deleted_by` on:
  - `case_chronology_events`
  - `case_incident_threads`
  - `vault_items`
- `created_from_device`, `created_from_platform` on same tables.
- Device/platform check constraints.
- Partial indexes for active (non-deleted) rows.

## End-to-end workflow coverage (implemented checks)

### Desktop/mobile flow integrity in code

- Incident create validates:
  - non-empty title
  - valid date
  - no future date
  - calm user-facing errors
- Evidence attach validates:
  - signed URL availability
  - interrupted upload handling
  - expired/forbidden signed URL handling
  - duplicate attachment detection (same incident/name/size)
- Fetch queries now hide soft-deleted rows by default (`deleted_at IS NULL`).
- Export includes linkage maps:
  - `events_by_thread`
  - `evidence_by_event`
  - orphan integrity summary

### Manual QA checklist (run in browser)

Desktop:
1. Add incident + notes + tags + thread.
2. Attach image and PDF.
3. Reload and verify chronology + linked evidence persist.
4. Export with filters and verify linkage maps include event/thread IDs.

Mobile:
1. Add incident via quick entry/fab.
2. Camera + screenshot attachment.
3. Reload and verify thread grouping + linkage.
4. Verify mobile chip scrolling and thread switching.

## Edge-case handling status

Implemented:

- empty title
- invalid date
- future date
- duplicate evidence attachment detection
- expired signed URL message
- interrupted upload message
- missing chronology event when attaching evidence
- orphan evidence visibility in export integrity
- unsupported/oversized MIME/ZIP path still enforced by existing upload validators + storage allowlists

Still recommended:

- add explicit retry UI button after interrupted upload
- add user-facing restore view for soft-deleted records (foundation exists, restore UI not built yet)

## Export integrity strengthening

Export now contains:

- chronology event IDs
- thread IDs
- evidence IDs
- relationship maps (`events_by_thread`, `evidence_by_event`)
- timestamps + filters used
- orphan integrity metadata for reconstruction diagnostics

This allows chronology reconstruction from bundle data without filename-only assumptions.

## Audit hardening

`logVaultEvent` usage expanded in workspace logic for:

- incident thread creation
- incident creation
- evidence attachment creation
- export creation

Soft deletion + restore action logs are foundation-ready (fields exist) but no delete/restore UI was added in this pass.

## Security validation summary

No public-access posture was introduced.

- signed upload flow preserved
- owner-scoped row access preserved
- private bucket architecture unchanged
- existing extension/MIME allowlists retained
- chronology/thread ownership validation remains by user-scoped queries + RLS

## Production readiness actions

1. Apply migrations in order through `20260511194000`.
2. Run the desktop/mobile QA checklist above in staging and production-like environments.
3. Verify RLS policy presence via SQL introspection after deploy.
4. Confirm export bundles reconstruct chronology/event-thread links in downstream consumer scripts.
