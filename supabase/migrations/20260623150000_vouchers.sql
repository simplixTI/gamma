-- Gamma Cash vouchers — partner-distributable discount codes (R$5/R$10/R$15).
-- Each voucher is single-use, sponsored by either the boat owner or the platform.
-- The sponsor absorbs the discount; the pilot is always paid 45% of GROSS price
-- (gross_price/discount_amount on rides already handles the pilot-whole guarantee).

CREATE TABLE IF NOT EXISTS public.vouchers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT NOT NULL UNIQUE,
  value           NUMERIC(10,2) NOT NULL CHECK (value IN (5, 10, 15)),
  sponsor         TEXT NOT NULL CHECK (sponsor IN ('owner', 'platform')),
  partner_name    TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  is_used         BOOLEAN NOT NULL DEFAULT false,
  used_by         UUID REFERENCES auth.users(id),
  used_at         TIMESTAMPTZ,
  used_on_ride_id UUID REFERENCES public.rides(id)
);

CREATE INDEX IF NOT EXISTS idx_vouchers_code      ON public.vouchers (UPPER(code));
CREATE INDEX IF NOT EXISTS idx_vouchers_unused    ON public.vouchers (created_at DESC) WHERE NOT is_used;
CREATE INDEX IF NOT EXISTS idx_vouchers_used_at   ON public.vouchers (used_at DESC) WHERE used_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vouchers_used_by   ON public.vouchers (used_by) WHERE used_by IS NOT NULL;

ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

-- Admins: full CRUD
DROP POLICY IF EXISTS "vouchers_admin_all" ON public.vouchers;
CREATE POLICY "vouchers_admin_all"
  ON public.vouchers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Authenticated users: SELECT only the voucher they've redeemed (used_by = themselves)
DROP POLICY IF EXISTS "vouchers_user_select_own" ON public.vouchers;
CREATE POLICY "vouchers_user_select_own"
  ON public.vouchers FOR SELECT
  TO authenticated
  USING (used_by = auth.uid());

-- rides table — voucher application columns
ALTER TABLE public.rides
  ADD COLUMN IF NOT EXISTS voucher_id UUID REFERENCES public.vouchers(id),
  ADD COLUMN IF NOT EXISTS voucher_discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

ALTER TABLE public.rides
  DROP CONSTRAINT IF EXISTS rides_voucher_discount_check;
ALTER TABLE public.rides
  ADD CONSTRAINT rides_voucher_discount_check
  CHECK (voucher_discount_amount >= 0);

-- RPC: atomically validate a voucher and lock it to the user.
-- Returns success + voucher info, OR an error code.
-- Voucher is marked is_used=true at redemption time (similar to gift cards).
-- used_on_ride_id is set later by RequestRide when the voucher is applied to a ride.
CREATE OR REPLACE FUNCTION public.redeem_voucher(p_code TEXT, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_voucher vouchers%ROWTYPE;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'empty_code');
  END IF;
  IF p_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_user');
  END IF;

  SELECT * INTO v_voucher
  FROM public.vouchers
  WHERE UPPER(code) = UPPER(trim(p_code))
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'voucher_not_found');
  END IF;

  IF v_voucher.is_used THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  IF v_voucher.expires_at IS NOT NULL AND v_voucher.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  UPDATE public.vouchers
  SET is_used = true,
      used_by = p_user_id,
      used_at = NOW()
  WHERE id = v_voucher.id;

  RETURN jsonb_build_object(
    'success',      true,
    'voucher_id',   v_voucher.id,
    'value',        v_voucher.value,
    'sponsor',      v_voucher.sponsor,
    'partner_name', v_voucher.partner_name,
    'code',         v_voucher.code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_voucher(TEXT, UUID) TO authenticated;

COMMENT ON FUNCTION public.redeem_voucher IS
  'Atomically validates and locks a voucher to the given user. Returns voucher
   info on success. The voucher is consumed (is_used=true) immediately — caller
   is expected to apply it to the next ride created.';
