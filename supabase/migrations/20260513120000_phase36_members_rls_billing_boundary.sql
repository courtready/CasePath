-- Phase 3.6 — public.members RLS + billing write boundary
--
-- Trust boundaries (read before changing):
-- * PostgREST / browser clients use JWT roles `anon` or `authenticated`. They must never
--   directly mutate billing columns (plan, doc_credits, Stripe linkage). Those writes
--   belong only to SECURITY DEFINER RPCs owned by a privileged DB role (bypasses RLS and
--   passes the trigger’s “trusted session” gate via current_user), or to service_role
--   (bypasses RLS; trigger still runs — service_role is typically superuser/bypass on Supabase).
-- * Edge Functions calling Supabase with the service role key bypass RLS entirely; keep
--   keys off clients. Webhooks should continue to call apply_stripe_checkout_entitlements.
-- * Profile / onboarding fields (email, onboarding_completed, workspace_initialized, etc.)
--   remain updatable by the row owner; the BEFORE trigger only normalizes billing on
--   client-origin INSERT and rejects client-origin billing UPDATEs.
--
-- Rollback (run in order if you must revert this migration):
--   DROP TRIGGER IF EXISTS members_billing_trust_boundary_trg ON public.members;
--   DROP FUNCTION IF EXISTS public.members_enforce_billing_trust_boundary();
--   ALTER TABLE public.members NO FORCE ROW LEVEL SECURITY;
--   ALTER TABLE public.members DISABLE ROW LEVEL SECURITY;
--   DROP POLICY IF EXISTS "members_authenticated_select_own" ON public.members;
--   DROP POLICY IF EXISTS "members_authenticated_insert_own" ON public.members;
--   DROP POLICY IF EXISTS "members_authenticated_update_own" ON public.members;
--   DROP POLICY IF EXISTS "members_anon_deny_all" ON public.members;
--   REVOKE ALL ON TABLE public.members FROM authenticated;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.members TO authenticated; -- restore prior if you had DELETE
--   GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.members TO anon;        -- only if you intentionally had anon (not recommended)
--   -- Then restore previous definitions of consume_one_document_credit / apply_stripe_checkout_entitlements from phase 3.2 migrations.

-- ---------------------------------------------------------------------------
-- 1) Stripe linkage columns (nullable). Safe if already present.
-- ---------------------------------------------------------------------------
ALTER TABLE public.members
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

COMMENT ON COLUMN public.members.stripe_customer_id IS 'Billing: set only from trusted server paths (Stripe/webhook RPCs), never from anon/client.';
COMMENT ON COLUMN public.members.stripe_subscription_id IS 'Billing: set only from trusted server paths (Stripe/webhook RPCs), never from anon/client.';

-- ---------------------------------------------------------------------------
-- 2) Trigger: enforce billing columns are not written from untrusted sessions.
--    “Trusted” = current_user is superuser or BYPASSRLS (covers service_role /
--    SECURITY DEFINER bodies owned by postgres on typical Supabase installs).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.members_enforce_billing_trust_boundary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  trusted boolean;
BEGIN
  SELECT COALESCE((
    SELECT r.rolsuper OR r.rolbypassrls
    FROM pg_roles r
    WHERE r.rolname = current_user
  ), false)
  INTO trusted;

  IF trusted THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Client-created rows (e.g. syncUser upsert): billing must match server defaults only.
    NEW.plan := 'free';
    NEW.doc_credits := 0;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.plan IS DISTINCT FROM NEW.plan
       OR OLD.doc_credits IS DISTINCT FROM NEW.doc_credits
       OR OLD.stripe_customer_id IS DISTINCT FROM NEW.stripe_customer_id
       OR OLD.stripe_subscription_id IS DISTINCT FROM NEW.stripe_subscription_id
    THEN
      RAISE EXCEPTION 'members_billing_immutable_for_client'
        USING ERRCODE = '42501',
              HINT = 'Billing fields are updated only via trusted RPCs (e.g. apply_stripe_checkout_entitlements, consume_one_document_credit).';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.members_enforce_billing_trust_boundary() IS 'Blocks direct client mutations to billing columns; allows privileged server roles and SECURITY DEFINER owners with BYPASSRLS/superuser.';

DROP TRIGGER IF EXISTS members_billing_trust_boundary_trg ON public.members;
CREATE TRIGGER members_billing_trust_boundary_trg
  BEFORE INSERT OR UPDATE ON public.members
  FOR EACH ROW
  EXECUTE PROCEDURE public.members_enforce_billing_trust_boundary();

-- ---------------------------------------------------------------------------
-- 3) RLS: owner-only read/write on the row; FORCE so even table owner obeys policies
--    when not bypassing (defense-in-depth; service_role still bypasses RLS).
-- ---------------------------------------------------------------------------
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "members_authenticated_select_own" ON public.members;
DROP POLICY IF EXISTS "members_authenticated_insert_own" ON public.members;
DROP POLICY IF EXISTS "members_authenticated_update_own" ON public.members;
DROP POLICY IF EXISTS "members_anon_deny_all" ON public.members;

-- Explicit no-op policy name for documentation; anon has no GRANTs below, so this is belt-and-suspenders.
CREATE POLICY "members_anon_deny_all"
  ON public.members
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "members_authenticated_select_own"
  ON public.members
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "members_authenticated_insert_own"
  ON public.members
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "members_authenticated_update_own"
  ON public.members
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMENT ON POLICY "members_authenticated_select_own" ON public.members IS 'Owner reads own profile + entitlements; anon has separate deny policy and no GRANT.';
COMMENT ON POLICY "members_authenticated_update_own" ON public.members IS 'Owner may update non-billing columns; billing writes additionally blocked by members_enforce_billing_trust_boundary.';

-- ---------------------------------------------------------------------------
-- 4) Privileges: remove broad PUBLIC/anon access; keep authenticated DML as needed.
-- ---------------------------------------------------------------------------
REVOKE ALL ON TABLE public.members FROM PUBLIC;
REVOKE ALL ON TABLE public.members FROM anon;
REVOKE ALL ON TABLE public.members FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.members TO authenticated;

COMMENT ON TABLE public.members IS 'One row per auth user (id). RLS owner policies + FORCE RLS; billing columns server-controlled via trigger + billing RPCs.';

-- ---------------------------------------------------------------------------
-- 5) Billing RPCs — unchanged logic; trigger permits writes under privileged owner.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.consume_one_document_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  rec_plan text;
  bal integer;
  new_bal integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  SELECT plan, doc_credits INTO rec_plan, bal
  FROM public.members
  WHERE id = uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'member_not_found' USING ERRCODE = 'P0002';
  END IF;

  bal := COALESCE(bal, 0);

  IF COALESCE(rec_plan, '') = 'pro' THEN
    INSERT INTO public.billing_audit_log (source, event_type, user_id, detail)
    VALUES ('consume_doc_credit', 'pro_skip', uid, jsonb_build_object('balance', bal));
    RETURN bal;
  END IF;

  IF bal <= 0 THEN
    INSERT INTO public.billing_audit_log (source, event_type, user_id, detail)
    VALUES ('consume_doc_credit', 'rejected_insufficient', uid, jsonb_build_object('balance', bal));
    RETURN -1;
  END IF;

  UPDATE public.members
  SET doc_credits = doc_credits - 1
  WHERE id = uid
  RETURNING doc_credits INTO new_bal;

  INSERT INTO public.billing_audit_log (source, event_type, user_id, detail)
  VALUES ('consume_doc_credit', 'debit', uid, jsonb_build_object('remaining', new_bal));

  RETURN new_bal;
END;
$$;

COMMENT ON FUNCTION public.consume_one_document_credit() IS 'Row-locked debit; pro returns balance without debit; -1 insufficient; audit rows; runs as definer so billing trigger allows doc_credits change.';

REVOKE ALL ON FUNCTION public.consume_one_document_credit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_one_document_credit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_one_document_credit() TO service_role;

CREATE OR REPLACE FUNCTION public.apply_stripe_checkout_entitlements(
  p_event_id text,
  p_user_id uuid,
  p_customer_email text,
  p_credit_add integer,
  p_plan_set text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  dup boolean := false;
BEGIN
  IF p_event_id IS NULL OR length(trim(p_event_id)) < 10 OR p_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'invalid_args');
  END IF;

  BEGIN
    INSERT INTO public.stripe_processed_events (event_id) VALUES (trim(p_event_id));
  EXCEPTION
    WHEN unique_violation THEN
      dup := true;
  END;

  IF dup THEN
    RETURN jsonb_build_object('ok', false, 'duplicate', true);
  END IF;

  INSERT INTO public.members (id, email, plan, doc_credits)
  VALUES (
    p_user_id,
    NULLIF(trim(COALESCE(p_customer_email, '')), ''),
    COALESCE(NULLIF(trim(COALESCE(p_plan_set, '')), ''), 'free'),
    GREATEST(0, COALESCE(p_credit_add, 0))
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(NULLIF(EXCLUDED.email, ''), public.members.email),
    plan = CASE
      WHEN p_plan_set IS NOT NULL AND length(trim(p_plan_set)) > 0 THEN trim(p_plan_set)
      ELSE public.members.plan
    END,
    doc_credits = CASE
      WHEN COALESCE(p_credit_add, 0) > 0 THEN COALESCE(public.members.doc_credits, 0) + p_credit_add
      ELSE COALESCE(public.members.doc_credits, 0)
    END;

  INSERT INTO public.billing_audit_log (source, event_type, stripe_event_id, user_id, detail)
  VALUES (
    'stripe_webhook',
    'entitlement_applied',
    trim(p_event_id),
    p_user_id,
    jsonb_build_object(
      'credit_add', COALESCE(p_credit_add, 0),
      'plan_set', p_plan_set
    )
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_stripe_checkout_entitlements(text, uuid, text, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_stripe_checkout_entitlements(text, uuid, text, integer, text) TO service_role;

COMMENT ON FUNCTION public.apply_stripe_checkout_entitlements IS 'Idempotent by event_id; rolls back claim if members update fails; service_role only; billing trigger allows writes under privileged definer.';
