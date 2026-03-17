-- Track admin login attempts server-side
CREATE TABLE IF NOT EXISTS public.admin_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_hint TEXT, -- store first 3 octets only (privacy)
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_admin_login_email_time
  ON public.admin_login_attempts(email, attempted_at DESC);

-- Auto-cleanup entries older than 1 hour
CREATE OR REPLACE FUNCTION public.cleanup_old_login_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.admin_login_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Function to check and record attempt (returns true if blocked)
CREATE OR REPLACE FUNCTION public.check_admin_login_rate_limit(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_fails INT;
BEGIN
  -- Cleanup old entries first
  DELETE FROM public.admin_login_attempts WHERE attempted_at < NOW() - INTERVAL '1 hour';

  -- Count recent failures in last 15 minutes
  SELECT COUNT(*) INTO recent_fails
  FROM public.admin_login_attempts
  WHERE email = p_email
    AND success = FALSE
    AND attempted_at > NOW() - INTERVAL '15 minutes';

  -- Block if 10+ failures
  RETURN recent_fails >= 10;
END;
$$;

-- RLS: only service_role
ALTER TABLE public.admin_login_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON public.admin_login_attempts
  USING (false) WITH CHECK (false);
GRANT ALL ON public.admin_login_attempts TO service_role;
GRANT EXECUTE ON FUNCTION public.check_admin_login_rate_limit TO service_role;
