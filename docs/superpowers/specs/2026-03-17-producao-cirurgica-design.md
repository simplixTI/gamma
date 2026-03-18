# Design: Gamma App — Produção Cirúrgica (Opção A)

**Data:** 2026-03-17
**Status:** Aprovado
**Autor:** Claude Code (via brainstorming skill)

---

## Contexto

O Gamma App é um serviço de transporte aquático pool/lotação na Ilha da Gigoia, Barra da Tijuca (RJ). Stack: React + TypeScript + Vite + Tailwind + shadcn/ui + Supabase + Capacitor Android. Pagamentos via Mercado Pago (PIX + cartão). Deploy: Vercel (frontend) + Supabase (banco + Edge Functions).

O projeto passou por uma série de correções de segurança, bugs e melhorias de UX em sessões anteriores. Todo esse trabalho está em ~50 arquivos modificados não commitados. O objetivo deste plano é levar o projeto ao estado definitivo de produção de forma cirúrgica — corrigindo apenas o que está quebrado ou bloqueante.

---

## Objetivo

Resolver os 3 bugs críticos de código, aplicar as 10 migrações pendentes no banco, criar documentação de variáveis de ambiente, commitar tudo no git, e produzir um checklist de deploy final.

**Fora de escopo:** refatorações, novas features, testes automatizados, bundle splitting.

---

## Seção 1 — Correções de Código

### Bug 1: `ALLOWED_ORIGIN` fallback incorreto em 4 Edge Functions

**Arquivos afetados:**
- `supabase/functions/mp-create-payment/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/mp-refund/index.ts`
- `supabase/functions/wallet-topup/index.ts`

**Problema:** O fallback em todas as quatro é `https://localhost:8080`. Em produção, qualquer uma dessas Edge Functions vai rejeitar requisições com CORS error se a env var `ALLOWED_ORIGIN` não estiver configurada nos Supabase Secrets. Isso quebra pagamentos, reembolsos, recarga de carteira e exclusão de conta.
**Correção:** Mudar o fallback de `https://localhost:8080` para `https://gamma.app.br` em todos os quatro arquivos — consistente com `mp-webhook` e `wallet-webhook` que já têm o valor correto.
**Risco:** Mínimo. Apenas strings literais de fallback. Em produção, o valor correto vem da env var `ALLOWED_ORIGIN` nos Supabase Secrets — o fallback só é atingido se a env var não estiver setada.

### Bug 2: Mensagem de erro inconsistente no GoogleMapView

**Arquivo:** `src/components/GoogleMapView.tsx`
**Linha:** ~269
**Problema:** O código usa `import.meta.env.VITE_GOOGLE_MAPS_KEY` mas a mensagem de erro diz "Configure VITE_GOOGLE_MAPS_API_KEY". Causa confusão para quem tenta debugar — a variável correta já está configurada na Vercel como `VITE_GOOGLE_MAPS_KEY`.
**Correção:** Atualizar a mensagem de erro para usar o nome correto `VITE_GOOGLE_MAPS_KEY`.
**Risco:** Zero. Só texto de mensagem de erro.

### Bug 3: `placeholder.svg` para fotos de piloto

**Arquivos:** `src/pages/passenger/PassengerHome.tsx`, `src/pages/passenger/SearchingPilot.tsx`, `src/pages/passenger/Tracking.tsx`, `src/pages/pilot/PilotDashboard.tsx`, `src/pages/pilot/ActiveRide.tsx`
**Problema:** `/placeholder.svg` é um asset de desenvolvimento do shadcn/ui que não existe no build de produção (`dist/`). Quando um piloto não tem foto cadastrada, o app renderiza uma imagem quebrada (ícone de imagem ausente).
**Correção:** Substituir o uso de `placeholder.svg` por um componente de avatar inline com as iniciais do nome — padrão já estabelecido no `PassengerHome` para o avatar do passageiro. Nas páginas que só montam o objeto `currentPilot` em memória (sem renderizar avatar diretamente), usar string vazia `''` como `photo` para que os componentes downstream tratem o fallback.
**Risco:** Baixo. Não altera lógica de negócio, apenas apresentação.

---

## Seção 2 — Banco de Dados

### 2.1 Migrações pendentes (10 arquivos)

Todas as migrações abaixo existem como arquivos `.sql` no repositório mas **não foram aplicadas** no banco Supabase de produção. Aplicar via `supabase db push`.

| Arquivo | Propósito |
|---------|-----------|
| `20260316000016_locations_rls.sql` | RLS para tabela `locations` |
| `20260316000017_atomic_wallet_payment.sql` | Pagamento atômico com carteira (previne duplo débito) |
| `20260317000018_push_notification_webhook.sql` | Webhook de push notification |
| *(gap — não existe migration 000019)* | — |
| `20260317000020_integrity_constraints.sql` | Constraints de integridade referencial |
| `20260317000021_pilot_earnings.sql` | Tabela `pilot_earnings` para controle financeiro |
| `20260317000022_admin_rate_limit.sql` | Rate limiting para endpoints admin |
| `20260317000023_pilot_bank_data.sql` | Dados bancários do piloto para pagamentos |
| `20260317000024_revenue_split.sql` | Divisão de receita 70% plataforma / 30% piloto |
| `20260317000025_ad_images_bucket.sql` | Bucket de Storage para imagens de anúncios |
| `20260317000026_security_critical_fixes.sql` | **Crítico:** ownership checks em RPCs de wallet, prevenção de fraude em avaliações, fix de políticas RLS |

### 2.2 Seed do admin

Após as migrações, o painel `/admin` está inacessível sem um usuário admin cadastrado. O seed deve ser feito manualmente pelo painel do Supabase Dashboard (Authentication → Users → Invite User) seguido de inserção na tabela `admin_users`. Documentado no checklist de deploy.

---

## Seção 3 — Infraestrutura

### 3.1 `.env.example`

Criar arquivo `.env.example` na raiz do projeto documentando todas as variáveis necessárias:

```
# Supabase
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
# Mesmo valor que VITE_SUPABASE_PUBLISHABLE_KEY — usado por usePilotGPS e supabaseClient.ts
VITE_SUPABASE_ANON_KEY=<anon-key>

# Google Maps
VITE_GOOGLE_MAPS_KEY=<google-maps-api-key>

# App URL (usado para OAuth redirect e reset de senha no Android/iOS)
VITE_APP_URL=https://gamma.app.br

# Sentry (monitoramento de erros em produção)
VITE_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
```

### 3.2 Git commit

Um commit atômico com mensagem clara cobrindo todas as alterações desta e das sessões anteriores. As migrações ficam versionadas no repositório. O commit vai para `main` e dispara o deploy automático na Vercel.

### 3.3 Checklist de deploy (`docs/DEPLOY.md`)

Documento com os passos na ordem correta:

1. **Vercel:** Confirmar todas as variáveis de ambiente estão setadas (incluindo `VITE_SENTRY_DSN`)
2. **Supabase:** `supabase db push` para aplicar as 10 migrações *(antes do deploy — garante que o banco está pronto antes do frontend chegar)*
3. **Supabase:** Configurar Secrets das Edge Functions (`MP_ACCESS_TOKEN`, `ALLOWED_ORIGIN`, etc.)
4. **Admin seed:** Criar usuário admin via Supabase Dashboard
5. **Git:** Push para `main` → deploy automático na Vercel *(após banco pronto)*
6. **Smoke test:** Testar fluxo completo (cadastro → solicitação → pagamento PIX → corrida → avaliação)

---

## Ordem de Implementação

1. Corrigir Bug 1 (`mp-create-payment` ALLOWED_ORIGIN)
2. Corrigir Bug 2 (mensagem de erro GoogleMapView)
3. Corrigir Bug 3 (placeholder.svg → fallback de iniciais)
4. Criar `.env.example`
5. Criar `docs/DEPLOY.md`
6. Git commit atômico
7. `supabase db push`

---

## Critérios de Sucesso

- [ ] Build de produção passa sem erros (`npm run build`)
- [ ] `supabase db push` aplica todas as 10 migrações sem conflitos
- [ ] Pagamento PIX funciona em produção (sem CORS error)
- [ ] Mapa Google carrega corretamente (variável de ambiente consistente)
- [ ] Avatares de piloto exibem iniciais em vez de imagem quebrada
- [ ] Todos os arquivos modificados commitados no git
- [ ] `.env.example` e `docs/DEPLOY.md` versionados
