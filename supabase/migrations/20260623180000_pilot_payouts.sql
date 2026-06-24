-- Registra pagamentos efetivos aos pilotos (PIX/dinheiro/transferencia) com metodo,
-- referencia (TX id) e observacoes. pilot_earnings.payout_id linka cada earning ao
-- payout que liquidou ele. Permite gestao financeira proper e recibos com dados
-- reais de transferencia.

CREATE TABLE IF NOT EXISTS public.pilot_payouts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pilot_profile_id  UUID NOT NULL REFERENCES public.pilot_profiles(id),
  pilot_user_id     UUID NOT NULL REFERENCES auth.users(id),
  amount            NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  paid_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  method            TEXT NOT NULL CHECK (method IN ('pix', 'cash', 'transfer', 'other')),
  reference         TEXT,
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pilot_payouts_pilot   ON public.pilot_payouts (pilot_profile_id, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_pilot_payouts_paid_at ON public.pilot_payouts (paid_at DESC);

ALTER TABLE public.pilot_earnings
  ADD COLUMN IF NOT EXISTS payout_id UUID REFERENCES public.pilot_payouts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pilot_earnings_payout
  ON public.pilot_earnings (payout_id) WHERE payout_id IS NOT NULL;

ALTER TABLE public.pilot_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pilot_payouts_admin_all" ON public.pilot_payouts;
CREATE POLICY "pilot_payouts_admin_all"
  ON public.pilot_payouts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pilot_payouts_pilot_select_own" ON public.pilot_payouts;
CREATE POLICY "pilot_payouts_pilot_select_own"
  ON public.pilot_payouts FOR SELECT
  TO authenticated
  USING (pilot_user_id = auth.uid());

COMMENT ON TABLE public.pilot_payouts IS
  'Pagamentos efetivos aos pilotos. Cada registro representa uma transferencia real (PIX/dinheiro/etc) feita pelo admin.';
COMMENT ON COLUMN public.pilot_earnings.payout_id IS
  'Linka este earning ao payout que liquidou ele. NULL = ainda pendente.';
