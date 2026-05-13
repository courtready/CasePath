-- Atomic Stripe checkout apply: claim event + member update in one transaction
-- so a failed members write rolls back the claim and Stripe can retry.

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

COMMENT ON FUNCTION public.apply_stripe_checkout_entitlements IS 'Idempotent by event_id; rolls back claim if members update fails; service_role only.';
