-- Drop legacy public (unauthenticated) RLS policies from the initial rides migration.
-- The security-hardened policies in 20260313160000_security_fixes.sql replace these.
-- With OR logic, Supabase grants access if ANY policy matches — so these must be removed.

DROP POLICY IF EXISTS "Anyone can create rides" ON public.rides;
DROP POLICY IF EXISTS "Anyone can view rides" ON public.rides;
DROP POLICY IF EXISTS "Anyone can update rides" ON public.rides;

-- Also drop any other overly permissive variants from early migrations
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.rides;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.rides;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.rides;

-- Verify: only authenticated/role-scoped policies should remain after this migration.
-- Run in Supabase dashboard to confirm: SELECT policyname FROM pg_policies WHERE tablename='rides';
