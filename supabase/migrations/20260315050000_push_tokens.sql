-- Push notification device tokens
-- Each user can have one token per platform (ios / android / web).
-- The service role reads all rows so the Edge Function can address any device.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id          UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       TEXT      NOT NULL,
  platform    TEXT      NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, platform)
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users may only read / write their own tokens
CREATE POLICY "push_tokens_self"
  ON public.push_tokens
  FOR ALL
  TO authenticated
  USING  (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role needs SELECT so the send-push-notification function can look up tokens
CREATE POLICY "push_tokens_service_read"
  ON public.push_tokens
  FOR SELECT
  TO service_role
  USING (true);
