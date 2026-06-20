-- admin_delete_user: safely deletes a user and all related data
-- Handles FK constraints that don't have ON DELETE CASCADE

CREATE OR REPLACE FUNCTION public.admin_delete_user(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can call this
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Nullify nullable FKs in rides (preserve ride history)
  UPDATE public.rides
  SET passenger_user_id = NULL
  WHERE passenger_user_id = p_user_id;

  UPDATE public.rides
  SET pilot_user_id = NULL
  WHERE pilot_user_id = p_user_id;

  -- Nullify pilot_id in payments (payments.pilot_id references auth.users, no cascade)
  UPDATE public.payments
  SET pilot_id = NULL
  WHERE pilot_id = p_user_id;

  -- Nullify earned_from_user_id in referral_discounts (nullable)
  UPDATE public.referral_discounts
  SET earned_from_user_id = NULL
  WHERE earned_from_user_id = p_user_id;

  -- Delete ride_reviews (reviewer_id and reviewee_id are NOT NULL, no cascade)
  DELETE FROM public.ride_reviews
  WHERE reviewer_id = p_user_id OR reviewee_id = p_user_id;

  -- Delete pilot_earnings (pilot_user_id is NOT NULL, no cascade)
  DELETE FROM public.pilot_earnings
  WHERE pilot_user_id = p_user_id;

  -- Delete auth user — cascades to:
  -- passenger_profiles, pilot_profiles, user_roles, wallets,
  -- wallet_transactions, saved_cards, push_tokens, pilot_documents,
  -- account_deletion_requests, favorite_locations,
  -- referral_discounts (passenger_user_id), admin_users
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute only to authenticated users (is_admin() check inside enforces admin-only)
REVOKE ALL ON FUNCTION public.admin_delete_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;
