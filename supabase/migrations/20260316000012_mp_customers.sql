-- Add MP Customers API fields to saved_cards
-- mp_customer_id: persistent MP customer ID (linked to email/CPF)
-- mp_payment_method_id: card brand/network identifier (e.g. 'visa', 'master')

ALTER TABLE public.saved_cards
  ADD COLUMN IF NOT EXISTS mp_customer_id       text,
  ADD COLUMN IF NOT EXISTS mp_payment_method_id text;

-- Index for fast lookup when charging saved card
CREATE INDEX IF NOT EXISTS idx_saved_cards_mp_card_id
  ON public.saved_cards (mp_card_id)
  WHERE mp_card_id IS NOT NULL;
