-- Phase 3.2 — Authoritative credit debit: pro no-op, row lock, billing audit on debit/reject.

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

COMMENT ON FUNCTION public.consume_one_document_credit() IS 'Row-locked debit; pro returns balance without debit; -1 insufficient; audit rows for debit/reject/pro_skip.';
