-- Phase 3.2 — Stripe webhook idempotency + billing audit + atomic credit consumption
-- Apply via Supabase SQL editor or `supabase db push`.

-- 1) Webhook idempotency (replay protection)
CREATE TABLE IF NOT EXISTS public.stripe_processed_events (
  event_id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_processed_events ENABLE ROW LEVEL SECURITY;

-- No client access; service role bypasses RLS.
CREATE POLICY "stripe_processed_events_no_client"
  ON public.stripe_processed_events
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.stripe_processed_events IS 'Stripe webhook event.id dedupe; written only from trusted server (Edge/service role).';

-- 2) Billing audit trail
CREATE TABLE IF NOT EXISTS public.billing_audit_log (
  id bigserial PRIMARY KEY,
  source text NOT NULL,
  event_type text,
  stripe_event_id text,
  user_id uuid,
  detail jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS billing_audit_log_created_at_idx ON public.billing_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS billing_audit_log_stripe_event_idx ON public.billing_audit_log (stripe_event_id);

ALTER TABLE public.billing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_audit_log_no_client"
  ON public.billing_audit_log
  FOR ALL
  USING (false)
  WITH CHECK (false);

COMMENT ON TABLE public.billing_audit_log IS 'Billing / webhook / credit audit; server inserts only.';

-- 3) Claim Stripe event atomically (service role only)
CREATE OR REPLACE FUNCTION public.claim_stripe_event(p_event_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_event_id IS NULL OR length(trim(p_event_id)) < 10 THEN
    RETURN false;
  END IF;
  INSERT INTO public.stripe_processed_events (event_id) VALUES (trim(p_event_id));
  RETURN true;
EXCEPTION
  WHEN unique_violation THEN
    RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_stripe_event(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_stripe_event(text) TO service_role;

COMMENT ON FUNCTION public.claim_stripe_event(text) IS 'Returns true if this Stripe event_id was newly claimed; false if duplicate.';

-- 4) Atomic single credit consumption (authenticated user, own row only)
CREATE OR REPLACE FUNCTION public.consume_one_document_credit()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  new_bal integer;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  UPDATE public.members
  SET doc_credits = doc_credits - 1
  WHERE id = uid
    AND COALESCE(plan, '') <> 'pro'
    AND COALESCE(doc_credits, 0) > 0
  RETURNING doc_credits INTO new_bal;

  IF new_bal IS NULL THEN
    RETURN -1;
  END IF;
  RETURN new_bal;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_one_document_credit() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_one_document_credit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.consume_one_document_credit() TO service_role;

COMMENT ON FUNCTION public.consume_one_document_credit() IS 'Decrements doc_credits by 1 for caller; returns new balance or -1 if no debit applied.';
