# Estado do Projeto — Gamma

**Atualizado:** 2026-03-13

## Status atual

Milestone 1 — em andamento
Fase atual: Nenhuma fase planejada ainda

## Decisões tomadas

- Preço: tabela fixa por par de piers (valores a definir com o Lucas)
- Pagamento: PIX + cartão de crédito
- Avaliação: mútua (passageiro ↔ piloto), 1–5 estrelas
- Distribuição: App Store + Play Store (objetivo final)
- Stack mobile: Capacitor (wrapping do React atual) — decisão pendente de confirmação
- Mapa: Google Maps com estilo customizado (sem propaganda)

## Contexto de desenvolvimento

- Sem usuários reais ainda (desenvolvimento e testes)
- Google Maps API key configurada no .env
- Supabase configurado com auth Google OAuth ativo
- Edge Functions: PIX via BlackCat Pagamentos (existe), cartão (falta)

## Bloqueios conhecidos

- Valores da tabela de preços por trecho: Lucas precisa definir
- Processador de cartão: escolher entre Stripe e Pagar.me
