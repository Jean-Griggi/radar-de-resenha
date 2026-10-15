# Plano — Meta coletiva para rolês

Spec: `docs/back/meta-coletiva.md`
Status: aberto

## Fatia 1 — Persistência e histórico

- [ ] pendente

**O que fazer:**

- Definir e persistir meta por rolê, contribuição por participação, estado da decisão e histórico de alterações e decisões.
- Preservar a diferença entre contribuição não informada e valor informado.
- Representar valores em reais com precisão de centavos e respeitar os limites da spec.
- Criar migração compatível com os rolês e presenças já existentes.

**O que não fazer:**

- Não tratar contribuição informada como pagamento recebido ou confirmado.
- Não expor valores individuais em campos agregados ou histórico sem autorização.
- Não alterar dados de produção nem resetar bancos.

**Como validar:**

- Verificar a migração em banco local com rolês e presenças anteriores à funcionalidade.
- Verificar valores ausentes, mínimo opcional, limite por participante e precisão de centavos.
- Verificar que alterações preservam o histórico anterior.

**Arquivos prováveis:**

- `apps/api/src/db/migrate.ts`
- `apps/api/src/modules/roles/` (persistência e tipos do domínio)
- `apps/api/src/modules/roles/roles.test.ts`

## Fatia 2 — API da meta, participação e progresso

- [ ] pendente

**O que fazer:**

- Permitir que o organizador ative e atualize a meta do próprio rolê, exigindo data e horário de início.
- Integrar a contribuição ao fluxo de confirmação e atualização de presença.
- Calcular o total e o progresso somente com contribuições informadas por participantes confirmados e não cancelados.
- Retornar o progresso agregado às pessoas com acesso ao rolê e valores individuais apenas ao organizador e à pessoa que informou o valor.
- Aplicar validações de autenticação, autorização e limites monetários.

**O que não fazer:**

- Não permitir que uma pessoa altere a meta ou a contribuição de outra.
- Não contar participações canceladas no progresso.
- Não tratar valores como transações financeiras.

**Como validar:**

- Verificar configuração da meta, confirmação, alteração e cancelamento de participação.
- Verificar rejeição de meta sem data ou horário, contribuição abaixo do mínimo ou acima do valor da meta.
- Verificar cálculo abaixo, igual e acima da meta, incluindo contribuição ausente e cancelamento.
- Com contas diferentes, verificar privacidade dos valores individuais e recusa de operações sem autenticação ou sem autorização.

**Arquivos prováveis:**

- `apps/api/src/modules/roles/roles.schema.ts`
- `apps/api/src/modules/roles/roles.routes.ts`
- `apps/api/src/modules/roles/roles.service.ts` ou novos arquivos do domínio de meta
- `apps/api/src/modules/roles/roles.test.ts`
- `packages/shared/src/types.ts`

## Fatia 3 — Prazos, notificações e decisões

- [ ] pendente

**O que fazer:**

- Notificar o organizador dois dias antes do rolê se a meta não tiver sido atingida; se a meta for ativada faltando menos de dois dias, notificar imediatamente.
- Permitir que apenas o organizador decida cancelar, adiar ou manter o rolê.
- Encerrar a solicitação e deixar o rolê prosseguir caso a meta seja atingida enquanto a decisão estiver pendente.
- Cancelar automaticamente o rolê se não houver decisão até uma hora antes do início.
- Ao adiar, preservar meta e contribuições e recalcular os prazos para a nova data.
- Tornar o processamento dos prazos idempotente para evitar notificações ou decisões duplicadas.
- Usar a localidade configurada pelo organizador no perfil. Conferir se o campo atual de cidade fornece um fuso horário confiável; se não, incluir uma preferência explícita de fuso horário.

**O que não fazer:**

- Não usar o fuso do servidor como substituto silencioso da localidade do organizador.
- Não duplicar notificações nem cancelar rolês já cancelados, adiados com novos prazos ou com meta atingida.
- Não implementar push ou integração de pagamentos.

**Como validar:**

- Verificar prazos de dois dias e uma hora no fuso do organizador, além da notificação imediata quando faltarem menos de dois dias.
- Verificar adiamento, decisão explícita, meta atingida durante a pendência e falta de decisão.
- Verificar que reprocessar os prazos não duplica notificações ou cancelamentos.
- Verificar que apenas o organizador decide e que o histórico das decisões respeita o acesso ao rolê.

**Arquivos prováveis:**

- `apps/api/src/modules/roles/` (decisões e prazos)
- `apps/api/src/modules/notifications/notifications.service.ts`
- `apps/api/src/db/migrate.ts` (se forem necessários campos de fuso ou controle do processamento)
- `apps/api/src/modules/users/users.schema.ts`
- `apps/api/src/modules/users/users.service.ts`
- `apps/api/src/modules/users/users.map.ts`
- `apps/web/src/features/settings/SettingsScreen.tsx` (se for necessário escolher o fuso no perfil)
- Inicialização ou agendamento da API, a localizar durante a fatia

## Fatia 4 — Configuração, contribuição e progresso na interface

- [ ] pendente

**O que fazer:**

- Permitir configurar a meta ao criar e editar um rolê.
- Permitir informar ou alterar contribuição ao confirmar presença, respeitando os limites definidos.
- Mostrar meta, total agregado, progresso e estado no detalhe do rolê.
- Exibir valores individuais somente para o organizador e para a própria pessoa participante.
- Explicar que os valores são informativos e não pagamentos confirmados.

**O que não fazer:**

- Não criar fluxo de pagamento nem expor valores individuais a outros participantes.
- Não definir uma nova identidade visual nesta fatia; seguir os componentes atuais do produto.

**Como validar:**

- Verificar formulário com meta ativa e inativa, validação de data e horário e confirmação sem contribuição quando não há mínimo obrigatório.
- Conferir estados de carregamento, erro e rolê sem participantes.
- Conferir que cada tipo de usuário vê somente os valores permitidos.

**Arquivos prováveis:**

- `apps/web/src/features/roles/RoleFormView.tsx`
- `apps/web/src/features/roles/NewRoleScreen.tsx`
- `apps/web/src/features/roles/EditRoleScreen.tsx`
- `apps/web/src/features/roles/RoleDetailScreen.tsx`
- `packages/shared/src/types.ts`

## Fatia 5 — Decisão e histórico na interface

- [ ] pendente

**O que fazer:**

- Apresentar ao organizador a solicitação de decisão e as opções cancelar, adiar e manter.
- Solicitar nova data ao adiar e mostrar o estado atualizado do rolê.
- Apresentar às pessoas com acesso ao rolê o estado da decisão e o histórico permitido.
- Exibir o cancelamento automático e o encerramento da solicitação se a meta for atingida.

**O que não fazer:**

- Não permitir decisões por participantes que não sejam organizadores.
- Não revelar valores individuais no histórico a quem não tem permissão.
- Não incluir push, pagamentos ou redesign completo.

**Como validar:**

- Conferir as três decisões e os estados pendente, cancelado, adiado e mantido.
- Conferir falta de decisão até uma hora antes do início e fechamento automático.
- Conferir visibilidade do histórico e privacidade dos valores individuais.

**Arquivos prováveis:**

- `apps/web/src/features/roles/RoleDetailScreen.tsx`
- `apps/web/src/features/notifications/NotificationsScreen.tsx`
- `apps/api/src/modules/roles/roles.test.ts` (contrato das decisões)
