-- Create saved_cards table for tokenized card references (Mercado Pago card tokens)
-- Referenced by set_default_card() in phase3_fixes.sql and PaymentModal + SavedCards UI

CREATE TABLE IF NOT EXISTS public.saved_cards (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_four        TEXT        NOT NULL,
  brand            TEXT        NOT NULL DEFAULT 'unknown',
  holder_name      TEXT,
  expiry_month     INTEGER,
  expiry_year      INTEGER,
  mp_card_id       TEXT,           -- Mercado Pago card token / card_id
  is_default       BOOLEAN     NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure at most one default per user at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS saved_cards_one_default_per_user
  ON public.saved_cards (user_id)
  WHERE is_default = true;

-- Enable RLS
ALTER TABLE public.saved_cards ENABLE ROW LEVEL SECURITY;

-- Users can read their own cards only
CREATE POLICY "Users can read own cards"
  ON public.saved_cards FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own cards
CREATE POLICY "Users can insert own cards"
  ON public.saved_cards FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cards (e.g. change default)
CREATE POLICY "Users can update own cards"
  ON public.saved_cards FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own cards
CREATE POLICY "Users can delete own cards"
  ON public.saved_cards FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
