BEGIN;
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
