-- Phase 3 fixes: set_default_card RPC, ride_messages RLS, usePilotStats channel

-- 1. Atomic set_default_card RPC
-- Avoids two-step default update race (unset-all then set-new could leave no default if interrupted)
CREATE OR REPLACE FUNCTION public.set_default_card(p_user_id uuid, p_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.saved_cards
  SET is_default = (id = p_card_id)
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_default_card(uuid, uuid) TO authenticated;

-- 2. Fix ride_messages RLS — restrict reads to ride participants only
-- The original USING (true) allowed any authenticated user to read all messages
DROP POLICY IF EXISTS "Ride participants can read messages" ON public.ride_messages;

CREATE POLICY "Ride participants can read messages"
  ON public.ride_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_messages.ride_id
        AND (r.passenger_user_id = auth.uid() OR r.pilot_user_id = auth.uid())
    )
  );
