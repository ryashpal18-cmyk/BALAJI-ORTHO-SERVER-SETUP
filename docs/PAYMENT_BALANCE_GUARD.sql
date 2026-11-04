-- Apply to an existing BJ OPD Server database after backup and staging verification.
-- Fresh provisioning includes this function in server-setup/schema.sql.
BEGIN;
CREATE OR REPLACE FUNCTION public.merge_bill_receipts()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE history jsonb; event jsonb; delta numeric; old_paid numeric; total numeric;
BEGIN
 IF TG_OP='INSERT' THEN
   IF NEW.payment_history IS NULL THEN
     NEW.payment_history := CASE WHEN NEW.amount_paid=0 THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object(
       'id',gen_random_uuid(),'amount',NEW.amount_paid,'paid_at',coalesce(NEW.created_at,now()),'payment_mode',coalesce(NEW.payment_mode,'Cash'))) END;
   END IF;
 ELSE
   old_paid := OLD.amount_paid;
   history := coalesce(OLD.payment_history, CASE WHEN old_paid=0 THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object(
     'id','legacy-'||OLD.id,'amount',old_paid,'paid_at',OLD.created_at,'payment_mode',coalesce(OLD.payment_mode,'Cash'),'legacy',true)) END);
   IF NEW.payment_history IS NOT DISTINCT FROM OLD.payment_history THEN
     delta := NEW.amount_paid-old_paid;
     IF delta<>0 THEN history:=history||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'amount',delta,'paid_at',now(),'payment_mode',coalesce(NEW.payment_mode,'Cash'))); END IF;
   ELSE
     IF jsonb_typeof(NEW.payment_history)<>'array' THEN RAISE EXCEPTION 'Invalid receipt ledger'; END IF;
     FOR event IN SELECT value FROM jsonb_array_elements(NEW.payment_history) LOOP
       IF NOT EXISTS (SELECT 1 FROM jsonb_array_elements(history) e WHERE e->>'id'=event->>'id') THEN
         history:=history||jsonb_build_array(event);
       END IF;
     END LOOP;
   END IF;
   NEW.payment_history:=history;
 END IF;
 IF jsonb_typeof(NEW.payment_history)<>'array' THEN RAISE EXCEPTION 'Invalid receipt ledger'; END IF;
 IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.payment_history) e WHERE e->>'id' IS NULL OR e->>'amount' IS NULL OR e->>'paid_at' IS NULL) THEN RAISE EXCEPTION 'Incomplete receipt'; END IF;
 SELECT coalesce(sum((e->>'amount')::numeric),0) INTO total FROM jsonb_array_elements(NEW.payment_history) e;
 IF total<0 OR total::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Invalid paid balance'; END IF;
 IF total > greatest(NEW.amount-coalesce(NEW.discount,0),0)
    AND (TG_OP='INSERT' OR total > OLD.amount_paid) THEN
   RAISE EXCEPTION 'Payment exceeds current bill balance' USING ERRCODE='23514';
 END IF;
 NEW.amount_paid:=total;
 NEW.status:=CASE WHEN total>=greatest(NEW.amount-coalesce(NEW.discount,0),0) THEN 'Paid' WHEN total>0 THEN 'Partial' ELSE 'Pending' END;
 RETURN NEW;
END $function$;

-- Allow the staff UI to read only its authorized clinic branch. Write grants remain admin-only.
DROP POLICY IF EXISTS bjopd_staff_read_patients ON public.patients;
CREATE POLICY bjopd_staff_read_patients ON public.patients FOR SELECT TO authenticated
  USING (public.can_use_pages(ARRAY['/dashboard','/opd','/appointments','/billing','/due-amount','/ortho','/reports','/physiotherapy','/prescription','/patient-medicine','/whatsapp','/insurance-claims','/booking-requests']) AND public.can_use_branch(branch_id));

DROP POLICY IF EXISTS bjopd_staff_read_billing ON public.billing;
CREATE POLICY bjopd_staff_read_billing ON public.billing FOR SELECT TO authenticated
  USING (public.can_use_pages(ARRAY['/dashboard','/billing','/due-amount','/cash-tally','/daily-cash-book','/analytics','/revenue-dashboard','/medicine-commission']) AND public.can_use_branch(branch_id));

DROP POLICY IF EXISTS bjopd_staff_read_branches ON public.branches;
CREATE POLICY bjopd_staff_read_branches ON public.branches FOR SELECT TO authenticated
  USING (public.can_use_pages(ARRAY['*']) AND public.can_use_branch(id));

COMMIT;
