-- Taxa Mercado Pago no payment. Owner e Simplix dividem a taxa
-- proporcionalmente (razao 45:10) — piloto recebe 45% do bruto intacto.
-- Para Barco Parceiro (60/40), Simplix absorve a taxa toda.

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS mp_fee NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.payments.mp_fee IS
  'Taxa cobrada pelo Mercado Pago no recebimento. Deduz da fatia owner+simplix '
  '(piloto sempre intacto). Capturado do webhook via fee_details[0].amount.';

CREATE INDEX IF NOT EXISTS idx_payments_mp_fee
  ON public.payments (status) WHERE mp_fee > 0;

-- Backfill: pra pagamentos ja completados que nao tem mp_fee, estima
-- baseado no metodo de pagamento da corrida.
--   PIX:   0.99% (taxa MP padrao)
--   Card:  4.99% (cartao a vista)
--   default 0.99% se metodo desconhecido
UPDATE public.payments p
SET mp_fee = ROUND(
  p.amount * CASE
    WHEN r.payment_method = 'pix' THEN 0.0099
    WHEN r.payment_method IN ('card', 'credit_card') THEN 0.0499
    ELSE 0.0099
  END,
  2
)
FROM public.rides r
WHERE p.ride_id = r.id
  AND p.status = 'completed'
  AND p.mp_fee = 0;
