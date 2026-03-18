# Gamma App — Produção Cirúrgica: Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolver todos os bloqueadores críticos de produção do Gamma App: 4 bugs de CORS em Edge Functions, 1 mensagem de erro inconsistente, 5 ocorrências de `placeholder.svg` quebrada, arquivo `.env.example`, checklist de deploy, e aplicar as 10 migrações pendentes no banco.

**Architecture:** Correções cirúrgicas em arquivos existentes — sem novas abstrações, sem refatoração. Cada task é independente e atômica. Ordem: código → docs → build verify → git commit → banco.

**Tech Stack:** React + TypeScript + Vite + Tailwind + Supabase (Edge Functions Deno) + Capacitor Android + Mercado Pago

---

## Chunk 1: Correções de Código

### Task 1: Fix ALLOWED_ORIGIN fallback em 4 Edge Functions

**Files:**
- Modify: `supabase/functions/mp-create-payment/index.ts:3`
- Modify: `supabase/functions/delete-account/index.ts:3`
- Modify: `supabase/functions/mp-refund/index.ts:4`
- Modify: `supabase/functions/wallet-topup/index.ts:3`

**Contexto:** O fallback `https://localhost:8080` faz com que qualquer requisição de produção seja rejeitada com CORS error se `ALLOWED_ORIGIN` não estiver nos Supabase Secrets. Em produção, `mp-webhook` e `wallet-webhook` já têm o valor correto — este fix padroniza as 4 restantes.

- [ ] **Step 1: Verificar o valor atual nos 4 arquivos**

```bash
grep -n "ALLOWED_ORIGIN" supabase/functions/mp-create-payment/index.ts supabase/functions/delete-account/index.ts supabase/functions/mp-refund/index.ts supabase/functions/wallet-topup/index.ts
```

Expected output: todas com `?? 'https://localhost:8080'`

- [ ] **Step 2: Corrigir `mp-create-payment/index.ts`**

Arquivo: `supabase/functions/mp-create-payment/index.ts`
Linha ~3: trocar
```ts
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://localhost:8080';
```
por
```ts
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://gamma.app.br';
```

- [ ] **Step 3: Corrigir `delete-account/index.ts`**

Arquivo: `supabase/functions/delete-account/index.ts`
Linha ~3: trocar
```ts
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://localhost:8080';
```
por
```ts
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://gamma.app.br';
```

- [ ] **Step 4: Corrigir `mp-refund/index.ts`**

Arquivo: `supabase/functions/mp-refund/index.ts`
Linha ~4 (inline no objeto corsHeaders):
```ts
'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://localhost:8080',
```
Trocar por:
```ts
'Access-Control-Allow-Origin': Deno.env.get('ALLOWED_ORIGIN') ?? 'https://gamma.app.br',
```

- [ ] **Step 5: Corrigir `wallet-topup/index.ts`**

Arquivo: `supabase/functions/wallet-topup/index.ts`
Linha ~3: trocar
```ts
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://localhost:8080';
```
por
```ts
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') ?? 'https://gamma.app.br';
```

- [ ] **Step 6: Verificar que nenhum localhost sobrou**

```bash
grep -rn "localhost:8080" supabase/functions/
```

Expected output: nenhuma linha

---

### Task 2: Fix mensagem de erro no GoogleMapView

**Files:**
- Modify: `src/components/GoogleMapView.tsx:269`

**Contexto:** O código usa `VITE_GOOGLE_MAPS_KEY` mas a mensagem de erro diz `VITE_GOOGLE_MAPS_API_KEY`. Inconsistência que causa confusão ao debugar.

- [ ] **Step 1: Localizar a linha exata**

```bash
grep -n "VITE_GOOGLE_MAPS_API_KEY" src/components/GoogleMapView.tsx
```

Expected: linha ~269

- [ ] **Step 2: Aplicar a correção**

Arquivo: `src/components/GoogleMapView.tsx` linha ~269.
Trocar:
```
Configure VITE_GOOGLE_MAPS_API_KEY no arquivo .env
```
por:
```
Configure VITE_GOOGLE_MAPS_KEY no arquivo .env
```

- [ ] **Step 3: Verificar consistência**

```bash
grep -n "VITE_GOOGLE_MAPS" src/components/GoogleMapView.tsx
```

Expected: apenas `VITE_GOOGLE_MAPS_KEY` em todos os lugares

---

### Task 3: Substituir `placeholder.svg` por string vazia em 5 arquivos

**Files:**
- Modify: `src/pages/passenger/PassengerHome.tsx:65`
- Modify: `src/pages/passenger/SearchingPilot.tsx:45,102`
- Modify: `src/pages/passenger/Tracking.tsx:322`
- Modify: `src/pages/pilot/PilotDashboard.tsx:64`
- Modify: `src/pages/pilot/ActiveRide.tsx:77`

**Contexto:** `/placeholder.svg` é um asset de desenvolvimento do shadcn/ui que não existe no build de produção (`dist/`). Os componentes downstream que recebem `photo: ''` já tratam o fallback mostrando as iniciais do nome — padrão já estabelecido no PassengerHome para o avatar do passageiro (veja linha 140 do mesmo arquivo).

- [ ] **Step 1: Verificar todas as ocorrências atuais**

```bash
grep -rn "placeholder\.svg" src/
```

Expected: 6 linhas em 5 arquivos

- [ ] **Step 2: Corrigir `PassengerHome.tsx`**

Arquivo: `src/pages/passenger/PassengerHome.tsx` linha ~65.
Trocar:
```ts
photo: '/placeholder.svg',
```
por:
```ts
photo: '',
```

- [ ] **Step 3: Corrigir `SearchingPilot.tsx` (2 ocorrências)**

Arquivo: `src/pages/passenger/SearchingPilot.tsx`.
Trocar AMBAS as ocorrências de:
```ts
let pilotPhoto = '/placeholder.svg';
```
por:
```ts
let pilotPhoto = '';
```

- [ ] **Step 4: Corrigir `Tracking.tsx`**

Arquivo: `src/pages/passenger/Tracking.tsx` linha ~322.
Trocar:
```ts
photo: data.photo_url || '/placeholder.svg',
```
por:
```ts
photo: data.photo_url || '',
```

- [ ] **Step 5: Corrigir `PilotDashboard.tsx`**

Arquivo: `src/pages/pilot/PilotDashboard.tsx` linha ~64.
Trocar:
```ts
passengerPhoto: '/placeholder.svg',
```
por:
```ts
passengerPhoto: '',
```

- [ ] **Step 6: Corrigir `ActiveRide.tsx`**

Arquivo: `src/pages/pilot/ActiveRide.tsx` linha ~77.
Trocar:
```ts
passengerPhoto: '/placeholder.svg',
```
por:
```ts
passengerPhoto: '',
```

- [ ] **Step 7: Verificar que não sobrou nenhum placeholder**

```bash
grep -rn "placeholder\.svg" src/
```

Expected output: nenhuma linha

---

## Chunk 2: Documentação e Infraestrutura

### Task 4: Criar `.env.example`

**Files:**
- Create: `.env.example`

- [ ] **Step 1: Criar o arquivo com todas as variáveis documentadas**

Criar `.env.example` na raiz do projeto com o conteúdo:

```bash
# =============================================================================
# Gamma App — Variáveis de Ambiente
# Copie este arquivo para .env e preencha os valores reais.
# NUNCA commite o arquivo .env com valores reais.
# =============================================================================

# -----------------------------------------------------------------------------
# Supabase — obtenha em: https://supabase.com/dashboard/project/<id>/settings/api
# -----------------------------------------------------------------------------
VITE_SUPABASE_URL=https://<project-id>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon-key>
# Mesmo valor que VITE_SUPABASE_PUBLISHABLE_KEY (usado por usePilotGPS e supabaseClient.ts)
VITE_SUPABASE_ANON_KEY=<anon-key>

# -----------------------------------------------------------------------------
# Google Maps — obtenha em: https://console.cloud.google.com/apis/credentials
# Habilite: Maps JavaScript API, Places API, Directions API
# -----------------------------------------------------------------------------
VITE_GOOGLE_MAPS_KEY=<google-maps-api-key>

# -----------------------------------------------------------------------------
# App URL — URL pública da aplicação (usada para OAuth redirect e reset de senha
# no Android/iOS onde window.location.origin retorna 'https://localhost')
# -----------------------------------------------------------------------------
VITE_APP_URL=https://gamma.app.br

# -----------------------------------------------------------------------------
# Sentry — monitoramento de erros em produção
# Obtenha em: https://sentry.io/settings/<org>/projects/<project>/keys/
# -----------------------------------------------------------------------------
VITE_SENTRY_DSN=https://<key>@o<org>.ingest.sentry.io/<project>
```

- [ ] **Step 2: Verificar que o arquivo foi criado corretamente**

```bash
cat .env.example
```

Expected: o arquivo completo com os 6 comentários e 6 variáveis

- [ ] **Step 3: Garantir que `.env` (com valores reais) está no `.gitignore`**

```bash
grep "^\.env$" .gitignore
```

Expected: `.env` presente no gitignore

---

### Task 5: Criar `docs/DEPLOY.md`

**Files:**
- Create: `docs/DEPLOY.md`

- [ ] **Step 1: Criar o checklist de deploy**

Criar `docs/DEPLOY.md` com o conteúdo:

```markdown
# Gamma App — Checklist de Deploy para Produção

> Execute os passos **na ordem exata** abaixo. O banco deve estar pronto antes
> do frontend ser deployed para evitar janelas de inconsistência.

---

## Pré-requisitos

- [ ] Supabase CLI autenticado (`supabase login`)
- [ ] Vercel CLI instalado ou acesso ao painel Vercel
- [ ] Acesso ao Supabase Dashboard do projeto

---

## Passo 1 — Configurar variáveis de ambiente na Vercel

No painel Vercel → Settings → Environment Variables, confirmar:

| Variável | Status |
|----------|--------|
| `VITE_SUPABASE_URL` | ✅ Configurada |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ✅ Configurada |
| `VITE_SUPABASE_ANON_KEY` | ✅ Configurada (mesmo valor que PUBLISHABLE_KEY) |
| `VITE_GOOGLE_MAPS_KEY` | ✅ Configurada |
| `VITE_APP_URL` | ✅ `https://gamma.app.br` |
| `VITE_SENTRY_DSN` | ⬜ Configurar antes do deploy |

---

## Passo 2 — Aplicar migrações no banco (ANTES do frontend)

```bash
supabase db push
```

Migrações que serão aplicadas (em ordem):
1. `20260316000016` — RLS para tabela locations
2. `20260316000017` — Pagamento atômico com carteira
3. `20260317000018` — Webhook de push notification
4. `20260317000020` — Constraints de integridade
5. `20260317000021` — Tabela pilot_earnings
6. `20260317000022` — Rate limit admin
7. `20260317000023` — Dados bancários do piloto
8. `20260317000024` — Revenue split 70/30
9. `20260317000025` — Bucket de imagens para anúncios
10. `20260317000026` — **Fixes críticos de segurança** (wallets, reviews, RLS)

Expected output: `Applying migration ... Done` para cada uma, sem erros.

---

## Passo 3 — Configurar Secrets das Edge Functions

No Supabase Dashboard → Edge Functions → Manage secrets, confirmar:

| Secret | Descrição |
|--------|-----------|
| `MP_ACCESS_TOKEN` | Token de acesso da conta Mercado Pago |
| `MP_WEBHOOK_SECRET` | Segredo para verificação de assinatura do webhook MP |
| `ALLOWED_ORIGIN` | `https://gamma.app.br` |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (para Edge Functions) |
| `SUPABASE_ANON_KEY` | Anon key |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging key (para push notifications) |

---

## Passo 4 — Criar usuário admin

Sem um usuário admin, o painel `/admin` é inacessível.

1. Supabase Dashboard → Authentication → Users → **Invite User**
2. Usar o email do admin (ex: `admin@gamma.app.br`)
3. Após o usuário confirmar o email, executar no SQL Editor:

```sql
-- Substituir pelo UUID real do usuário criado
INSERT INTO admin_users (user_id, email, role)
VALUES ('<user-uuid-from-auth.users>', 'admin@gamma.app.br', 'super_admin')
ON CONFLICT DO NOTHING;
```

---

## Passo 5 — Deploy do frontend

```bash
git push origin main
```

O Vercel detecta o push e inicia o deploy automaticamente.
Aguardar o build completar (≈ 2-3 minutos) e verificar no painel Vercel.

---

## Passo 6 — Smoke Test (fluxo completo)

Testar no dispositivo Android com o APK de produção ou no browser:

- [ ] **Cadastro:** Criar conta de passageiro com email + CPF
- [ ] **Login Google:** Testar OAuth (verificar redirect para gamma.app.br, não localhost)
- [ ] **Solicitar corrida:** Selecionar origem e destino
- [ ] **Pagamento PIX:** Gerar QR code, verificar que aparece sem erro CORS
- [ ] **Busca de piloto:** Tela de searching aparece corretamente
- [ ] **Piloto aceita:** Notificação chega, passa para tracking
- [ ] **Tracking:** Mapa exibe posição do piloto (verificar que VITE_GOOGLE_MAPS_KEY está correto)
- [ ] **Corrida concluída:** Tela de avaliação aparece
- [ ] **Avaliação:** Enviar avaliação e verificar que salva
- [ ] **Painel admin:** Acessar `/admin/login` e verificar que funciona

---

## Rollback

Se algum passo falhar após o deploy:

```bash
# Reverter o deploy na Vercel (painel → Deployments → Redeploy previous)
# Para reverter migrações: NÃO reverter automaticamente — analisar caso a caso
# Contato: lucas@simplix.com.br
```
```

- [ ] **Step 2: Verificar que o arquivo foi criado**

```bash
ls -la docs/DEPLOY.md
```

---

## Chunk 3: Verificação e Commit

### Task 6: Verificar build de produção

**Contexto:** Confirmar que nenhuma das correções introduziu erro de TypeScript ou bundling.

- [ ] **Step 1: Rodar build completo**

```bash
npm run build
```

Expected output: `✓ built in X.Xs` sem nenhum erro vermelho.
Avisos de chunk size (>500kB) são pre-existentes e aceitáveis.

- [ ] **Step 2: Verificar que não há erros de lint relevantes**

```bash
npm run lint 2>&1 | grep -E "error|Error" | head -20
```

Expected: sem erros novos introduzidos por este plano.

---

### Task 7: Git commit atômico

**Contexto:** Commitar todas as ~50 modificações desta e das sessões anteriores em um commit bem descrito.

- [ ] **Step 1: Verificar o que está staged/unstaged**

```bash
git status
```

- [ ] **Step 2: Adicionar todos os arquivos modificados e novos (por diretório, nunca git add -A)**

```bash
git add supabase/functions/ supabase/migrations/ supabase/config.toml
git add src/ capacitor.config.ts package.json package-lock.json vercel.json
git add .env.example docs/ public/ scripts/
git add .gitignore
```

- [ ] **Step 3: Verificar o que vai no commit**

```bash
git diff --cached --stat
```

Expected: todos os arquivos listados no `git status` anterior.

- [ ] **Step 4: Criar o commit**

```bash
git commit -m "$(cat <<'EOF'
feat: production readiness — security fixes, UX improvements, migrations

- Fix ALLOWED_ORIGIN fallback in 4 Edge Functions (was localhost:8080)
- Fix placeholder.svg broken image in 5 passenger/pilot screens
- Fix GoogleMapView env var error message inconsistency
- Fix cancel_ride_by_pilot using wrong UUID namespace (pilot_profiles vs auth)
- Fix GeolocationPositionError.PERMISSION_DENIED crash on Android WebView
- Fix duplicate PIX creation (removed pixData from useEffect deps)
- Fix commission display (pilot earns 30%, was showing 80%)
- Fix password reset URL broken in Capacitor (window.location.origin = localhost)
- Fix XSS vulnerability in AdDisplay ad link URLs
- Add prefers-reduced-motion CSS for accessibility
- Add touch-action:manipulation to eliminate 300ms tap delay on mobile
- Add Android back button confirmation dialog during active rides
- Add aria-labels to icon-only buttons (auth, nav, pilot toggle)
- Add active state indicator to bottom nav tabs
- Add CSS injection prevention in chart.tsx dangerouslySetInnerHTML
- Add .env.example documenting all required environment variables
- Add docs/DEPLOY.md production deploy checklist
- Add 10 pending migrations (000016-000026) including critical security fixes
- Add AdminRides page and AdDisplay component

Co-Authored-By: claude-flow <ruv@ruv.net>
EOF
)"
```

- [ ] **Step 5: Confirmar o commit**

```bash
git log --oneline -3
```

Expected: novo commit no topo do log.

---

## Chunk 4: Banco de Dados

### Task 8: Aplicar migrações via supabase db push

**Contexto:** 10 migrações existem no repositório mas não foram aplicadas no banco Supabase remoto. A migration `000026` é especialmente crítica — contém fixes de segurança que previnem roubo de saldo de carteira.

- [ ] **Step 1: Verificar autenticação Supabase CLI**

```bash
supabase status
```

Expected: projeto linkado e autenticado. Se não estiver: `supabase login && supabase link --project-ref yrhdcigbbahylzfzbsnk`

- [ ] **Step 2: Ver quais migrações serão aplicadas**

```bash
supabase db push --dry-run
```

Expected: lista com as 10 migrations de `000016` a `000026`.

- [ ] **Step 3: Aplicar as migrações**

```bash
supabase db push
```

Expected: `Applying migration 20260316000016_locations_rls.sql... Done` (repetido para cada uma). Sem erros.

- [ ] **Step 4: Confirmar que foram aplicadas**

```bash
supabase db push --dry-run
```

Expected: `No new migrations to apply.`

---

## Resumo de arquivos alterados

| Arquivo | Tipo | Motivo |
|---------|------|--------|
| `supabase/functions/mp-create-payment/index.ts` | Modify | CORS fallback fix |
| `supabase/functions/delete-account/index.ts` | Modify | CORS fallback fix |
| `supabase/functions/mp-refund/index.ts` | Modify | CORS fallback fix |
| `supabase/functions/wallet-topup/index.ts` | Modify | CORS fallback fix |
| `src/components/GoogleMapView.tsx` | Modify | Mensagem de erro consistente |
| `src/pages/passenger/PassengerHome.tsx` | Modify | placeholder.svg fix |
| `src/pages/passenger/SearchingPilot.tsx` | Modify | placeholder.svg fix (2x) |
| `src/pages/passenger/Tracking.tsx` | Modify | placeholder.svg fix |
| `src/pages/pilot/PilotDashboard.tsx` | Modify | placeholder.svg fix |
| `src/pages/pilot/ActiveRide.tsx` | Modify | placeholder.svg fix |
| `.env.example` | Create | Documentação de env vars |
| `docs/DEPLOY.md` | Create | Checklist de deploy |

---

## Critérios de sucesso

- [ ] `grep -rn "localhost:8080" supabase/functions/` → nenhuma linha
- [ ] `grep -rn "placeholder\.svg" src/` → nenhuma linha
- [ ] `grep -n "VITE_GOOGLE_MAPS_API_KEY" src/components/GoogleMapView.tsx` → nenhuma linha
- [ ] `npm run build` → sem erros
- [ ] `git log --oneline -1` → commit de produção visível
- [ ] `supabase db push --dry-run` → "No new migrations to apply"
