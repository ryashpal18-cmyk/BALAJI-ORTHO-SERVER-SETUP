-- Existing BJ OPD Server: apply CLINIC_PROFILE_SYNC.sql first.
BEGIN;
ALTER TABLE public.bjopd_clinic_profile
  ADD COLUMN IF NOT EXISTS registration_prefix text NOT NULL DEFAULT 'BAOR' CHECK (registration_prefix ~ '^[A-Z]{2,12}$'),
  ADD COLUMN IF NOT EXISTS invoice_prefix text NOT NULL DEFAULT 'INV' CHECK (invoice_prefix ~ '^[A-Z]{2,12}$');
ALTER TABLE public.billing ADD COLUMN IF NOT EXISTS invoice_number text
  CHECK (invoice_number ~ '^[A-Z]{2,12}-[0-9A-F-]{36}$');
CREATE UNIQUE INDEX IF NOT EXISTS billing_invoice_number_unique ON public.billing(invoice_number) WHERE invoice_number IS NOT NULL;
CREATE OR REPLACE FUNCTION public.keep_billing_invoice_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.invoice_number IS DISTINCT FROM NEW.invoice_number THEN
    RAISE EXCEPTION 'Invoice number is permanent';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.keep_billing_invoice_number() FROM PUBLIC;
DROP TRIGGER IF EXISTS keep_billing_invoice_number ON public.billing;
CREATE TRIGGER keep_billing_invoice_number BEFORE UPDATE OF invoice_number ON public.billing
  FOR EACH ROW EXECUTE FUNCTION public.keep_billing_invoice_number();
CREATE OR REPLACE FUNCTION public.assign_patient_registration()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE n bigint;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.registration_number IS NOT NULL THEN
    IF NEW.registration_number IS DISTINCT FROM OLD.registration_number THEN
      RAISE EXCEPTION 'Patient registration number is permanent';
    END IF;
    RETURN NEW;
  END IF;
  -- Serialize server allocations and advancement for numbers allocated offline.
  PERFORM pg_advisory_xact_lock(821734, 1);
  IF NEW.registration_number IS NULL THEN
    n := nextval('public.patient_registration_seq'::regclass);
    NEW.registration_number := coalesce((SELECT registration_prefix FROM public.bjopd_clinic_profile WHERE id), 'BAOR') || lpad(n::text, greatest(4, length(n::text)), '0');
  ELSIF NEW.registration_number !~ '^[A-Z]{2,12}[0-9]{4,16}$' THEN
    RAISE EXCEPTION 'Invalid registration number';
  ELSE
    n := substring(NEW.registration_number FROM '[0-9]+$')::bigint;
    IF n < 1 THEN RAISE EXCEPTION 'Invalid registration serial'; END IF;
    PERFORM setval('public.patient_registration_seq'::regclass, greatest(n,
      (SELECT last_value FROM public.patient_registration_seq)), true);
  END IF;
  RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public."assign_patient_registration"() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_patient_registration_numbers(p_request uuid, p_device uuid, p_count integer DEFAULT 32, p_floor bigint DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE reserved jsonb; existing_device uuid; i integer; n bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Clinic administrator required'; END IF;
  IF p_request IS NULL OR p_device IS NULL OR p_count NOT BETWEEN 1 AND 100 OR p_floor NOT BETWEEN 0 AND 9007199254740000 THEN
    RAISE EXCEPTION 'Invalid registration reservation';
  END IF;
  PERFORM pg_advisory_xact_lock(821734, 1);
  SELECT numbers, device_id INTO reserved, existing_device FROM public.patient_registration_leases
    WHERE request_id = p_request AND user_id = auth.uid();
  IF reserved IS NOT NULL THEN
    IF existing_device <> p_device THEN RAISE EXCEPTION 'Reservation belongs to another device'; END IF;
    RETURN jsonb_build_object('request_id', p_request, 'numbers', reserved);
  END IF;
  IF p_floor > (SELECT CASE WHEN is_called THEN last_value ELSE 0 END FROM public.patient_registration_seq) THEN
    PERFORM setval('public.patient_registration_seq', p_floor, true);
  END IF;
  reserved := '[]'::jsonb;
  FOR i IN 1..p_count LOOP
    n := nextval('public.patient_registration_seq');
    reserved := reserved || jsonb_build_array(coalesce((SELECT registration_prefix FROM public.bjopd_clinic_profile WHERE id), 'BAOR') || lpad(n::text, greatest(4, length(n::text)), '0'));
  END LOOP;
  INSERT INTO public.patient_registration_leases(request_id, user_id, device_id, numbers)
    VALUES (p_request, auth.uid(), p_device, reserved);
  RETURN jsonb_build_object('request_id', p_request, 'numbers', reserved);
END $function$;

NOTIFY pgrst, 'reload schema';
COMMIT;
