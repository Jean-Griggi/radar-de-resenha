# Plano — Localização no mapa

Spec: docs/back/localizacao.md
Status: aberto

## Fatia 1 — Coordenadas no perfil

- [x] feita

2026-09-25: par válido volta no GET de quem pode ver (dono, perfil público e quem segue); `null` omite o par; latitude 91, longitude 181 e meia coordenada respondem 400 sem devolver o ponto salvo; estranho em perfil privado não recebe latitude nem longitude; outra sessão não altera o ponto; a resposta não traz chave de mapa. Verificado em `apps/api/src/modules/auth/auth.test.ts`.

**O que fazer:**

Guardar a localização como par `latitude` e `longitude`, ou os dois ausentes. Migração em `users`. O `PUT` do perfil autenticado, o mesmo em que a pessoa já edita os próprios dados, aceita o par ou `null` para limpar. Latitude fora de −90 a 90 ou longitude fora de −180 a 180 responde `400` e não grava; a mensagem não devolve o ponto anterior. O `GET` do perfil que a pessoa já pode ver inclui o par quando existe. Perfil reduzido de estranho em conta privada omite `latitude` e `longitude`. O corpo não escolhe o id de outra conta.

**O que não fazer:**

Mapa do local do rolê, GPS contínuo, mapa com várias pessoas, app mobile, app desktop e outro provedor de mapa. Não gravar a chave do Google Maps no banco nem devolvê-la no JSON de perfil. Não aceitar meia coordenada.

**Como validar:**

- Par válido gravado volta no perfil de quem já pode ver, inclusive o dono.
- `null` tira o par da resposta.
- Latitude 91 ou longitude 181 responde `400` e o par salvo não muda.
- Estranho em perfil privado não recebe latitude nem longitude.
- Outra sessão não altera o ponto. A resposta não contém a chave do mapa.

**Arquivos prováveis:**

`apps/api/src/db/migrate.ts`, `apps/api/src/modules/users/users.schema.ts`, `users.service.ts`, `users.map.ts`, `packages/shared/src/types.ts`

## Fatia 2 — Minimapa na edição e no perfil

- [ ] pendente

**O que fazer:**

Na edição do próprio perfil, a pessoa logada vê um minimapa do Google Maps e escolhe o lugar com um clique. Salvar usa o par da fatia 1. Limpar a localização tira o ponto. No perfil que a pessoa já pode ver, o mapa abre centrado no ponto salvo. Se o marcador aceitar imagem, o ponto usa o avatar que o perfil já mostra. Se não aceitar, o ponto continua visível, sem foto. A chave vem da configuração do navegador, restrita à origem da web. Sem chave, o mapa não abre e a tela não conclui a escolha de um ponto.

**O que não fazer:**

Não enviar outra URL de imagem pelo mapa. Não colocar a chave na resposta de perfil, no banco ou no repositório. Não desenhar mapa de rolê, rastro ou várias pessoas. Não usar outro provedor.

**Como validar:**

- Com a chave configurada, clicar, salvar, reabrir o perfil e ver o mapa no ponto escolhido.
- Quem pode ver o perfil vê o mesmo ponto. Quem só vê o perfil privado reduzido não vê o ponto.
- Se o marcador aceitar imagem, a foto da pessoa aparece no ponto. Se não aceitar, o ponto continua visível.
- Limpar tira o ponto do mapa.
- Sem a chave, a tela não conclui a escolha.

**Arquivos prováveis:**

`apps/web/src/features/settings/SettingsScreen.tsx`, `apps/web/src/features/users/ProfileScreen.tsx`
