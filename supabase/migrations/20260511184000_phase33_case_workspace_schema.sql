-- Phase 3.3/Workspace extension
-- Extends vault metadata safely and adds timeline + relationships.

ALTER TABLE public.vault_items
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS incident_date date,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS linked_document_id uuid,
  ADD COLUMN IF NOT EXISTS timeline_visible boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS evidence_type text,
  ADD COLUMN IF NOT EXISTS sensitivity_level text NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'vault_items'
      AND constraint_name = 'vault_items_linked_document_fkey'
  ) THEN
    ALTER TABLE public.vault_items
      ADD CONSTRAINT vault_items_linked_document_fkey
      FOREIGN KEY (linked_document_id) REFERENCES public.vault_items(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS vault_items_category_idx
  ON public.vault_items(user_id, category, created_at DESC);
CREATE INDEX IF NOT EXISTS vault_items_tags_gin_idx
  ON public.vault_items USING gin(tags);
CREATE INDEX IF NOT EXISTS vault_items_incident_date_idx
  ON public.vault_items(user_id, incident_date DESC);

ALTER TABLE public.vault_items
  DROP CONSTRAINT IF EXISTS vault_items_sensitivity_level_check;
ALTER TABLE public.vault_items
  ADD CONSTRAINT vault_items_sensitivity_level_check
  CHECK (sensitivity_level IN ('standard', 'sensitive', 'high'));

CREATE TABLE IF NOT EXISTS public.case_chronology_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vault_item_id uuid,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL DEFAULT 'incident',
  visibility text NOT NULL DEFAULT 'private',
  event_status text NOT NULL DEFAULT 'active',
  importance text NOT NULL DEFAULT 'normal',
  affidavit_relevant boolean NOT NULL DEFAULT false,
  incident_thread_id uuid,
  CONSTRAINT case_chronology_events_user_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT case_chronology_events_vault_item_fkey
    FOREIGN KEY (vault_item_id) REFERENCES public.vault_items(id) ON DELETE SET NULL,
  CONSTRAINT case_chronology_events_visibility_check
    CHECK (visibility IN ('private', 'shared')),
  CONSTRAINT case_chronology_events_type_check
    CHECK (event_type IN ('incident', 'court', 'communication', 'parenting', 'financial', 'medical', 'school', 'task', 'avo', 'agreement', 'wellbeing', 'breach')),
  CONSTRAINT case_chronology_events_status_check
    CHECK (event_status IN ('draft', 'active', 'archived', 'affidavit-linked', 'disputed', 'exported')),
  CONSTRAINT case_chronology_events_importance_check
    CHECK (importance IN ('low', 'normal', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS case_chronology_events_user_date_idx
  ON public.case_chronology_events(user_id, event_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS public.vault_item_relationships (
  source_item_id uuid NOT NULL,
  target_item_id uuid NOT NULL,
  relationship_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source_item_id, target_item_id, relationship_type),
  CONSTRAINT vault_item_relationships_source_fkey
    FOREIGN KEY (source_item_id) REFERENCES public.vault_items(id) ON DELETE CASCADE,
  CONSTRAINT vault_item_relationships_target_fkey
    FOREIGN KEY (target_item_id) REFERENCES public.vault_items(id) ON DELETE CASCADE,
  CONSTRAINT vault_item_relationships_type_check
    CHECK (relationship_type IN ('supports', 'contradicts', 'referenced_in', 'same_incident')),
  CONSTRAINT vault_item_relationships_not_same
    CHECK (source_item_id <> target_item_id)
);

ALTER TABLE public.case_chronology_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_item_relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "case_chronology_events_owner_read" ON public.case_chronology_events;
DROP POLICY IF EXISTS "case_chronology_events_owner_insert" ON public.case_chronology_events;
DROP POLICY IF EXISTS "case_chronology_events_owner_update" ON public.case_chronology_events;
DROP POLICY IF EXISTS "case_chronology_events_owner_delete" ON public.case_chronology_events;

CREATE POLICY "case_chronology_events_owner_read"
  ON public.case_chronology_events
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "case_chronology_events_owner_insert"
  ON public.case_chronology_events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "case_chronology_events_owner_update"
  ON public.case_chronology_events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "case_chronology_events_owner_delete"
  ON public.case_chronology_events
  FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "vault_item_relationships_owner_read" ON public.vault_item_relationships;
DROP POLICY IF EXISTS "vault_item_relationships_owner_insert" ON public.vault_item_relationships;
DROP POLICY IF EXISTS "vault_item_relationships_owner_delete" ON public.vault_item_relationships;

CREATE POLICY "vault_item_relationships_owner_read"
  ON public.vault_item_relationships
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.vault_items vi
      WHERE vi.id = source_item_id
        AND vi.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.vault_items vi
      WHERE vi.id = target_item_id
        AND vi.user_id = auth.uid()
    )
  );

CREATE POLICY "vault_item_relationships_owner_insert"
  ON public.vault_item_relationships
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.vault_items vi
      WHERE vi.id = source_item_id
        AND vi.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM public.vault_items vi
      WHERE vi.id = target_item_id
        AND vi.user_id = auth.uid()
    )
  );

CREATE POLICY "vault_item_relationships_owner_delete"
  ON public.vault_item_relationships
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.vault_items vi
      WHERE vi.id = source_item_id
        AND vi.user_id = auth.uid()
    )
  );
