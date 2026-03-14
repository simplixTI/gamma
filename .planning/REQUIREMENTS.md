# Requirements — Gamma v1.0

## Escopo

MVP completo para lançamento nas lojas (App Store + Play Store).
Base: codebase atual (React SPA) → evoluir para app publicável.

---

## R1 — Autenticação

- R1.1 Login com email + senha (passageiro e piloto) ✅ existe
- R1.2 Login com Google OAuth ✅ existe (AuthCallback implementado)
- R1.3 Login por OTP (telefone) ✅ existe
- R1.4 Redirecionamento correto pós-login por role ✅ existe
- R1.5 Perfil obrigatório completo antes de usar (nome, telefone, foto) — parcialmente existe

## R2 — Fluxo de Corrida (Passageiro)

- R2.1 Selecionar pier de origem (lista fixa de 6 piers) ✅ existe
- R2.2 Selecionar pier de destino ✅ existe
- R2.3 Ver preço calculado antes de confirmar ✅ existe (distância → preço)
- R2.4 Selecionar quantidade de passageiros ✅ existe
- R2.5 Confirmar corrida → cria registro no banco ✅ existe
- R2.6 Tela de busca com animação + timer ✅ existe
- R2.7 Receber notificação quando piloto aceitar ✅ existe (realtime + polling)
- R2.8 Acompanhar piloto no mapa em tempo real ✅ existe (GPS broadcast)
- R2.9 Ver status: a caminho → chegou → em corrida → concluído ✅ existe
- R2.10 Cancelar corrida antes de aceitar ✅ existe
- R2.11 Chat em tempo real com piloto ✅ existe
- R2.12 Tabela de preços fixa por par de piers — **falta implementar**
- R2.13 Tela de conclusão com resumo da corrida ✅ existe

## R3 — Pagamento (Passageiro)

- R3.1 Pagamento por PIX (QR Code gerado via Edge Function) ✅ existe parcialmente
- R3.2 Pagamento por cartão de crédito — **falta implementar**
- R3.3 Histórico de pagamentos — **falta implementar**
- R3.4 Confirmação de pagamento → liberar próxima corrida ✅ existe parcialmente
- R3.5 Recibo digital após pagamento — **falta implementar**

## R4 — Fluxo de Corrida (Piloto)

- R4.1 Dashboard com mapa e status online/offline ✅ existe
- R4.2 Receber solicitações de corrida em tempo real ✅ existe
- R4.3 Ver detalhes da corrida antes de aceitar (origem, destino, valor, passageiros) ✅ existe
- R4.4 Aceitar corrida → fluxo a caminho → chegou → em corrida → concluído ✅ existe
- R4.5 GPS ativo durante corrida (transmite posição para passageiro) ✅ existe
- R4.6 Chat em tempo real com passageiro ✅ existe
- R4.7 Cancelar corrida com motivo ✅ existe parcialmente
- R4.8 Histórico de corridas ✅ existe
- R4.9 Tela de ganhos com gráficos ✅ existe

## R5 — Avaliações

- R5.1 Passageiro avalia piloto (1–5 estrelas + comentário) após corrida — **falta implementar**
- R5.2 Piloto avalia passageiro após corrida — **falta implementar**
- R5.3 Rating médio visível no perfil do piloto — **falta implementar**
- R5.4 Rating médio visível no perfil do passageiro — **falta implementar**

## R6 — Perfis

- R6.1 Perfil do passageiro (nome, foto, telefone) ✅ existe
- R6.2 Perfil do piloto (nome, foto, telefone, embarcação, documentos) ✅ existe
- R6.3 Edição de perfil ✅ existe
- R6.4 Upload de foto de perfil — **verificar implementação**
- R6.5 Status de aprovação do piloto — **verificar implementação**

## R7 — Mapa

- R7.1 Mapa Google limpo (sem POIs comerciais, sem propaganda) — **falta estilo customizado**
- R7.2 Marker de piloto animado (barco se movendo) — parcialmente existe
- R7.3 Rota desenhada entre origem e destino — ✅ existe
- R7.4 Centralizar mapa no arquipélago corretamente ✅ existe
- R7.5 Botão de centralizar na posição atual ✅ existe

## R8 — Notificações

- R8.1 Push notification quando piloto aceitar corrida ✅ existe (web notifications)
- R8.2 Push notification quando piloto chegar ✅ existe
- R8.3 Notificações nativas no app mobile — **falta para versão nativa**

## R9 — Configurações

- R9.1 Modo escuro / claro ✅ existe
- R9.2 Configurações de notificação ✅ existe
- R9.3 Idioma (português) ✅ existe

## R10 — Publicação nas Lojas

- R10.1 Converter SPA para app mobile (Capacitor ou React Native)
- R10.2 Configurar ícones, splash screen, nome do app
- R10.3 Configurar permissões (localização, notificações, câmera)
- R10.4 Build iOS para App Store
- R10.5 Build Android para Play Store
- R10.6 Políticas de privacidade e termos de uso

---

## Priorização MVP

**Crítico (deve funcionar antes do lançamento):**
R1, R2, R3.1, R3.2, R4, R5, R6, R7.1, R7.2

**Importante:**
R3.3, R3.4, R3.5, R8, R9

**Pós-MVP:**
R10 (conversão para app nativo)
