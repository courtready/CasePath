-- Phase 3.4 stabilisation: soft delete + provenance + integrity indexes

ALTER TABLE public.case_chronology_events
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS created_from_device text,
  ADD COLUMN IF NOT EXISTS created_from_platform text;

ALTER TABLE public.case_incident_threads
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS created_from_device text,
  ADD COLUMN IF NOT EXISTS created_from_platform text;

ALTER TABLE public.vault_items
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by uuid,
  ADD COLUMN IF NOT EXISTS created_from_device text,
  ADD COLUMN IF NOT EXISTS created_from_platform text;

ALTER TABLE public.case_chronology_events
  DROP CONSTRAINT IF EXISTS case_chronology_events_device_check;
ALTER TABLE public.case_chronology_events
  DROP CONSTRAINT IF EXISTS case_chronology_events_platform_check;
ALTER TABLE public.case_chronology_events
  ADD CONSTRAINT case_chronology_events_device_check
    CHECK (created_from_device IS NULL OR created_from_device IN ('ios', 'android', 'desktop', 'imported', 'unknown')),
  ADD CONSTRAINT case_chronology_events_platform_check
    CHECK (created_from_platform IS NULL OR created_from_platform IN ('web', 'mobile-web', 'native', 'imported', 'unknown'));

ALTER TABLE public.case_incident_threads
  DROP CONSTRAINT IF EXISTS case_incident_threads_device_check;
ALTER TABLE public.case_incident_threads
  DROP CONSTRAINT IF EXISTS case_incident_threads_platform_check;
ALTER TABLE public.case_incident_threads
  ADD CONSTRAINT case_incident_threads_device_check
    CHECK (created_from_device IS NULL OR created_from_device IN ('ios', 'android', 'desktop', 'imported', 'unknown')),
  ADD CONSTRAINT case_incident_threads_platform_check
    CHECK (created_from_platform IS NULL OR created_from_platform IN ('web', 'mobile-web', 'native', 'imported', 'unknown'));

ALTER TABLE public.vault_items
  DROP CONSTRAINT IF EXISTS vault_items_device_check;
ALTER TABLE public.vault_items
  DROP CONSTRAINT IF EXISTS vault_items_platform_check;
ALTER TABLE public.vault_items
  ADD CONSTRAINT vault_items_device_check
    CHECK (created_from_device IS NULL OR created_from_device IN ('ios', 'android', 'desktop', 'imported', 'unknown')),
  ADD CONSTRAINT vault_items_platform_check
    CHECK (created_from_platform IS NULL OR created_from_platform IN ('web', 'mobile-web', 'native', 'imported', 'unknown'));

CREATE INDEX IF NOT EXISTS case_chronology_events_soft_active_idx
  ON public.case_chronology_events (user_id, event_date DESC, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS case_incident_threads_soft_active_idx
  ON public.case_incident_threads (user_id, updated_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS vault_items_soft_active_idx
  ON public.vault_items (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS vault_items_chronology_link_idx
  ON public.vault_items (user_id, chronology_event_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS vault_items_thread_link_idx
  ON public.vault_items (user_id, incident_thread_id)
  WHERE deleted_at IS NULL;
