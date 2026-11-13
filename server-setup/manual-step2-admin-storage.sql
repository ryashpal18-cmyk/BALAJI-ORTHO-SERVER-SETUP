-- BJ OPD — Manual Supabase setup, STEP 2 (Access Token के बिना setup)
-- पहले server-setup/schema.sql चलाएँ (STEP 1)।
-- फिर Supabase → Authentication → Users → Add user से Cloud Admin बनाएँ (Auto Confirm User ✔)।
-- नीचे वाली लाइन में 'admin@example.com' की जगह वही email लिखें, फिर पूरी file Run करें।
-- यह file दोबारा चलाने पर भी सुरक्षित है।

BEGIN;

-- 1) Private storage buckets (bills PDF, X-ray, patient files)
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false),
       ('xray-files', 'xray-files', false),
       ('patient-files', 'patient-files', false)
ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id IN ('invoices','xray-files','patient-files') AND public) THEN
    RAISE EXCEPTION 'कोई storage bucket public है। Supabase → Storage में उसे private करें, फिर दोबारा चलाएँ।';
  END IF;
END $$;

-- 2) Storage permission: सिर्फ़ admin files पढ़/लिख सकता है
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='clinic_admin_files') THEN
    CREATE POLICY clinic_admin_files ON storage.objects FOR ALL TO authenticated
      USING (bucket_id IN ('invoices','xray-files','patient-files') AND public.has_role(auth.uid(),'admin'))
      WITH CHECK (bucket_id IN ('invoices','xray-files','patient-files') AND public.has_role(auth.uid(),'admin'));
  END IF;
END $$;

-- 3) Cloud Admin को admin permission दें
DO $$
DECLARE
  v_email text := 'admin@example.com';   -- <<< यहाँ अपना Cloud Admin email लिखें
  v_uid uuid;
  v_owner uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.clinic_installation WHERE id AND schema_version = 1) THEN
    RAISE EXCEPTION 'पहले STEP 1 (server-setup/schema.sql) चलाएँ।';
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = lower(trim(v_email));
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'यह email Supabase Users में नहीं मिला: %. पहले Authentication → Add user से बनाएँ।', v_email;
  END IF;
  SELECT owner_user_id INTO v_owner FROM public.clinic_installation WHERE id;
  IF v_owner IS NOT NULL AND v_owner <> v_uid THEN
    RAISE EXCEPTION 'यह setup पहले से दूसरे admin से जुड़ा है।';
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_uid, 'admin') ON CONFLICT DO NOTHING;
  UPDATE public.clinic_installation SET owner_user_id = v_uid WHERE id;
  RAISE NOTICE 'Admin तैयार: %', v_email;
END $$;

COMMIT;

-- जाँच: नीचे 1 row में admin दिखना चाहिए
SELECT u.email, r.role
FROM public.user_roles r JOIN auth.users u ON u.id = r.user_id
WHERE r.role = 'admin';
