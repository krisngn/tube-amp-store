-- Only server-side admin routes may read or update customer contact details.
-- These routes check the configured admin allowlist before using service_role.
BEGIN;
DROP POLICY IF EXISTS "Allow admin read" ON public.consultation_messages;
DROP POLICY IF EXISTS "Allow admin update" ON public.consultation_messages;
REVOKE SELECT, UPDATE, DELETE ON public.consultation_messages FROM anon, authenticated;
COMMIT;
