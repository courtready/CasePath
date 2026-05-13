-- Phase 3.4 — Event-centric chronology model
-- Shift from file-centric to incident/event-centric architecture.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'case_timeline_events'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'case_chronology_events'
  ) THEN
    ALTER TABLE public.case_timeline_events RENAME TO case_chronology_events;
  END IF;
END $$;

ALTER TABLE public.case_chronology_events
  ADD COLUMN IF NOT EXISTS event_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS importance text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS affidavit_relevant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS incident_thread_id uuid,
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.case_chronology_events
  DROP CONSTRAINT IF EXISTS case_timeline_events_visibility_check;
ALTER TABLE public.case_chronology_events
  DROP CONSTRAINT IF EXISTS case_timeline_events_type_check;
ALTER TABLE public.case_chronology_events
  DROP CONSTRAINT IF EXISTS case_chronology_events_visibility_check;
ALTER TABLE public.case_chronology_events
  DROP CONSTRAINT IF EXISTS case_chronology_events_type_check;
ALTER TABLE public.case_chronology_events
  DROP CONSTRAINT IF EXISTS case_chronology_events_status_check;
ALTER TABLE public.case_chronology_events
  DROP CONSTRAINT IF EXISTS case_chronology_events_importance_check;

ALTER TABLE public.case_chronology_events
  ADD CONSTRAINT case_chronology_events_visibility_check
    CHECK (visibility IN ('private', 'shared')),
  ADD CONSTRAINT case_chronology_events_type_check
    CHECK (event_type IN ('incident', 'court', 'communication', 'parenting', 'financial', 'medical', 'school', 'task', 'avo', 'agreement', 'wellbeing', 'breach')),
  ADD CONSTRAINT case_chronology_events_status_check
    CHECK (event_status IN ('draft', 'active', 'archived', 'affidavit-linked', 'disputed', 'exported')),
  ADD CONSTRAINT case_chronology_events_importance_check
    CHECK (importance IN ('low', 'normal', 'high', 'critical'));

CREATE INDEX IF NOT EXISTS case_chronology_events_user_date_idx
  ON public.case_chronology_events(user_id, event_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS case_chronology_events_thread_idx
  ON public.case_chronology_events(user_id, incident_thread_id, event_date DESC);
CREATE INDEX IF NOT EXISTS case_chronology_events_status_idx
  ON public.case_chronology_events(user_id, event_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.case_incident_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'incident',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active',
  chronology_visible boolean NOT NULL DEFAULT true,
  affidavit_relevant boolean NOT NULL DEFAULT false,
  tags text[] NOT NULL DEFAULT '{}',
  CONSTRAINT case_incident_threads_status_check
    CHECK (status IN ('active', 'on-hold', 'resolved', 'archived'))
);

CREATE INDEX IF NOT EXISTS case_incident_threads_user_idx
  ON public.case_incident_threads(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS case_incident_threads_tags_gin_idx
  ON public.case_incident_threads USING gin(tags);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'case_chronology_events'
      AND constraint_name = 'case_chronology_events_thread_fkey'
  ) THEN
    ALTER TABLE public.case_chronology_events
      ADD CONSTRAINT case_chronology_events_thread_fkey
      FOREIGN KEY (incident_thread_id) REFERENCES public.case_incident_threads(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.vault_items
  ADD COLUMN IF NOT EXISTS chronology_event_id uuid,
  ADD COLUMN IF NOT EXISTS incident_thread_id uuid,
  ADD COLUMN IF NOT EXISTS importance text NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS affidavit_relevant boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS export_included boolean NOT NULL DEFAULT false;

ALTER TABLE public.vault_items
  DROP CONSTRAINT IF EXISTS vault_items_importance_check;
ALTER TABLE public.vault_items
  ADD CONSTRAINT vault_items_importance_check
    CHECK (importance IN ('low', 'normal', 'high', 'critical'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'vault_items'
      AND constraint_name = 'vault_items_chronology_event_fkey'
  ) THEN
    ALTER TABLE public.vault_items
      ADD CONSTRAINT vault_items_chronology_event_fkey
      FOREIGN KEY (chronology_event_id) REFERENCES public.case_chronology_events(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'vault_items'
      AND constraint_name = 'vault_items_incident_thread_fkey'
  ) THEN
    ALTER TABLE public.vault_items
      ADD CONSTRAINT vault_items_incident_thread_fkey
      FOREIGN KEY (incident_thread_id) REFERENCES public.case_incident_threads(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.case_incident_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_incident_threads_owner_read" ON public.case_incident_threads;
DROP POLICY IF EXISTS "case_incident_threads_owner_insert" ON public.case_incident_threads;
DROP POLICY IF EXISTS "case_incident_threads_owner_update" ON public.case_incident_threads;
DROP POLICY IF EXISTS "case_incident_threads_owner_delete" ON public.case_incident_threads;

CREATE POLICY "case_incident_threads_owner_read"
  ON public.case_incident_threads
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "case_incident_threads_owner_insert"
  ON public.case_incident_threads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "case_incident_threads_owner_update"
  ON public.case_incident_threads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "case_incident_threads_owner_delete"
  ON public.case_incident_threads
  FOR DELETE
  USING (auth.uid() = user_id);
