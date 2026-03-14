-- Wallet (saldo pré-pago) feature
-- Passageiros podem carregar créditos e usar nas corridas

-- 1. Adiciona saldo na tabela de perfis do passageiro
ALTER TABLE public.passenger_profiles
  ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC(10,2) NOT NULL DEFAULT 0.00;

-- 2. Tabela de transações da carteira
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN ('topup', 'ride_payment', 'refund', 'tip')),
  amount          NUMERIC(10,2) NOT NULL,
  balance_after   NUMERIC(10,2) NOT NULL,
  description     TEXT,
  ride_id         UUID REFERENCES public.rides(id),
  payment_id      UUID REFERENCES public.payments(id),
  pix_qr_code     TEXT,
  pix_copy_paste  TEXT,
  pix_transaction_id TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'expired')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ
);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own wallet transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wallet transactions"
  ON public.wallet_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role can update (for edge function confirming top-ups)
CREATE POLICY "Service role can update wallet transactions"
  ON public.wallet_transactions FOR UPDATE
  USING (true);

-- Realtime for wallet transactions (balance top-up confirmation)
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallet_transactions;

-- 3. Função para debitar saldo (chamada ao pagar corrida com carteira)
CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_ride_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC;
  new_balance NUMERIC;
BEGIN
  SELECT wallet_balance INTO current_balance
  FROM passenger_profiles
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'Perfil de passageiro não encontrado';
  END IF;

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  new_balance := current_balance - p_amount;

  UPDATE passenger_profiles
  SET wallet_balance = new_balance
  WHERE user_id = p_user_id;

  INSERT INTO wallet_transactions (user_id, type, amount, balance_after, description, ride_id, status, completed_at)
  VALUES (p_user_id, 'ride_payment', p_amount, new_balance, p_description, p_ride_id, 'completed', now());

  RETURN new_balance;
END;
$$;

-- 4. Função para creditar saldo (após confirmação de top-up)
CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount NUMERIC,
  p_description TEXT,
  p_transaction_id UUID DEFAULT NULL
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_balance NUMERIC;
BEGIN
  UPDATE passenger_profiles
  SET wallet_balance = wallet_balance + p_amount
  WHERE user_id = p_user_id
  RETURNING wallet_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Perfil de passageiro não encontrado';
  END IF;

  UPDATE wallet_transactions
  SET status = 'completed', balance_after = new_balance, completed_at = now()
  WHERE id = p_transaction_id AND user_id = p_user_id;

  RETURN new_balance;
END;
$$;
