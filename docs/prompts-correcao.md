# Prompts — executar um passo da correção

Cole **um** destes blocos no chat do Cursor (Agent). A IA lê o plano, pega **só aquele passo** e implementa.

Plano completo: [plano-correcao.md](plano-correcao.md)  
Regras gerais da IA: [ai/plano-execucao.md](ai/plano-execucao.md)

Não cole dois passos de uma vez. Stories: [plano-stories.md](plano-stories.md).

---

## Como usar

1. Abra [plano-correcao.md](plano-correcao.md) e veja o próximo passo ainda `[ ]`.
2. Copie o prompt correspondente abaixo (ou o genérico, trocando o número).
3. Cole no chat em modo Agent.
4. Quando terminar, a IA deve marcar o passo `[x]` no plano e no registro de execução.
5. Você valida (DevTools / tela) e só então cola o prompt do próximo.

Ordem obrigatória: **0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9**. Não pular 1 e 2.

---

## Prompt genérico (troque o N)

Use quando quiser só dizer o número.

```
Leia docs/plano-correcao.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo N do plano de correção.
- Siga à risca as seções "O que fazer", "Como validar" e "Não fazer" desse passo.
- Não implemente outro passo, nem stories, nem mobile/desktop.
- Não invente escopo. Não reescreva visual/temas.
- Idioma: português, direto.
- Ao terminar: marque o passo como [x] em docs/plano-correcao.md, preencha a tabela "Registro de execução", e diga o que mudou + como eu valido.
```

Substitua `N` por `0`, `1`, `2`, … `9`.

Atalho ainda menor, se o chat já conhece o plano:

```
Execute o passo N de docs/plano-correcao.md. Só esse passo. Siga o prompt em docs/prompts-correcao.md.
```

---

## Passo 0 — Baseline (humano; a IA só orienta)

```
Leia docs/plano-correcao.md (Passo 0) e docs/ai/plano-execucao.md.

Não altere código. Me oriente a reproduzir os bugs em produção (Network, Console, amigos, filtros de rolê, upload de foto).

Quero uma checklist curta do que abrir e o que anotar (tempo de GET /feed, /roles, /friends, /photos; status; erros). No final, deixe um template de relatório para eu colar os resultados.

Não implemente os passos 1–9.
```

---

## Passo 1 — Infra da API

```
Leia docs/plano-correcao.md (Passo 1) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 1 — Infra da API.

O que fazer:
- apps/api/src/db/client.ts: subir o pool (max ~5–10 no serverless; NÃO deixar max: 1). Manter prepare: false. Não rodar todas as migrations CREATE TABLE IF NOT EXISTS em todo cold start — tabela schema_migrations (ou equivalente) para aplicar só o que falta.
- apps/api/src/lib/storage.ts: não listar/criar bucket do Supabase em todo boot se o bucket já existe. Falhar claro se env incompleto.
- apps/api/src/db/migrate.ts: índices friendships (receiver_id, status), (requester_id, status), photos (role_id), feed_events (actor_id), attendances (role_id).

NÃO reescrever serializeRole, feed, amigos, fotos nem o front.

Ao terminar: marcar Passo 1 como [x] em docs/plano-correcao.md, preencher o registro, listar arquivos e como validar (/health, cold start).
```

---

## Passo 2 — N+1 de rolês e feed

```
Leia docs/plano-correcao.md (Passo 2) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 2 — matar N+1 de rolês e feed.

O que fazer:
- serializeRole / counts em batch (creators IN, attendances/comments/reviews/capa/myAttendance agrupados). Sem query por item.
- listRoles: paginar (limit 30). Filtros no SQL quando possível. Se um item falhar, não derrubar a lista inteira (Promise.all frágil).
- getFeed: poucas queries (eventos + actors + rolês/reviews/posts + reações em batch). Card leve no feed — sem serializeRole completo. Item órfão: pular, não 500.

NÃO fazer amigos, timezone fino (isso é passo 4), fotos, stories nem AppShell.

Ao terminar: marcar Passo 2 como [x], preencher o registro, dizer como validar (Network de GET /feed e GET /roles < ~1s com dezenas de itens).
```

---

## Passo 3 — Amigos

```
Leia docs/plano-correcao.md (Passo 3) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 3 — amigos (API + UI).

API (social.service.ts, users.service.ts, users.routes.ts):
- Pedido rejected pode ser reaberto (não travar para sempre com return existing).
- Já amigos: 400 claro. Pending: resposta sempre camelCase.
- Unique de par unordered (LEAST/GREATEST ou equivalente) — sem duas linhas A→B e B→A.
- PUT /friends/requests/:id: Zod exige status accepted|rejected. Sem status válido → 400, NUNCA aceitar por omissão.
- suggestions: excluir amigos aceitos e qualquer pending nos dois sentidos.
- Cancelar pedido outgoing (DELETE se requester).

Front /amigos e perfil/[username]:
- Loading, erro visível, toast, botão desabilitado.
- Labels: Adicionar / Aceitar+Recusar / Pedido enviado+Cancelar / Amigos.
- Clique em "Pedido enviado" não pode ser no-op.

NÃO mexer em feed N+1, fotos, timezone, stories.

Ao terminar: marcar Passo 3 como [x], preencher o registro, listar o fluxo de teste (pedir, aceitar, recusar e pedir de novo, pedido cruzado, labels do perfil).
```

---

## Passo 4 — Timezone e filtros de rolê

```
Leia docs/plano-correcao.md (Passo 4) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 4 — timezone e filtros de rolê.

O que fazer:
- roleStatus / toDateKey: data+hora em America/Sao_Paulo (nunca new Date(`${date}T${time}:00`) sem timezone no servidor UTC).
- Front /roles: AbortController (ou sequence id) ao trocar filtro. Não aplicar resposta velha.
- Empty state "você não tem rolê" só se não houver erro.

NÃO refatorar serializeRole de novo (já é passo 2). NÃO amigos, fotos, stories.

Ao terminar: marcar Passo 4 como [x], preencher o registro, dizer como validar (rolê 22h Brasília em Próximos; troca rápida de filtros).
```

---

## Passo 5 — Fotos e avatars

```
Leia docs/plano-correcao.md (Passo 5) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 5 — fotos e avatars.

O que fazer:
- Avatar e galeria: onError → fallback (iniciais / placeholder), não ícone quebrado.
- Aceitar image/heic e image/heif ou mensagem clara pedindo JPEG no iPhone.
- Banco guarda path relativo; publicUrl() é o único que monta URL absoluta.
- deletePhoto / deleteAudio / deleteAlbum: chamar removeStored (hoje existe e não é usada).
- Feed photo_added inclui url da foto (batch).
- Lista de rolês mostra coverPhoto.
- listAlbums sem getAlbum em loop.
- Gravação de áudio: cancelar o setTimeout de 5 min ao apertar Parar.

NÃO stories. NÃO reabrir N+1 do feed. NÃO amigos.

Ao terminar: marcar Passo 5 como [x], preencher o registro, dizer como validar (avatar 404, upload, delete some do storage, capa no card, foto no feed).
```

---

## Passo 6 — Front: erros, corridas, loading

```
Leia docs/plano-correcao.md (Passo 6) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 6 — front (erros, corridas, loading).

Páginas: home, rolês, amigos, fotos, perfil, explorar.

Padrão: loading / error / empty separados. Empty só se loading false e error vazio. try/catch + apiErrorMessage. Abortar fetch ao desmontar / mudar filtro / username. 401: revisar interceptor (rotas públicas esqueci-senha e redefinir-senha). Sem catch vazio.

NÃO mudar backend além do estritamente necessário. NÃO stories. NÃO AppShell cache (passo 7).

Ao terminar: marcar Passo 6 como [x], preencher o registro, dizer como validar (API desligada mostra erro; troca rápida de perfil não mistura dados).
```

---

## Passo 7 — Enxugar o AppShell

```
Leia docs/plano-correcao.md (Passo 7) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 7 — enxugar o AppShell.

O que fazer:
- Não chamar /spotify/status se o usuário não conectou Spotify (ou cache/lazy).
- Cache curto (~60s) para sugestões + próximos rolês, compartilhado entre páginas.
- WaveBackground: aliviar feDropShadow no mobile (prefers-reduced-motion ou esconder filtro em tela estreita).

NÃO redesenhar o layout. NÃO stories. NÃO amigos.

Ao terminar: marcar Passo 7 como [x], preencher o registro, dizer como validar (Network ao navegar entre páginas; scroll no celular).
```

---

## Passo 8 — Busca, explorar, conteúdo do perfil

```
Leia docs/plano-correcao.md (Passo 8) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 8 — busca, explorar, conteúdo do perfil.

O que fazer:
- searchAll: NÃO varrer todas as tags do banco. Filtro limitado (ILIKE / limite).
- explore / serializeReview na listagem: card leve, sem nestComments + fotos + áudios. Detalhe hidrata o resto.
- userContent: limitar (ex. 20) e usar batch do passo 2.
- GET /roles/:id/comments e GET /roles/:id/attendance NÃO devem chamar serializeRoleDetail inteiro.

NÃO stories. NÃO reabrir passo 2/3/5 sem necessidade.

Ao terminar: marcar Passo 8 como [x], preencher o registro, dizer como validar (busca de 1 letra não mata a API; perfil pesado abre; detalhe do rolê continua completo).
```

---

## Passo 9 — Hardening do front

```
Leia docs/plano-correcao.md (Passo 9) e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 9 — hardening do front.

O que fazer:
- Error Boundary no shell (erro de um card não derruba o app).
- img loading="lazy" na galeria.
- Links de criar rolê só em /roles/new (novo já redireciona).
- Reactions: catch + toast.
- settings, calendar, notifications, music: mesmo padrão loading/error do passo 6.

NÃO implementar stories neste passo. Stories só depois, em doc à parte, quando este passo estiver [x].

Ao terminar: marcar Passo 9 como [x], preencher o registro, confirmar que o backlog de stories continua bloqueado até você pedir.
```

---

## Stories

A feature está desenhada e implementada em [plano-stories.md](plano-stories.md).
