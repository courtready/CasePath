-- Migration integrity guards after timeline -> chronology rename.

ALTER TABLE IF EXISTS public.case_chronology_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.case_incident_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vault_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_timeline_events_owner_read" ON public.case_chronology_events;
DROP POLICY IF EXISTS "case_timeline_events_owner_insert" ON public.case_chronology_events;
DROP POLICY IF EXISTS "case_timeline_events_owner_update" ON public.case_chronology_events;
DROP POLICY IF EXISTS "case_timeline_events_owner_delete" ON public.case_chronology_events;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'case_chronology_events'
      AND policyname = 'case_chronology_events_owner_read'
  ) THEN
    CREATE POLICY "case_chronology_events_owner_read"
      ON public.case_chronology_events
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'case_chronology_events'
      AND policyname = 'case_chronology_events_owner_insert'
  ) THEN
    CREATE POLICY "case_chronology_events_owner_insert"
      ON public.case_chronology_events
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'case_chronology_events'
      AND policyname = 'case_chronology_events_owner_update'
  ) THEN
    CREATE POLICY "case_chronology_events_owner_update"
      ON public.case_chronology_events
      FOR UPDATE
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'case_chronology_events'
      AND policyname = 'case_chronology_events_owner_delete'
  ) THEN
    CREATE POLICY "case_chronology_events_owner_delete"
      ON public.case_chronology_events
      FOR DELETE
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Keep referential linkage query performance stable.
CREATE INDEX IF NOT EXISTS case_chronology_events_event_status_idx
  ON public.case_chronology_events(user_id, event_status, event_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS case_chronology_events_affidavit_idx
  ON public.case_chronology_events(user_id, affidavit_relevant, event_date DESC)
  WHERE deleted_at IS NULL;
