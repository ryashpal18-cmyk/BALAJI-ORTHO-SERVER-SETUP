BEGIN;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_tables WHERE schemaname='public') THEN RAISE EXCEPTION 'Target public schema is not empty'; END IF; END $$;

CREATE TYPE public."app_role" AS ENUM ('admin', 'doctor', 'staff', 'patient');

CREATE SEQUENCE public."patient_registration_seq" AS bigint INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1 NO CYCLE;

CREATE TABLE public."appointments" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid NOT NULL,
"doctor_name" text DEFAULT NULL::text,
"date" date NOT NULL,
"time_slot" text,
"status" text DEFAULT 'Scheduled'::text NOT NULL,
"notes" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
"branch_id" uuid
);

ALTER TABLE public."appointments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."appointments" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."audit_logs" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"actor_name" text NOT NULL,
"actor_role" text,
"action" text NOT NULL,
"module" text NOT NULL,
"record_id" text,
"description" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"actor_user_id" uuid
);

ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."audit_logs" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."beds" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"bed_number" text NOT NULL,
"bed_type" text NOT NULL,
"status" text DEFAULT 'available'::text NOT NULL,
"patient_id" uuid,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."beds" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."beds" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."billing" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid NOT NULL,
"service" text NOT NULL,
"amount" numeric(10,2) DEFAULT 0 NOT NULL,
"status" text DEFAULT 'Pending'::text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
"invoice_pdf_url" text,
"amount_paid" numeric DEFAULT 0 NOT NULL,
"payment_mode" text,
"discount" numeric DEFAULT 0,
"next_followup" text,
"followup_days" integer DEFAULT 0,
"notes" text,
"branch_id" uuid,
"payment_history" jsonb,
"doctor_id" uuid,
"doctor_name" text,
"doctor_commission_percent" numeric
);

ALTER TABLE public."billing" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."billing" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."booking_requests" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_name" text NOT NULL,
"mobile" text NOT NULL,
"preferred_date" date NOT NULL,
"preferred_time" text,
"reason" text,
"status" text DEFAULT 'Pending'::text NOT NULL,
"branch_id" uuid,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."booking_requests" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."booking_requests" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."branches" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"name" text NOT NULL,
"address" text,
"phone" text,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."branches" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."branches" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."cash_book_days" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"entry_date" date NOT NULL,
"physical_cash" numeric,
"calculated_closing" numeric,
"difference" numeric,
"remarks" text,
"status" text DEFAULT 'open'::text NOT NULL,
"closed_by" text,
"closed_at" timestamp with time zone,
"reopened_by" text,
"reopened_at" timestamp with time zone,
"reopen_reason" text,
"reopen_count" integer DEFAULT 0 NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."cash_book_days" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."cash_book_days" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."cash_book_entries" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"entry_date" date DEFAULT CURRENT_DATE NOT NULL,
"entry_type" text NOT NULL,
"amount" numeric DEFAULT 0 NOT NULL,
"party_name" text,
"bank_name" text,
"note" text,
"created_by" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."cash_book_entries" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."cash_book_entries" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."deleted_records_log" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"table_name" text NOT NULL,
"record_id" uuid NOT NULL,
"record_data" jsonb NOT NULL,
"deleted_by" uuid NOT NULL,
"deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."deleted_records_log" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."deleted_records_log" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."doctors" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"name" text NOT NULL,
"mobile" text,
"speciality" text,
"commission_percent" numeric DEFAULT 20 NOT NULL,
"is_active" boolean DEFAULT true NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."doctors" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."doctors" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."fracture_cases" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid NOT NULL,
"patient_type" text DEFAULT 'fracture'::text NOT NULL,
"body_part" text,
"side" text,
"fracture_type" text,
"cause" text,
"plaster_type" text,
"plaster_date" date DEFAULT CURRENT_DATE,
"followup_days" integer DEFAULT 7 NOT NULL,
"next_followup_date" date,
"plaster_status" text DEFAULT 'Active'::text NOT NULL,
"hospital_name" text,
"doctor_name" text,
"referral_reason" text,
"doctor_notes" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."fracture_cases" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."fracture_cases" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."fracture_xrays" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"fracture_case_id" uuid NOT NULL,
"patient_id" uuid NOT NULL,
"file_url" text NOT NULL,
"image_date" date DEFAULT CURRENT_DATE NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."fracture_xrays" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."fracture_xrays" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."hospitals" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"name" text NOT NULL,
"doctor_name" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."hospitals" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."hospitals" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."insurance_claims" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid,
"patient_name" text NOT NULL,
"billing_id" uuid,
"tpa_name" text NOT NULL,
"policy_number" text,
"claim_amount" numeric DEFAULT 0 NOT NULL,
"approved_amount" numeric,
"status" text DEFAULT 'Submitted'::text NOT NULL,
"submitted_date" date DEFAULT CURRENT_DATE NOT NULL,
"settled_date" date,
"rejection_reason" text,
"notes" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."insurance_claims" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."insurance_claims" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."invoice_medicine_mapping" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"entry_id" uuid,
"medicine_id" text NOT NULL,
"medicine_name" text NOT NULL,
"rate" numeric(10,2) NOT NULL,
"created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE public."invoice_medicine_mapping" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."invoice_medicine_mapping" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."medical_history" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid NOT NULL,
"notes" text,
"visit_date" date DEFAULT CURRENT_DATE NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."medical_history" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."medical_history" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."medicine_entries" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"invoice_no" text NOT NULL,
"patient_name" text NOT NULL,
"total_amount" numeric(10,2) DEFAULT 0,
"commission" numeric(10,2) DEFAULT 0,
"date" date DEFAULT CURRENT_DATE,
"created_at" timestamp with time zone DEFAULT now()
);

ALTER TABLE public."medicine_entries" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."medicine_entries" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."medicines" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"name" text NOT NULL,
"rate" numeric(10,2) NOT NULL,
"created_at" timestamp with time zone DEFAULT now(),
"stock_quantity" numeric DEFAULT 0 NOT NULL,
"low_stock_threshold" numeric DEFAULT 10 NOT NULL,
"unit" text DEFAULT 'pcs'::text NOT NULL
);

ALTER TABLE public."medicines" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."medicines" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."patient_medicines" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid NOT NULL,
"medicine_id" uuid,
"medicine_name" text,
"dosage" text,
"duration" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."patient_medicines" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."patient_medicines" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."patient_registration_leases" (
"request_id" uuid NOT NULL,
"user_id" uuid DEFAULT auth.uid() NOT NULL,
"device_id" uuid NOT NULL,
"numbers" jsonb NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."patient_registration_leases" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."patient_registration_leases" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."patients" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"name" text NOT NULL,
"age" integer,
"gender" text,
"mobile" text,
"address" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
"branch_id" uuid,
"registration_number" text NOT NULL
);

ALTER TABLE public."patients" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."patients" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."payments" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"billing_id" uuid NOT NULL,
"amount_paid" numeric(10,2) NOT NULL,
"payment_date" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."payments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."payments" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."physiotherapy_sessions" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid NOT NULL,
"exercise_plan" text,
"session_number" integer DEFAULT 1 NOT NULL,
"total_sessions" integer DEFAULT 10 NOT NULL,
"pain_scale" integer,
"progress_notes" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL,
"fracture_case_id" uuid
);

ALTER TABLE public."physiotherapy_sessions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."physiotherapy_sessions" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."prescriptions" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid NOT NULL,
"diagnosis" text,
"medicines" text,
"advice" text,
"followup_date" date,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."prescriptions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."prescriptions" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."report_payments" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_name" text DEFAULT 'Unknown'::text NOT NULL,
"amount" numeric DEFAULT 50 NOT NULL,
"transaction_id" text,
"payment_date" date DEFAULT CURRENT_DATE NOT NULL,
"payment_time" text,
"upi_id" text,
"status" text DEFAULT 'paid'::text NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."report_payments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."report_payments" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."sms_logs" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_name" text,
"mobile" text,
"message" text,
"status" text DEFAULT 'pending'::text NOT NULL,
"sms_type" text DEFAULT 'general'::text,
"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."sms_logs" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."sms_logs" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."staff_access" (
"user_id" uuid NOT NULL,
"display_name" text NOT NULL,
"allowed_pages" text[] DEFAULT '{}'::text[] NOT NULL,
"allowed_branches" uuid[],
"enabled" boolean DEFAULT true NOT NULL
);

ALTER TABLE public."staff_access" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."staff_access" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."stock_movements" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"medicine_id" uuid,
"medicine_name" text NOT NULL,
"change_qty" numeric NOT NULL,
"reason" text DEFAULT 'manual'::text NOT NULL,
"note" text,
"created_by" text,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."stock_movements" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."stock_movements" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."user_roles" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"user_id" uuid NOT NULL,
"role" app_role NOT NULL
);

ALTER TABLE public."user_roles" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."user_roles" FROM PUBLIC, anon, authenticated;

CREATE TABLE public."xray_reports" (
"id" uuid DEFAULT gen_random_uuid() NOT NULL,
"patient_id" uuid NOT NULL,
"file_url" text,
"report_type" text DEFAULT 'X-Ray'::text,
"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
"notes" text,
"report_data" text,
"label" text
);

ALTER TABLE public."xray_reports" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public."xray_reports" FROM PUBLIC, anon, authenticated;

ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY (id);

ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE (user_id, role);

ALTER TABLE public."patients" ADD CONSTRAINT "patients_pkey" PRIMARY KEY (id);

ALTER TABLE public."appointments" ADD CONSTRAINT "appointments_status_check" CHECK (status = ANY (ARRAY['Scheduled'::text, 'Completed'::text, 'Cancelled'::text]));

ALTER TABLE public."appointments" ADD CONSTRAINT "appointments_pkey" PRIMARY KEY (id);

ALTER TABLE public."prescriptions" ADD CONSTRAINT "prescriptions_pkey" PRIMARY KEY (id);

ALTER TABLE public."medical_history" ADD CONSTRAINT "medical_history_pkey" PRIMARY KEY (id);

ALTER TABLE public."billing" ADD CONSTRAINT "billing_status_check" CHECK (status = ANY (ARRAY['Pending'::text, 'Paid'::text, 'Partial'::text]));

ALTER TABLE public."billing" ADD CONSTRAINT "billing_pkey" PRIMARY KEY (id);

ALTER TABLE public."payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY (id);

ALTER TABLE public."xray_reports" ADD CONSTRAINT "xray_reports_pkey" PRIMARY KEY (id);

ALTER TABLE public."physiotherapy_sessions" ADD CONSTRAINT "physiotherapy_sessions_pain_scale_check" CHECK (pain_scale >= 0 AND pain_scale <= 10);

ALTER TABLE public."physiotherapy_sessions" ADD CONSTRAINT "physiotherapy_sessions_pkey" PRIMARY KEY (id);

ALTER TABLE public."beds" ADD CONSTRAINT "beds_bed_type_check" CHECK (bed_type = ANY (ARRAY['Ward'::text, 'Semi-Private'::text, 'Private'::text]));

ALTER TABLE public."beds" ADD CONSTRAINT "beds_status_check" CHECK (status = ANY (ARRAY['available'::text, 'occupied'::text, 'reserved'::text]));

ALTER TABLE public."beds" ADD CONSTRAINT "beds_pkey" PRIMARY KEY (id);

ALTER TABLE public."beds" ADD CONSTRAINT "beds_bed_number_key" UNIQUE (bed_number);

ALTER TABLE public."deleted_records_log" ADD CONSTRAINT "deleted_records_log_pkey" PRIMARY KEY (id);

ALTER TABLE public."fracture_cases" ADD CONSTRAINT "fracture_cases_pkey" PRIMARY KEY (id);

ALTER TABLE public."fracture_xrays" ADD CONSTRAINT "fracture_xrays_pkey" PRIMARY KEY (id);

ALTER TABLE public."hospitals" ADD CONSTRAINT "hospitals_pkey" PRIMARY KEY (id);

ALTER TABLE public."hospitals" ADD CONSTRAINT "hospitals_name_key" UNIQUE (name);

ALTER TABLE public."medicine_entries" ADD CONSTRAINT "medicine_entries_pkey" PRIMARY KEY (id);

ALTER TABLE public."invoice_medicine_mapping" ADD CONSTRAINT "invoice_medicine_mapping_pkey" PRIMARY KEY (id);

ALTER TABLE public."medicines" ADD CONSTRAINT "medicines_pkey" PRIMARY KEY (id);

ALTER TABLE public."sms_logs" ADD CONSTRAINT "sms_logs_status_check" CHECK (status = ANY (ARRAY['sent'::text, 'pending'::text, 'failed'::text]));

ALTER TABLE public."sms_logs" ADD CONSTRAINT "sms_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."stock_movements" ADD CONSTRAINT "stock_movements_pkey" PRIMARY KEY (id);

ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (id);

ALTER TABLE public."insurance_claims" ADD CONSTRAINT "insurance_claims_pkey" PRIMARY KEY (id);

ALTER TABLE public."branches" ADD CONSTRAINT "branches_pkey" PRIMARY KEY (id);

ALTER TABLE public."booking_requests" ADD CONSTRAINT "booking_requests_pkey" PRIMARY KEY (id);

ALTER TABLE public."cash_book_entries" ADD CONSTRAINT "cash_book_entries_entry_type_check" CHECK (entry_type = ANY (ARRAY['opening'::text, 'cash_in'::text, 'upi_in'::text, 'bank_deposit'::text, 'home_given'::text, 'expense'::text]));

ALTER TABLE public."cash_book_entries" ADD CONSTRAINT "cash_book_entries_pkey" PRIMARY KEY (id);

ALTER TABLE public."staff_access" ADD CONSTRAINT "staff_access_pkey" PRIMARY KEY (user_id);

ALTER TABLE public."doctors" ADD CONSTRAINT "doctors_commission_percent_check" CHECK (commission_percent >= 0::numeric AND commission_percent <= 100::numeric);

ALTER TABLE public."doctors" ADD CONSTRAINT "doctors_pkey" PRIMARY KEY (id);

ALTER TABLE public."patient_registration_leases" ADD CONSTRAINT "patient_registration_leases_pkey" PRIMARY KEY (request_id);

ALTER TABLE public."report_payments" ADD CONSTRAINT "report_payments_pkey" PRIMARY KEY (id);

ALTER TABLE public."patient_medicines" ADD CONSTRAINT "patient_medicines_pkey" PRIMARY KEY (id);

ALTER TABLE public."cash_book_days" ADD CONSTRAINT "cash_book_days_status_check" CHECK (status = ANY (ARRAY['open'::text, 'closed'::text]));

ALTER TABLE public."cash_book_days" ADD CONSTRAINT "cash_book_days_pkey" PRIMARY KEY (id);

ALTER TABLE public."cash_book_days" ADD CONSTRAINT "cash_book_days_entry_date_key" UNIQUE (entry_date);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;

REVOKE ALL ON FUNCTION public."has_role"(_user_id uuid, _role app_role) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('admin', 'doctor', 'staff')
  )
$function$;

REVOKE ALL ON FUNCTION public."is_staff"(_user_id uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_use_pages(p_pages text[])
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
   SELECT 1 FROM public.staff_access WHERE user_id=auth.uid() AND enabled
   AND public.has_role(auth.uid(), 'staff') AND ('*'=ANY(p_pages) OR allowed_pages && p_pages)
 ); $function$;

REVOKE ALL ON FUNCTION public."can_use_pages"(p_pages text[]) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.can_use_branch(p_branch uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 SELECT public.has_role(auth.uid(), 'admin') OR EXISTS (
   SELECT 1 FROM public.staff_access WHERE user_id=auth.uid() AND enabled
   AND (allowed_branches IS NULL OR p_branch=ANY(allowed_branches))
 ); $function$;

REVOKE ALL ON FUNCTION public."can_use_branch"(p_branch uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public."update_updated_at_column"() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.adjust_stock_atomic(p_id uuid, p_medicine uuid, p_qty numeric, p_reason text DEFAULT 'manual'::text, p_note text DEFAULT NULL::text, p_actor text DEFAULT NULL::text)
 RETURNS medicines
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE med public.medicines; previous public.stock_movements;
BEGIN
 IF NOT public.can_use_pages(ARRAY['/inventory']) THEN RAISE EXCEPTION 'Inventory permission required'; END IF;
 SELECT * INTO med FROM public.medicines WHERE id=p_medicine FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Medicine not found'; END IF;
 SELECT * INTO previous FROM public.stock_movements WHERE id=p_id;
 IF FOUND THEN
   IF previous.medicine_id IS DISTINCT FROM p_medicine OR previous.change_qty IS DISTINCT FROM p_qty THEN RAISE EXCEPTION 'Conflicting adjustment ID'; END IF;
   RETURN med; -- response lost / retry: no duplicate deduction
 END IF;
 IF p_qty IS NULL OR p_qty=0 OR p_qty::text IN ('NaN','Infinity','-Infinity') OR med.stock_quantity+p_qty<0 THEN RAISE EXCEPTION 'Insufficient stock or invalid quantity'; END IF;
 UPDATE public.medicines SET stock_quantity=stock_quantity+p_qty WHERE id=p_medicine RETURNING * INTO med;
 INSERT INTO public.stock_movements(id,medicine_id,medicine_name,change_qty,reason,note,created_by)
 VALUES(p_id,p_medicine,med.name,p_qty,coalesce(p_reason,'manual'),p_note,coalesce(p_actor,auth.uid()::text));
 RETURN med;
END $function$;

REVOKE ALL ON FUNCTION public."adjust_stock_atomic"(p_id uuid, p_medicine uuid, p_qty numeric, p_reason text, p_note text, p_actor text) FROM PUBLIC, anon, authenticated;

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

REVOKE ALL ON FUNCTION public."merge_bill_receipts"() FROM PUBLIC, anon, authenticated;

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
    NEW.registration_number := 'BAOR' || lpad(n::text, greatest(4, length(n::text)), '0');
  ELSIF NEW.registration_number !~ '^BAOR[0-9]{4,}$' THEN
    RAISE EXCEPTION 'Invalid registration number';
  ELSE
    n := substring(NEW.registration_number FROM 5)::bigint;
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
    reserved := reserved || jsonb_build_array('BAOR' || lpad(n::text, greatest(4, length(n::text)), '0'));
  END LOOP;
  INSERT INTO public.patient_registration_leases(request_id, user_id, device_id, numbers)
    VALUES (p_request, auth.uid(), p_device, reserved);
  RETURN jsonb_build_object('request_id', p_request, 'numbers', reserved);
END $function$;

REVOKE ALL ON FUNCTION public."reserve_patient_registration_numbers"(p_request uuid, p_device uuid, p_count integer, p_floor bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.append_audit_event(p_id uuid, p_event jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  DECLARE owner_id uuid;
  BEGIN
   IF auth.uid() IS NULL OR NOT coalesce(public.has_role(auth.uid(),'admin'),false) THEN
    RAISE EXCEPTION 'Cloud administrator required' USING ERRCODE='42501';
   END IF;
   IF p_id IS NULL OR nullif(p_event->>'action','') IS NULL OR nullif(p_event->>'module','') IS NULL THEN
    RAISE EXCEPTION 'Invalid audit event';
   END IF;
   INSERT INTO public.audit_logs(id,actor_user_id,actor_name,actor_role,action,module,record_id,description)
   VALUES(p_id,auth.uid(),auth.uid()::text,'admin',p_event->>'action',p_event->>'module',p_event->>'record_id',p_event->>'description')
   ON CONFLICT(id) DO NOTHING;
   SELECT actor_user_id INTO owner_id FROM public.audit_logs WHERE id=p_id;
   IF owner_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Audit identity conflict'; END IF;
   RETURN true;
  END $function$;

REVOKE ALL ON FUNCTION public."append_audit_event"(p_id uuid, p_event jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_repair_guard_cash_day()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Cloud administrator required' USING ERRCODE='42501';
  END IF;
  PERFORM pg_advisory_xact_lock(6100618);
  IF TG_OP='UPDATE' AND OLD.status='closed' THEN
    IF NEW.status='closed' AND
       (NEW.physical_cash,NEW.calculated_closing,NEW.difference,NEW.remarks)
       IS NOT DISTINCT FROM (OLD.physical_cash,OLD.calculated_closing,OLD.difference,OLD.remarks) THEN RETURN OLD; END IF;
    IF NEW.status<>'open' OR nullif(trim(NEW.reopen_reason),'') IS NULL THEN
      RAISE EXCEPTION 'Reopen the closed day with a reason before changing it';
    END IF;
    NEW.reopened_by:=auth.uid()::text; NEW.reopened_at:=now(); NEW.reopen_count:=OLD.reopen_count+1;
  END IF;
  IF TG_OP='INSERT' AND NEW.status='closed' THEN
    NEW.closed_by:=auth.uid()::text; NEW.closed_at:=now();
  ELSIF TG_OP='UPDATE' AND OLD.status<>'closed' AND NEW.status='closed' THEN
    NEW.closed_by:=auth.uid()::text; NEW.closed_at:=now();
  END IF;
  NEW.updated_at:=now(); RETURN NEW;
END $function$;

REVOKE ALL ON FUNCTION public."sync_repair_guard_cash_day"() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.save_cash_day(p_id uuid, p_event jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
  DECLARE saved public.cash_book_days;
  BEGIN
    IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Cloud administrator required' USING ERRCODE='42501'; END IF;
    INSERT INTO public.cash_book_days(id,entry_date,status,physical_cash,calculated_closing,difference,remarks,reopen_reason)
    VALUES(p_id,(p_event->>'entry_date')::date,coalesce(p_event->>'status','open'),(p_event->>'physical_cash')::numeric,
      (p_event->>'calculated_closing')::numeric,(p_event->>'difference')::numeric,p_event->>'remarks',p_event->>'reopen_reason')
    ON CONFLICT(entry_date) DO UPDATE SET status=EXCLUDED.status,
      physical_cash=coalesce(EXCLUDED.physical_cash,cash_book_days.physical_cash),
      calculated_closing=coalesce(EXCLUDED.calculated_closing,cash_book_days.calculated_closing),
      difference=coalesce(EXCLUDED.difference,cash_book_days.difference),
      remarks=coalesce(EXCLUDED.remarks,cash_book_days.remarks),reopen_reason=EXCLUDED.reopen_reason
    RETURNING * INTO saved;
    RETURN to_jsonb(saved);
  END $function$;

REVOKE ALL ON FUNCTION public."save_cash_day"(p_id uuid, p_event jsonb) FROM PUBLIC, anon, authenticated;

CREATE POLICY clinic_admin_access ON public."doctors" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."doctors" TO authenticated;

GRANT ALL ON public."doctors" TO service_role;

CREATE POLICY clinic_admin_access ON public."deleted_records_log" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT ON public."deleted_records_log" TO authenticated;

GRANT ALL ON public."deleted_records_log" TO service_role;

CREATE POLICY clinic_admin_access ON public."billing" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."billing" TO authenticated;

GRANT ALL ON public."billing" TO service_role;

CREATE POLICY clinic_admin_access ON public."invoice_medicine_mapping" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."invoice_medicine_mapping" TO authenticated;

GRANT ALL ON public."invoice_medicine_mapping" TO service_role;

CREATE POLICY clinic_admin_access ON public."medicine_entries" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."medicine_entries" TO authenticated;

GRANT ALL ON public."medicine_entries" TO service_role;

CREATE POLICY clinic_admin_access ON public."patient_registration_leases" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."patient_registration_leases" TO authenticated;

GRANT ALL ON public."patient_registration_leases" TO service_role;

CREATE POLICY clinic_admin_access ON public."report_payments" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."report_payments" TO authenticated;

GRANT ALL ON public."report_payments" TO service_role;

CREATE POLICY clinic_admin_access ON public."beds" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."beds" TO authenticated;

GRANT ALL ON public."beds" TO service_role;

CREATE POLICY clinic_admin_access ON public."patient_medicines" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."patient_medicines" TO authenticated;

GRANT ALL ON public."patient_medicines" TO service_role;

CREATE POLICY clinic_admin_access ON public."patients" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."patients" TO authenticated;

GRANT ALL ON public."patients" TO service_role;

CREATE POLICY clinic_admin_access ON public."cash_book_days" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."cash_book_days" TO authenticated;

GRANT ALL ON public."cash_book_days" TO service_role;

CREATE POLICY clinic_admin_access ON public."user_roles" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."user_roles" TO authenticated;

GRANT ALL ON public."user_roles" TO service_role;

CREATE POLICY clinic_admin_access ON public."prescriptions" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."prescriptions" TO authenticated;

GRANT ALL ON public."prescriptions" TO service_role;

CREATE POLICY clinic_admin_access ON public."medical_history" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."medical_history" TO authenticated;

GRANT ALL ON public."medical_history" TO service_role;

CREATE POLICY clinic_admin_access ON public."appointments" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."appointments" TO authenticated;

GRANT ALL ON public."appointments" TO service_role;

CREATE POLICY clinic_admin_access ON public."payments" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."payments" TO authenticated;

GRANT ALL ON public."payments" TO service_role;

CREATE POLICY clinic_admin_access ON public."xray_reports" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."xray_reports" TO authenticated;

GRANT ALL ON public."xray_reports" TO service_role;

CREATE POLICY clinic_admin_access ON public."physiotherapy_sessions" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."physiotherapy_sessions" TO authenticated;

GRANT ALL ON public."physiotherapy_sessions" TO service_role;

CREATE POLICY clinic_admin_access ON public."fracture_xrays" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."fracture_xrays" TO authenticated;

GRANT ALL ON public."fracture_xrays" TO service_role;

CREATE POLICY clinic_admin_access ON public."fracture_cases" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."fracture_cases" TO authenticated;

GRANT ALL ON public."fracture_cases" TO service_role;

CREATE POLICY clinic_admin_access ON public."hospitals" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."hospitals" TO authenticated;

GRANT ALL ON public."hospitals" TO service_role;

CREATE POLICY clinic_admin_access ON public."stock_movements" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."stock_movements" TO authenticated;

GRANT ALL ON public."stock_movements" TO service_role;

CREATE POLICY clinic_admin_access ON public."audit_logs" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT ON public."audit_logs" TO authenticated;

GRANT ALL ON public."audit_logs" TO service_role;

CREATE POLICY clinic_admin_access ON public."sms_logs" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."sms_logs" TO authenticated;

GRANT ALL ON public."sms_logs" TO service_role;

CREATE POLICY clinic_admin_access ON public."branches" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."branches" TO authenticated;

GRANT ALL ON public."branches" TO service_role;

CREATE POLICY clinic_admin_access ON public."cash_book_entries" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."cash_book_entries" TO authenticated;

GRANT ALL ON public."cash_book_entries" TO service_role;

CREATE POLICY clinic_admin_access ON public."medicines" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."medicines" TO authenticated;

GRANT ALL ON public."medicines" TO service_role;

CREATE POLICY clinic_admin_access ON public."insurance_claims" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."insurance_claims" TO authenticated;

GRANT ALL ON public."insurance_claims" TO service_role;

CREATE POLICY clinic_admin_access ON public."booking_requests" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."booking_requests" TO authenticated;

GRANT ALL ON public."booking_requests" TO service_role;

CREATE POLICY clinic_admin_access ON public."staff_access" FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public."staff_access" TO authenticated;

GRANT ALL ON public."staff_access" TO service_role;

GRANT EXECUTE ON FUNCTION public."can_use_pages"(p_pages text[]) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."can_use_branch"(p_branch uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."has_role"(_user_id uuid, _role app_role) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."is_staff"(_user_id uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."adjust_stock_atomic"(p_id uuid, p_medicine uuid, p_qty numeric, p_reason text, p_note text, p_actor text) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."reserve_patient_registration_numbers"(p_request uuid, p_device uuid, p_count integer, p_floor bigint) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."append_audit_event"(p_id uuid, p_event jsonb) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."save_cash_day"(p_id uuid, p_event jsonb) TO authenticated, service_role;

GRANT USAGE ON SCHEMA public TO authenticated, service_role;

GRANT USAGE, SELECT, UPDATE ON SEQUENCE public.patient_registration_seq TO authenticated, service_role;

ALTER TABLE public."user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public."prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public."medical_history" ADD CONSTRAINT "medical_history_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public."billing" ADD CONSTRAINT "billing_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public."payments" ADD CONSTRAINT "payments_billing_id_fkey" FOREIGN KEY (billing_id) REFERENCES billing(id) ON DELETE CASCADE;

ALTER TABLE public."xray_reports" ADD CONSTRAINT "xray_reports_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public."physiotherapy_sessions" ADD CONSTRAINT "physiotherapy_sessions_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE;

ALTER TABLE public."beds" ADD CONSTRAINT "beds_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

ALTER TABLE public."invoice_medicine_mapping" ADD CONSTRAINT "invoice_medicine_mapping_entry_id_fkey" FOREIGN KEY (entry_id) REFERENCES medicine_entries(id) ON DELETE CASCADE;

ALTER TABLE public."stock_movements" ADD CONSTRAINT "stock_movements_medicine_id_fkey" FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL;

ALTER TABLE public."insurance_claims" ADD CONSTRAINT "insurance_claims_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL;

ALTER TABLE public."insurance_claims" ADD CONSTRAINT "insurance_claims_billing_id_fkey" FOREIGN KEY (billing_id) REFERENCES billing(id) ON DELETE SET NULL;

ALTER TABLE public."patients" ADD CONSTRAINT "patients_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES branches(id);

ALTER TABLE public."appointments" ADD CONSTRAINT "appointments_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES branches(id);

ALTER TABLE public."billing" ADD CONSTRAINT "billing_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES branches(id);

ALTER TABLE public."booking_requests" ADD CONSTRAINT "booking_requests_branch_id_fkey" FOREIGN KEY (branch_id) REFERENCES branches(id);

ALTER TABLE public."physiotherapy_sessions" ADD CONSTRAINT "physiotherapy_sessions_fracture_case_id_fkey" FOREIGN KEY (fracture_case_id) REFERENCES fracture_cases(id) ON DELETE CASCADE;

ALTER TABLE public."staff_access" ADD CONSTRAINT "staff_access_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public."billing" ADD CONSTRAINT "billing_doctor_id_fkey" FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL;

ALTER TABLE public."patient_medicines" ADD CONSTRAINT "patient_medicines_patient_id_fkey" FOREIGN KEY (patient_id) REFERENCES patients(id);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);

CREATE INDEX idx_billing_doctor_id ON public.billing USING btree (doctor_id) WHERE (doctor_id IS NOT NULL);

CREATE INDEX idx_booking_requests_status ON public.booking_requests USING btree (status);

CREATE INDEX idx_cash_book_entry_date ON public.cash_book_entries USING btree (entry_date);

CREATE INDEX idx_cash_book_entry_type ON public.cash_book_entries USING btree (entry_type);

CREATE INDEX idx_fc_patient ON public.fracture_cases USING btree (patient_id);

CREATE INDEX idx_fc_followup ON public.fracture_cases USING btree (next_followup_date);

CREATE INDEX idx_fx_case ON public.fracture_xrays USING btree (fracture_case_id);

CREATE INDEX idx_insurance_claims_status ON public.insurance_claims USING btree (status);

CREATE UNIQUE INDEX patients_registration_number_key ON public.patients USING btree (registration_number);

CREATE INDEX idx_physio_sessions_case ON public.physiotherapy_sessions USING btree (fracture_case_id);

CREATE INDEX idx_sms_logs_sent_at ON public.sms_logs USING btree (sent_at);

CREATE INDEX idx_stock_movements_medicine ON public.stock_movements USING btree (medicine_id);

CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON appointments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON billing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_fc_updated BEFORE UPDATE ON fracture_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER billing_receipt_ledger BEFORE INSERT OR UPDATE ON billing FOR EACH ROW EXECUTE FUNCTION merge_bill_receipts();

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER assign_patient_registration BEFORE INSERT OR UPDATE OF registration_number ON patients FOR EACH ROW EXECUTE FUNCTION assign_patient_registration();

CREATE TRIGGER sync_repair_guard_cash_day BEFORE INSERT OR UPDATE ON cash_book_days FOR EACH ROW EXECUTE FUNCTION sync_repair_guard_cash_day();

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

NOTIFY pgrst,'reload schema';

-- Apply after 20261006180000_offline_cashbook_followup.sql.
CREATE OR REPLACE FUNCTION public.delete_record_authorized(p_table text,p_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE old_row jsonb;
BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Administrator required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_table NOT IN ('patients','billing','appointments','prescriptions','medical_history','fracture_cases','fracture_xrays','physiotherapy_sessions','beds','xray_reports','hospitals','insurance_claims','patient_medicines','medicine_entries','invoice_medicine_mapping','medicines','cash_book_entries','cash_book_days','payments','booking_requests','branches','report_payments','sms_logs') THEN RAISE EXCEPTION 'Invalid delete target'; END IF;
 -- Row lock makes concurrent/retried deletes log exactly once.
 EXECUTE format('SELECT to_jsonb(t) FROM public.%I t WHERE id=$1 FOR UPDATE',p_table) INTO old_row USING p_id;
 IF old_row IS NULL THEN RETURN true; END IF;
 INSERT INTO public.deleted_records_log(table_name,record_id,record_data,deleted_by)
 VALUES(p_table,p_id,old_row,auth.uid());
 -- Existing foreign keys cascade in this same transaction. A failure rolls back the audit too.
 EXECUTE format('DELETE FROM public.%I WHERE id=$1',p_table) USING p_id;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.delete_record_authorized(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_record_authorized(text,uuid) TO authenticated;

CREATE TABLE public.clinic_installation (
 id boolean PRIMARY KEY DEFAULT true CHECK (id), schema_version integer NOT NULL,
 installed_at timestamptz NOT NULL DEFAULT now(), owner_user_id uuid REFERENCES auth.users(id)
);
ALTER TABLE public.clinic_installation ENABLE ROW LEVEL SECURITY;
CREATE POLICY admin_install_read ON public.clinic_installation FOR SELECT TO authenticated
 USING (public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.clinic_installation FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.clinic_installation TO authenticated;
GRANT ALL ON public.clinic_installation TO service_role;
INSERT INTO public.clinic_installation(id,schema_version) VALUES(true,1);
-- Users may append audit events only through the checked RPC.
REVOKE INSERT, UPDATE, DELETE ON public.audit_logs, public.deleted_records_log FROM authenticated;

CREATE TABLE IF NOT EXISTS public.bjopd_clinic_profile (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  revision uuid NOT NULL,
  name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 3 AND 120),
  doctor text NOT NULL DEFAULT '' CHECK (char_length(doctor) <= 100),
  phone text NOT NULL DEFAULT '' CHECK (char_length(phone) <= 32),
  address text NOT NULL DEFAULT '' CHECK (char_length(address) <= 240)
);
ALTER TABLE public.bjopd_clinic_profile ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.bjopd_clinic_profile FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.bjopd_clinic_profile TO authenticated;
DROP POLICY IF EXISTS clinic_profile_read ON public.bjopd_clinic_profile;
CREATE POLICY clinic_profile_read ON public.bjopd_clinic_profile FOR SELECT TO authenticated
  USING (public.can_use_pages(ARRAY['*']));
DROP POLICY IF EXISTS clinic_profile_insert ON public.bjopd_clinic_profile;
CREATE POLICY clinic_profile_insert ON public.bjopd_clinic_profile FOR INSERT TO authenticated
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));
DROP POLICY IF EXISTS clinic_profile_update ON public.bjopd_clinic_profile;
CREATE POLICY clinic_profile_update ON public.bjopd_clinic_profile FOR UPDATE TO authenticated
  USING (public.has_role((SELECT auth.uid()), 'admin'))
  WITH CHECK (public.has_role((SELECT auth.uid()), 'admin'));
NOTIFY pgrst, 'reload schema';

COMMIT;
