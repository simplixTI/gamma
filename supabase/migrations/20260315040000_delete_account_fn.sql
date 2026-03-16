-- LGPD account deletion audit trail
-- Creates a table to log deletion requests before the Edge Function executes them.

CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  status       TEXT        DEFAULT 'pending' NOT NULL
);

ALTER TABLE account_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users may only insert their own deletion request
CREATE POLICY "user can request own deletion"
  ON account_deletion_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users may read their own request
CREATE POLICY "user can view own deletion request"
  ON account_deletion_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- RPC: inserts a deletion request row and returns its id
CREATE OR REPLACE FUNCTION request_account_deletion(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO account_deletion_requests (user_id)
  VALUES (p_user_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
