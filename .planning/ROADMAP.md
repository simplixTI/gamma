# Roadmap — Gamma v1.0

## Milestone 1: Core UX Polish + Bugs (atual)

**Objetivo:** Experiência sem bugs, pronta para testes reais com usuários.

### Phase 1: Mapa Limpo (Uber-like)

**Goal:** Mapa Google com estilo customizado — sem POIs comerciais, sem propaganda, paleta marinha idêntica ao Uber.

- Aplicar estilo customizado no Google Maps (sem POIs comerciais, sem propaganda, paleta marinha)
- Marker de piloto com ícone de barco animado
- Rota azul entre origem e destino

**Requirements:** R7.1, R7.2, R7.3

---

### Phase 2: Tabela de Preços por Trecho

**Goal:** Preço fixo por par de piers — sem cálculo por distância, valor determinístico e exibido corretamente em toda a UI.

- Definir e implementar matriz de preços fixa por par origem→destino
- Substituir cálculo por distância por tabela fixa
- Exibir preço correto em RequestRide e confirmação

**Requirements:** R2.3, R2.12

---

### Phase 3: Avaliações

**Goal:** Sistema de avaliação mútua passageiro↔piloto funcional, com ratings persistidos e visíveis nos perfis.

- Tela de avaliação após conclusão (passageiro avalia piloto)
- Tela de avaliação pelo piloto (piloto avalia passageiro)
- Rating médio no perfil do piloto
- Rating médio no perfil do passageiro

**Requirements:** R5.1, R5.2, R5.3, R5.4

---

### Phase 4: Pagamento por Cartão

**Goal:** Passageiro pode pagar com cartão de crédito além de PIX, com cobrança automática ao concluir corrida e recibo digital.

- Integrar processador de cartão de crédito (Stripe ou Pagar.me)
- Tela de cadastro/gerenciamento de cartão
- Cobrança automática ao concluir corrida
- Recibo digital

**Requirements:** R3.2, R3.3, R3.4, R3.5

---

### Phase 5: Correções e Polimento Final

**Goal:** Fluxo completo de ponta a ponta sem bugs, upload de foto funcionando, cancelamento correto e performance aceitável.

- Verificar upload de foto de perfil (passageiro e piloto)
- Verificar fluxo de cancelamento com motivo
- Testar fluxo completo de ponta a ponta
- Performance e loading states

**Requirements:** R6.4, R6.5

---

## Milestone 2: Publicação nas Lojas

**Objetivo:** App disponível na App Store e Play Store.

### Phase 6: Capacitor Setup

**Goal:** App React empacotado como app nativo iOS e Android com permissões configuradas e testado em dispositivo físico.

- Instalar e configurar Capacitor
- Configurar permissões: geolocalização, notificações, câmera
- Testar em dispositivo físico iOS e Android

**Requirements:** R10.1, R10.3

---

### Phase 7: Assets e Identidade

**Goal:** Ícone, splash screen e screenshots prontos para submissão nas lojas.

- Ícone do app (1024x1024 + variantes)
- Splash screen
- Screenshots para as lojas

**Requirements:** R10.2

---

### Phase 8: Notificações Nativas

**Goal:** Push notifications nativas funcionando em iOS e Android para os eventos críticos da corrida.

- Configurar Firebase Cloud Messaging (Android)
- Configurar APNs (iOS)
- Push notifications: corrida aceita, piloto chegou

**Requirements:** R8.3

---

### Phase 9: Build e Submissão

**Goal:** App publicado na App Store e Play Store.

- Build iOS → submeter para App Store Review
- Build Android → submeter para Play Store Review
- Políticas de privacidade e termos de uso

**Requirements:** R10.4, R10.5, R10.6

---
