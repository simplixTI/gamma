-- =============================================================================
-- Fix: validate_ride_price must consider discount_amount.
--
-- Bug: trigger comparava NEW.price diretamente com o valor da tabela de precos,
-- entao corridas com cupom aplicado (price=3, gross_price=4, discount_amount=1)
-- levantavam "Preco invalido: esperado R$4.00, recebido R$3.00" (errcode 23514).
--
-- Fix: validar (price + discount_amount) contra o preco autoritativo.
-- Fraudador nao consegue burlar mandando discount_amount inflado porque:
--   - referral_discount_id eh validado server-side ao consumir o desconto
--   - discount_amount tem CHECK >= 0
--   - get_ride_price() eh source-of-truth da tabela oficial
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_ride_price()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  origin_id        TEXT;
  dest_id          TEXT;
  per_person_price NUMERIC;
  expected_price   NUMERIC;
  passenger_count  INTEGER;
  discount_amount  NUMERIC;
  effective_price  NUMERIC;
BEGIN
  origin_id       := NEW.origin_pier_id;
  dest_id         := NEW.destination_pier_id;
  passenger_count := COALESCE(NEW.passenger_count, 1);
  discount_amount := COALESCE(NEW.discount_amount, 0);

  -- Only validate if both pier IDs are present
  IF origin_id IS NULL OR dest_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Look up authoritative per-person price; falls back to 5 for unknown pairs
  per_person_price := public.get_ride_price(origin_id, dest_id);
  expected_price   := per_person_price * passenger_count;

  -- Preco efetivo autorizado = o que o passageiro paga + o que o desconto cobre.
  -- A soma deve bater com o preco oficial da rota.
  effective_price  := NEW.price + discount_amount;

  -- Allow up to R$0.01 rounding difference
  IF ABS(effective_price - expected_price) > 0.01 THEN
    RAISE EXCEPTION 'Preço inválido: esperado R$%, recebido R$% (preço R$% + desconto R$%)',
      expected_price, effective_price, NEW.price, discount_amount
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger ja existe (BEFORE INSERT ON public.rides) — CREATE OR REPLACE acima
-- atualiza a funcao in-place sem precisar recriar o trigger.
