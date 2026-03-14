-- Adicionar colunas para controle de cancelamento
ALTER TABLE public.rides 
  ADD COLUMN IF NOT EXISTS cancellation_fee numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS cancelled_by text DEFAULT NULL;

-- Adicionar constraint para cancelled_by
ALTER TABLE public.rides 
  ADD CONSTRAINT cancelled_by_check 
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('passenger', 'pilot'));