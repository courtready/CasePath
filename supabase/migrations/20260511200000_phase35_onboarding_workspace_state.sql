-- Phase 3.5 onboarding/workspace state separation

ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS workspace_initialized boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS primary_case_type text,
  ADD COLUMN IF NOT EXISTS first_incident_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS workspace_last_opened_at timestamptz;

CREATE INDEX IF NOT EXISTS members_onboarding_workspace_idx
  ON public.members (id, onboarding_completed, workspace_initialized);
