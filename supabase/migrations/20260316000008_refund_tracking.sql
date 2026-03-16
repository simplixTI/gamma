-- Refund tracking: add refund columns to payments table
-- and update cancel_ride_by_pilot to flag paid rides for refund

-- ============================================================
-- 1. Add refund columns to payments
-- ============================================================
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS refund_status   text CHECK (refund_status IN ('pending', 'processing', 'refunded', 'failed')),
  ADD COLUMN IF NOT EXISTS refund_mp_id    text,
  ADD COLUMN IF NOT EXISTS refund_amount   numeric(10,2),
  ADD COLUMN IF NOT EXISTS refund_reason   text,
  ADD COLUMN IF NOT EXISTS refund_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_at     timestamptz;

CREATE INDEX IF NOT EXISTS idx_payments_refund_status
  ON public.payments(refund_status)
  WHERE refund_status IS NOT NULL;

-- ============================================================
-- 2. RPC: request_payment_refund
--    Called when a completed payment needs to be refunded.
--    Marks it pending — an admin or automated job calls MP API.
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_payment_refund(
  p_ride_id  uuid,
  p_reason   text DEFAULT 'ride_cancelled'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payments
  SET
    refund_status         = 'pending',
    refund_reason         = p_reason,
    refund_requested_at   = now()
  WHERE ride_id = p_ride_id
    AND status = 'completed'
    AND refund_status IS NULL;
END;
$$;

-- ============================================================
-- 3. Update cancel_ride_by_pilot to flag payment for refund
-- ============================================================
-- Drop first to allow changing return type (json vs jsonb conflict)
DROP FUNCTION IF EXISTS public.cancel_ride_by_pilot(uuid, uuid);
CREATE OR REPLACE FUNCTION public.cancel_ride_by_pilot(
  p_ride_id uuid,
  p_pilot_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ride            record;
  v_cancellation_fee numeric := 0;
  v_payment_status  text;
BEGIN
  -- Fetch ride with lock
  SELECT * INTO v_ride
  FROM public.rides
  WHERE id = p_ride_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'ride_not_found');
  END IF;

  IF v_ride.pilot_id != p_pilot_id THEN
    RETURN json_build_object('success', false, 'error', 'not_authorized');
  END IF;

  IF v_ride.status NOT IN ('accepted', 'pilot_arriving', 'in_progress', 'pending') THEN
    RETURN json_build_object('success', false, 'error', 'ride_not_cancellable', 'status', v_ride.status);
  END IF;

  -- Apply cancellation fee if ride was in progress
  IF v_ride.status = 'in_progress' THEN
    v_cancellation_fee := COALESCE(v_ride.price, 0) * 0.1;
  END IF;

  UPDATE public.rides
  SET
    status             = 'cancelled',
    cancellation_fee   = v_cancellation_fee,
    cancelled_at       = now(),
    cancelled_by       = 'pilot'
  WHERE id = p_ride_id;

  -- If ride was paid, flag the payment for refund
  SELECT payment_status INTO v_payment_status FROM public.rides WHERE id = p_ride_id;
  IF COALESCE(v_payment_status, '') = 'paid' THEN
    PERFORM public.request_payment_refund(p_ride_id, 'pilot_cancelled');
  END IF;

  RETURN json_build_object('success', true, 'cancellation_fee', v_cancellation_fee);
END;
$$;

-- ============================================================
-- 4. Deprecate legacy webhook edge functions (code comment)
--    mp-wallet-webhook and payment-webhook are dead code.
--    Both mp-create-payment and wallet-topup point to mp-webhook.
--    Do NOT register those URLs in Mercado Pago dashboard.
-- ============================================================
COMMENT ON TABLE public.payments IS
  'Webhook URL: /functions/v1/mp-webhook only. Legacy endpoints mp-wallet-webhook and payment-webhook are NOT registered.';
