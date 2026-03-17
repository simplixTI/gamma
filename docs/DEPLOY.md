# Gamma App — Checklist de Deploy

Execute os passos **nesta ordem exata**. O banco deve estar pronto antes do frontend chegar.

---

## 1. Vercel — Variáveis de Ambiente

Confirmar que todas as variáveis estão configuradas em **Settings → Environment Variables**:

- [ ] `VITE_SUPABASE_URL`
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY`
- [ ] `VITE_SUPABASE_ANON_KEY` (mesmo valor que `VITE_SUPABASE_PUBLISHABLE_KEY`)
- [ ] `VITE_GOOGLE_MAPS_KEY`
- [ ] `VITE_APP_URL` → `https://gamma.app.br`
- [ ] `VITE_SENTRY_DSN`

---

## 2. Supabase — Aplicar Migrações

```bash
supabase db push
```

Migrações que serão aplicadas (em ordem):

| Arquivo | Propósito |
|---------|-----------|
| `20260316000016_locations_rls.sql` | RLS para tabela `locations` |
| `20260316000017_atomic_wallet_payment.sql` | Pagamento atômico com carteira |
| `20260317000018_push_notification_webhook.sql` | Webhook de push notification |
| `20260317000020_integrity_constraints.sql` | Constraints de integridade referencial |
| `20260317000021_pilot_earnings.sql` | Tabela `pilot_earnings` |
| `20260317000022_admin_rate_limit.sql` | Rate limiting para endpoints admin |
| `20260317000023_pilot_bank_data.sql` | Dados bancários do piloto |
| `20260317000024_revenue_split.sql` | Divisão de receita 70/30 |
| `20260317000025_ad_images_bucket.sql` | Bucket de Storage para anúncios |
| `20260317000026_security_critical_fixes.sql` | **Crítico:** ownership checks, anti-fraude, RLS |

---

## 3. Supabase — Secrets das Edge Functions

Configurar em **Settings → Edge Functions → Secrets**:

- [ ] `MP_ACCESS_TOKEN` — token de produção do Mercado Pago
- [ ] `ALLOWED_ORIGIN` → `https://gamma.app.br`
- [ ] `SUPABASE_URL` (já preenchido automaticamente)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` (já preenchido automaticamente)

---

## 4. Admin Seed

O painel `/admin` requer um usuário admin cadastrado manualmente:

1. Supabase Dashboard → **Authentication → Users → Invite User**
2. Inserir na tabela `admin_users`:

```sql
INSERT INTO admin_users (user_id)
VALUES ('<uuid-do-usuario-criado>');
```

---

## 5. Git Push → Deploy Automático na Vercel

```bash
git push origin main
```

O push dispara o deploy automático. O banco já está pronto (passo 2).

---

## 6. Smoke Test

Testar o fluxo completo em produção:

- [ ] Cadastro de passageiro
- [ ] Cadastro de piloto
- [ ] Passageiro solicita corrida
- [ ] Piloto aceita
- [ ] Pagamento PIX
- [ ] Corrida concluída
- [ ] Avaliação mútua
- [ ] Painel admin acessível
