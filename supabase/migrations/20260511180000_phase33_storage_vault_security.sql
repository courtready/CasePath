-- Phase 3.3 — Secure storage, vault hardening, and sensitive action audit.

-- 1) Vault tables (idempotent; keep compatibility with legacy app payloads)
CREATE TABLE IF NOT EXISTS public.vault_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'document',
  category text NOT NULL DEFAULT 'general',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vault_items_user_created_idx
  ON public.vault_items(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.vault_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text UNIQUE NOT NULL,
  payload jsonb NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vault_shares_user_created_idx
  ON public.vault_shares(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.vault_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  draft_key text NOT NULL,
  payload jsonb NOT NULL,
  saved_at timestamptz NOT NULL DEFAULT now(),
  device_label text,
  UNIQUE(user_id, draft_key)
);

CREATE TABLE IF NOT EXISTS public.vault_audit_log (
  id bigserial PRIMARY KEY,
  user_id uuid,
  action text NOT NULL,
  target text,
  status text NOT NULL DEFAULT 'ok',
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vault_audit_log_user_created_idx
  ON public.vault_audit_log(user_id, created_at DESC);

-- Ensure RLS is enabled.
ALTER TABLE public.vault_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vault_audit_log ENABLE ROW LEVEL SECURITY;

-- Remove permissive legacy policies if they exist.
DROP POLICY IF EXISTS "vault_items_owner_read" ON public.vault_items;
DROP POLICY IF EXISTS "vault_items_owner_insert" ON public.vault_items;
DROP POLICY IF EXISTS "vault_items_owner_update" ON public.vault_items;
DROP POLICY IF EXISTS "vault_items_owner_delete" ON public.vault_items;

DROP POLICY IF EXISTS "vault_shares_owner_read" ON public.vault_shares;
DROP POLICY IF EXISTS "vault_shares_owner_insert" ON public.vault_shares;
DROP POLICY IF EXISTS "vault_shares_owner_update" ON public.vault_shares;
DROP POLICY IF EXISTS "vault_shares_owner_delete" ON public.vault_shares;

DROP POLICY IF EXISTS "vault_drafts_owner_read" ON public.vault_drafts;
DROP POLICY IF EXISTS "vault_drafts_owner_insert" ON public.vault_drafts;
DROP POLICY IF EXISTS "vault_drafts_owner_update" ON public.vault_drafts;
DROP POLICY IF EXISTS "vault_drafts_owner_delete" ON public.vault_drafts;

DROP POLICY IF EXISTS "vault_audit_log_owner_read" ON public.vault_audit_log;

-- Owner-scoped table policies (server-side authoritative ownership).
CREATE POLICY "vault_items_owner_read"
  ON public.vault_items
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "vault_items_owner_insert"
  ON public.vault_items
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_items_owner_update"
  ON public.vault_items
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_items_owner_delete"
  ON public.vault_items
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "vault_shares_owner_read"
  ON public.vault_shares
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "vault_shares_owner_insert"
  ON public.vault_shares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND expires_at > now());

CREATE POLICY "vault_shares_owner_update"
  ON public.vault_shares
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_shares_owner_delete"
  ON public.vault_shares
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "vault_drafts_owner_read"
  ON public.vault_drafts
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "vault_drafts_owner_insert"
  ON public.vault_drafts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_drafts_owner_update"
  ON public.vault_drafts
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "vault_drafts_owner_delete"
  ON public.vault_drafts
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "vault_audit_log_owner_read"
  ON public.vault_audit_log
  FOR SELECT
  USING (auth.uid() = user_id);

-- 2) Storage bucket lockdown (private + owner path + blocked dangerous extensions)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'casepath-vault',
  'casepath-vault',
  false,
  15728640,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-zip-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.casepath_storage_object_allowed_path(p_name text)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    split_part(p_name, '/', 1) = 'vault'
    AND split_part(p_name, '/', 2) = auth.uid()::text
    AND split_part(p_name, '/', 3) IN (
      'court-orders',
      'affidavits',
      'evidence',
      'documents',
      'communications',
      'parenting',
      'financial',
      'medical',
      'school',
      'tasks'
    )
    AND p_name !~* '\.(exe|js|php|html?|svg)$';
$$;

DROP POLICY IF EXISTS "casepath_vault_owner_select" ON storage.objects;
DROP POLICY IF EXISTS "casepath_vault_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "casepath_vault_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "casepath_vault_owner_delete" ON storage.objects;

CREATE POLICY "casepath_vault_owner_select"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'casepath-vault'
    AND public.casepath_storage_object_allowed_path(name)
  );

CREATE POLICY "casepath_vault_owner_insert"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'casepath-vault'
    AND public.casepath_storage_object_allowed_path(name)
  );

CREATE POLICY "casepath_vault_owner_update"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'casepath-vault'
    AND public.casepath_storage_object_allowed_path(name)
  )
  WITH CHECK (
    bucket_id = 'casepath-vault'
    AND public.casepath_storage_object_allowed_path(name)
  );

CREATE POLICY "casepath_vault_owner_delete"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'casepath-vault'
    AND public.casepath_storage_object_allowed_path(name)
  );

-- 3) Audit logging helper for sensitive actions.
CREATE OR REPLACE FUNCTION public.log_vault_event(
  p_action text,
  p_target text,
  p_status text,
  p_detail jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.vault_audit_log (user_id, action, target, status, detail)
  VALUES (
    uid,
    COALESCE(NULLIF(trim(p_action), ''), 'unknown'),
    NULLIF(trim(COALESCE(p_target, '')), ''),
    COALESCE(NULLIF(trim(p_status), ''), 'ok'),
    p_detail
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_vault_event(text, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_vault_event(text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_vault_event(text, text, text, jsonb) TO service_role;

COMMENT ON TABLE public.vault_items IS 'Encrypted user vault records (owner RLS).';
COMMENT ON TABLE public.vault_shares IS 'Time-bounded share tokens, owner-scoped.';
COMMENT ON TABLE public.vault_drafts IS 'Recoverable autosave drafts persisted server-side.';
COMMENT ON TABLE public.vault_audit_log IS 'Sensitive vault action audit trail.';
