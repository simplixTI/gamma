# Gamma — Projeto

## O que é

Gamma é um serviço de transporte aquático estilo Uber para o arquipélago da Ilha de Gigoia, no Rio de Janeiro. Passageiros solicitam lanchas entre 5–6 pontos (piers) fixos nas ilhas; pilotos autônomos aceitam corridas e os transportam. Tudo via app mobile (iOS + Android).

## Visão

Criar a experiência mais limpa e elegante de mobilidade aquática — tão fluida quanto o Uber, mas sem poluição visual. Interface minimalista, mapas limpos, pagamento em segundos.

## Usuários

- **Passageiros:** Moradores e visitantes das ilhas que precisam de transporte rápido entre piers
- **Pilotos:** Barqueiros autônomos que usam o app para receber e gerenciar corridas

## Como funciona

1. Passageiro escolhe pier de origem e destino (lista fixa de 5–6 pontos)
2. Preço é calculado automaticamente por par de piers (tabela fixa)
3. Piloto disponível aceita → passa pelo fluxo: a caminho → chegou → em corrida → concluído
4. Passageiro acompanha no mapa em tempo real
5. Pagamento por cartão de crédito ou PIX no app
6. Ambos se avaliam ao final

## Modelo de negócio

- Comissão por corrida (% sobre o valor)
- Preço por trecho: valor fixo por par origem→destino (a definir)
- Pilotos são autônomos (não empregados)

## Stack atual

- React 18 + TypeScript + Vite (SPA)
- Supabase (auth, realtime, banco, edge functions)
- Google Maps JS API (`@react-google-maps/api`)
- Tailwind CSS + shadcn/ui
- PIX via BlackCat Pagamentos (Edge Function)

## Distribuição

- Web (desenvolvimento/teste atual)
- App Store (iOS) + Play Store (Android) — objetivo final
- Estratégia: React Native ou wrapper Capacitor (a decidir)

## Status

Em desenvolvimento e testes. Nenhum usuário real ainda.

## Identidade visual

- Nome: Gamma
- Paleta: azul marinho / oceano
- Interface: elegante, limpa, sem propagandas, similar ao Uber

## Região de operação

Arquipélago de Gigoia — Barra da Tijuca, Rio de Janeiro
Piers: Pier Principal Gigoia, Marina Barra Clube, Pier Ilha Itanhangá, Pier Norte Gigoia, Pier Ilha Primeira, Canal de Marapendi
