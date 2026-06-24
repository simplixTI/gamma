-- Idempotencia para emails de corrida concluida. Edge function send-ride-emails
-- consulta esta tabela antes de chamar a Resend pra nao reenviar quando o
-- passageiro abrir a tela Completed varias vezes.

CREATE TABLE IF NOT EXISTS public.ride_emails_sent (
  ride_id             UUID PRIMARY KEY REFERENCES public.rides(id) ON DELETE CASCADE,
  passenger_email     TEXT,
  passenger_sent_at   TIMESTAMPTZ,
  passenger_resend_id TEXT,
  pilot_email         TEXT,
  pilot_sent_at       TIMESTAMPTZ,
  pilot_resend_id     TEXT,
  last_error          TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ride_emails_sent_updated ON public.ride_emails_sent (updated_at DESC);

ALTER TABLE public.ride_emails_sent ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ride_emails_admin_all" ON public.ride_emails_sent;
CREATE POLICY "ride_emails_admin_all"
  ON public.ride_emails_sent FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "ride_emails_participant_select" ON public.ride_emails_sent;
CREATE POLICY "ride_emails_participant_select"
  ON public.ride_emails_sent FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rides r
      WHERE r.id = ride_emails_sent.ride_id
        AND (r.passenger_user_id = auth.uid() OR r.pilot_user_id = auth.uid())
    )
  );

COMMENT ON TABLE public.ride_emails_sent IS
  'Controle de idempotencia para envio de emails de corrida concluida via Resend. '
  '_sent_at = email entregue com sucesso. last_error = ultima tentativa falha.';
