BEGIN;
DO $$ BEGIN
IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='clinic_admin_files') THEN
 CREATE POLICY clinic_admin_files ON storage.objects FOR ALL TO authenticated
 USING (bucket_id IN ('invoices','xray-files','patient-files') AND public.has_role(auth.uid(),'admin'))
 WITH CHECK (bucket_id IN ('invoices','xray-files','patient-files') AND public.has_role(auth.uid(),'admin'));
END IF;
END $$;
COMMIT;
