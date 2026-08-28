# Plano de correção — bugs em produção

Guia para arrumar o Resenhômetro **depois do lançamento**. Stories (estilo Instagram) ficam no final, **só depois** destes passos.

Como vamos trabalhar: um passo de cada vez. Cada passo tem causa, arquivos, o que mudar e como validar. Não misturar escopo. Mobile, desktop, chat e pagamentos continuam fora.

---

## Como usar este documento

1. Abrir o passo atual.
2. Copiar o prompt desse passo em [prompts-correcao.md](prompts-correcao.md) e colar no chat (modo Agent).
3. A IA implementa **só** aquele passo.
4. Validar com a seção **Como validar**.
5. Marcar o passo (`[x]`) e ir para o próximo.

Status: `[ ]` pendente · `[~]` em andamento · `[x]` feito

Atalho:

```
Execute o passo N de docs/plano-correcao.md. Só esse passo. Siga o prompt em docs/prompts-correcao.md.
```

---

## Diagnóstico (varredura)

Sintomas relatados: lentidão extrema, bug em adicionar amigos, rolês que às vezes não aparecem, fotos que bugam, front que buga.

Causas reais encontradas no código (não são “pode ser”). Várias se cruzam: a mesma N+1 que deixa o site lento também faz a listagem de rolês estourar timeout e “sumir”.

### A. Lentidão extrema

A API na Vercel é uma função serverless. Em **todo cold start** ela:

1. Conecta no Postgres (`initDb`)
2. Roda **todas** as migrations de novo (`applyMigrations`)
3. Lista buckets do Supabase (`ensureStorage`)

Depois disso, o pool do Postgres está com **`max: 1`**. Todas as queries de um request (e, na prática, de requests concorrentes no mesmo isolate) passam por **uma** conexão.

Em cima disso, quase toda listagem faz **N+1**:

| Endpoint | O que acontece |
| -------- | -------------- |
| `GET /feed` | Até 40 eventos; cada um chama `getReactionSummary` + `serializeRole` (mais ~6 queries). Fácil passar de **200–400 queries** no home. |
| `GET /roles` | Carrega **todos** os rolês e, para cada um, `serializeRole` (user + 4 counts + presença). Filtro `proximos`/`passados` é em memória **depois**. |
| `GET /explore` e `GET /search` | `serializeRole` / `serializeReview` por item. Search ainda faz `SELECT tags FROM roles UNION ALL SELECT tags FROM reviews` **sem limite**. |
| `GET /users/:username/content` | Serializa **todos** os rolês do perfil. |
| `GET /albums` | `getAlbum` (com fotos) por álbum. |
| `GET /notifications` | `getUserRow` por notificação. |
| `GET /calendar` | Todos os rolês do usuário, filtro de mês no JS. |

O shell autenticado (`AppShell`) dispara **mais 3–4 requests em toda página**: unread de notificações, Spotify, calendário e sugestões.

Conclusão: a lentidão não é “o Next está pesado”. É **banco em série + serverless + N+1**.

Arquivos-chave:

- `apps/api/src/db/client.ts` (`max: 1`, migrations no boot)
- `apps/api/src/lib/helpers.ts` (`getReactionSummary`)
- `apps/api/src/modules/roles/roles.service.ts` (`serializeRole`, `listRoles`)
- `apps/api/src/modules/social/social.service.ts` (`getFeed`)
- `apps/api/src/modules/search/search.service.ts`
- `apps/web/src/components/AppShell.tsx`

### B. Bug em adicionar amigos

Backend (`requestFriend` / `respondFriend` / `suggestions`):

1. **Pedido recusado trava para sempre.** Se já existe linha (pending ou rejected), o código faz `return existing` e não cria de novo. Recusar = nunca mais pedir.
2. **Unique só é `(requester_id, receiver_id)`.** A + B e B + A são duas linhas. Dois pedidos cruzados ao mesmo tempo geram estado quebrado.
3. **Sugestões ignoram amizade.** Excluem só quem você **segue**, não amigos nem pedidos pendentes. “Adicionar” aparece para quem já é amigo.
4. **Quando o pedido já existe**, a API devolve o **row cru** (`requester_id` snake_case) em um caminho e camelCase no outro.
5. **`PUT /friends/requests/:id` aceita por padrão** se o body vier sem `status` (qualquer valor inválido vira `accepted`).

Frontend:

6. Página `/amigos`: erros engolidos (`load().catch(() => undefined)`). Falha parece “ninguém pediu / sem amigos”.
7. Sem loading, sem desabilitar botão → clique duplo.
8. Perfil: botão diz **“Pedido enviado”** para qualquer `pending`, inclusive quando **você** é quem deve aceitar. Clicar no pedido outgoing **não faz nada** (não cancela).

Arquivos-chave:

- `apps/api/src/modules/social/social.service.ts`
- `apps/api/src/modules/users/users.service.ts` (`suggestions`, `listFriends`)
- `apps/web/src/app/amigos/page.tsx`
- `apps/web/src/app/perfil/[username]/page.tsx`

### C. Rolês às vezes não aparecem

Não é um único bug. É o conjunto:

1. **Timeout / 500.** `listRoles` + `serializeRole` em todos os itens, com pool de 1, estoura os 30s da Vercel. O front mostra vazio ou erro.
2. **`Promise.all` frágil.** Se **um** rolê quebrar na serialização, a lista inteira some.
3. **Corrida de filtro.** Trocar “Todos / Próximos / Meus” rápido: a resposta antiga pode chegar depois e apagar a lista certa. Sem `AbortController`.
4. **Timezone.** `roleStatus` faz `new Date(\`${date}T${time}:00\`)` **sem timezone**. Na Vercel isso é UTC. Um rolê às 21h no Brasil vira 21h UTC e pode cair em `past` cedo demais (filtro “Próximos” esconde).
5. **Erros silenciados** no rail “Próximos rolês” (`AppShell`): falha = “Nada marcado ainda.”
6. Feed de foto/áudio não hidrata o rolê associado de forma consistente; item de `photo_added` **não carrega a foto**.

Arquivos-chave:

- `apps/api/src/modules/roles/roles.service.ts`
- `apps/api/src/lib/helpers.ts` (`roleStatus`, `toDateKey`)
- `apps/web/src/app/roles/page.tsx`
- `apps/web/src/components/AppShell.tsx` (`DefaultRail`)

### D. Fotos bugam

1. **`<img>` e `Avatar` sem `onError`.** URL 404 = ícone quebrado no lugar do fallback (iniciais).
2. **iPhone HEIC/HEIF não entra** em `IMAGE_TYPES` → upload falha no celular.
3. **URL pública depende de `PUBLIC_API_URL` + bucket público.** Path relativo misturado com URL absoluta, bucket privado ou env errada = imagem morta.
4. **Lista de rolês calcula `coverPhoto` e não renderiza.**
5. **Feed `photo_added` não busca a foto.**
6. **Álbuns: N+1** — lento e, em timeout, galeria vazia.

Arquivos-chave:

- `apps/api/src/lib/storage.ts`
- `apps/api/src/modules/media/media.service.ts`
- `apps/web/src/components/Avatar.tsx`
- `apps/web/src/app/photos/page.tsx`
- `apps/web/src/lib/upload.ts`

### E. Front buga

Padrão repetido: `'use client'` em tudo, `useEffect` + axios, **erro engolido**, sem Error Boundary, sem cancelar request na troca de rota.

Efeitos:

- Tela em branco / skeleton eterno
- Lista vazia que na verdade é erro de rede
- Estado velho depois de navegar
- 401 no interceptor manda para `/login` no meio de qualquer chamada
- `RequireAuth` só olha o token no `localStorage` (não valida expiração até a API responder)

Arquivos-chave: quase todas as pages em `apps/web/src/app/`, `apps/web/src/lib/api.ts`, `apps/web/src/components/RequireAuth.tsx`.

---

## Ordem dos passos

| # | Passo | Ata o quê | Risco |
|---|--------|-----------|--------|
| 0 | Baseline (reproduzir e anotar) | Todos os sintomas | Nenhum |
| 1 | Infra da API (pool, boot, índices) | Lentidão | Baixo |
| 2 | Matar N+1 de rolês + feed | Lentidão + rolês sumindo | Médio |
| 3 | Amigos (API + UI) | Adicionar amigos | Médio |
| 4 | Datas / timezone dos rolês | Rolês “sumindo” no filtro | Baixo |
| 5 | Fotos (fallback, HEIC, URLs, feed) | Fotos + avatars | Médio |
| 6 | Front: erros, corridas, loading | Front buga | Médio |
| 7 | Enxugar o shell (requests extras) | Lentidão percebida | Baixo |
| 8 | Busca / explorar / perfil content | Lentidão residual | Médio |
| 9 | Hardening (boundary, iPhone, polish) | Front | Baixo |
| — | **Stories** | Feature nova | **Só depois do 9** |

Não pular 1–2. Sem isso, 3–8 continuam “às vezes falha” em produção.

---

## Passo 0 — Baseline

**Objetivo:** saber o que está quebrado **hoje**, para não “corrigir no escuro”.

**O que fazer (humano + DevTools, sem código ainda):**

- [ ] Abrir o site em produção, logado.
- [ ] Network: tempo de `GET /feed`, `GET /roles`, `GET /friends`, `GET /photos`. Anotar status e duração.
- [ ] Console: CORS, 401, 500, imagens 404.
- [ ] Tentar adicionar amigo (sugestão e perfil). Anotar o que o botão faz.
- [ ] Filtrar rolês (Todos / Próximos / Meus) rápido, várias vezes.
- [ ] Subir uma foto pelo celular (se possível HEIC).

**Critério de saída:** uma linha por sintoma (“feed 8s / 500”, “pedido recusado não volta”, etc.).

---

## Passo 1 — Infra da API

**Objetivo:** cada request não ficar presa numa fila de 1 conexão nem recriar o mundo no boot.

**O que fazer:**

- [x] Em `apps/api/src/db/client.ts`:
  - Subir o pool (`max` ~ 5–10 no serverless; não deixar `1`).
  - Manter `prepare: false` (pooler Supabase porta 6543).
  - Não rodar o bloco inteiro de `CREATE TABLE IF NOT EXISTS` em **todo** cold start. Separar “já migrou” (tabela `schema_migrations` ou flag) para o boot só aplicar o que falta.
- [x] Em `apps/api/src/lib/storage.ts`: não listar/criar bucket em **toda** request/cold start se o bucket já existe. Falhar de forma clara se o env do Supabase estiver incompleto.
- [x] Índices que faltam (em `migrate.ts`):
  - `friendships (receiver_id, status)`
  - `friendships (requester_id, status)`
  - `photos (role_id)`
  - `feed_events (actor_id)`
  - `attendances (role_id)`

**Como validar:**

- `GET /health` continua ok.
- Cold start: primeira request depois de idle mais curta (não precisa ser instantânea).
- Duas abas carregando o feed ao mesmo tempo não se bloqueiam tanto.

**Não fazer neste passo:** reescrever `serializeRole`.

---

## Passo 2 — N+1 de rolês e feed (P0 de verdade)

**Objetivo:** `GET /roles` e `GET /feed` virarem poucas queries, não centenas.

**O que fazer:**

- [x] `serializeRole` / `counts`: **não** consultar por item. Batch:
  - creators `IN (...)`
  - `attendances` agrupado por `role_id`
  - `comments` count agrupado
  - `reviews` avg agrupado
  - última foto por rolê
  - `myAttendance` em um `IN`
- [x] `listRoles`: paginar (`limit` 30, `cursor` ou `offset`). Filtros `proximos`/`passados` **no SQL** (com a regra de data combinada no passo 4, se ainda não estiver pronta, filtrar por `date` no banco e ajustar status no passo 4).
- [x] `getFeed`:
  - 1 query dos eventos
  - 1 query dos actors
  - 1 batch dos rolês / reviews / posts referenciados
  - 1 batch de reações (`WHERE (target_type, target_id) IN ...`)
  - Não chamar `serializeRole` completo (comentários, fotos, áudios) no feed — só o card.
- [x] Isolar falha: se um item do feed estiver órfão (rolê apagado), **pular o item**, não derrubar o array inteiro.

**Como validar:**

- Home e `/roles` no Network: cada endpoint **< ~1s** com dezenas de rolês (não 10s+).
- Apagar um rolê que ainda tem evento no feed: o home **não** quebra.
- Paginação: os mais recentes aparecem; não carregar a história inteira de uma vez.

**Não fazer neste passo:** stories, UI nova, amigos.

---

## Passo 3 — Amigos

**Objetivo:** pedir, aceitar, recusar e pedir de novo, com feedback na tela.

**API (`social.service.ts` + `users.service.ts`):**

- [x] Recusar: status `rejected` **pode ser reaberto** (update para `pending` + trocar requester/receiver) em vez de `return existing` eterno.
- [x] Já amigos (`accepted`): 400 claro “Vocês já são amigos”.
- [x] Pending existente: 409 ou 200 com `{ id, status, requesterId, receiverId }` **sempre camelCase**.
- [x] Impedir pedido duplicado nos dois sentidos (unique em par ordenado `LEAST/GREATEST` ou checagem + unique index).
- [x] `PUT /friends/requests/:id`: exigir `status` `accepted` | `rejected` no Zod. Sem body válido → 400, **nunca** aceitar por omissão.
- [x] `suggestions`: excluir amigos aceitos **e** qualquer pending (nos dois sentidos).
- [x] Opcional neste passo: cancelar pedido outgoing (`DELETE` no pending se você é o requester).

**Front `/amigos`:**

- [x] Loading + erro visível (não fingir lista vazia).
- [x] Toast em falha.
- [x] Botão desabilitado enquanto o request roda.
- [x] Aceitar / recusar / adicionar com `try/catch`.

**Front perfil:**

- [x] Labels:
  - sem relação → Adicionar
  - pending e eu sou receiver → Aceitar (e Recusar)
  - pending e eu sou requester → Pedido enviado (e Cancelar)
  - accepted → Amigos / Desfazer
- [x] Não deixar o clique no “Pedido enviado” no-op.

**Como validar:**

1. A pede B → B vê o pedido → aceita → os dois aparecem em “Sua galera”.
2. B recusa → A consegue pedir de novo.
3. A pede B → B pede A (cruzado): um pedido só, sem 500.
4. Sugestão some depois do pedido.
5. Perfil: quem recebeu o pedido vê Aceitar, não “Pedido enviado”.

---

## Passo 4 — Timezone e filtros de rolê

**Objetivo:** “Próximos” / “Passados” / calendário baterem com o Brasil, não com UTC da Vercel.

**O que fazer:**

- [x] `roleStatus`: interpretar data+hora em **America/Sao_Paulo** (ou gravar `timestamptz` na criação). Nunca `new Date(\`${date}T${time}:00\`)` sem offset no servidor.
- [x] Conferir `toDateKey` com o driver `postgres` (DATE às vezes vira `Date` UTC midnight).
- [x] Front `/roles`: cancelar o GET anterior ao trocar o filtro (`AbortController` ou id de request). Não aplicar resposta velha.
- [x] Não mostrar empty state de “você não tem rolê” se `error` estiver setado.

**Como validar:**

- Criar rolê hoje 22:00 (horário de Brasília). Em `/roles` → Próximos, ele aparece. Depois que passar, vai para Passados.
- Trocar filtros rápido: a lista final corresponde ao botão ativo.

---

## Passo 5 — Fotos e avatars

**O que fazer:**

- [x] `Avatar`: se a imagem falhar, cair nas iniciais (state `broken`).
- [x] Galeria / capa / perfil: o mesmo fallback (placeholder, não ícone quebrado).
- [x] Aceitar `image/heic` e `image/heif` no storage (e, se o browser não renderiza HEIC, converter no upload **ou** pedir JPEG no `accept` com mensagem clara).
- [x] Garantir que o que vai pro banco é **path relativo** (`photos/uuid.jpg`) e que `publicUrl()` é o único lugar que monta a URL.
- [x] Conferir em produção: bucket `resenhometro-uploads` **público**, `PUBLIC_API_URL` e `NEXT_PUBLIC_API_URL` corretos.
- [x] Feed: evento `photo_added` deve incluir `url` da foto (batch, não N+1).
- [x] Lista de rolês: mostrar `coverPhoto` se existir.
- [x] `listAlbums`: uma query de álbuns + uma de fotos, sem `getAlbum` em loop.
- [x] `deletePhoto` / `deleteAudio` / `deleteAlbum`: chamar `removeStored` (hoje a função existe e **não é usada** — arquivo órfão no Supabase, URL 404 depois).
- [x] Gravação de áudio: ao apertar Parar, cancelar o `setTimeout` de 5 min (hoje o timer continua e pode chamar `stop` de novo).

**Como validar:**

- Avatar com URL inválida → iniciais, layout intacto.
- Upload JPEG/PNG/WebP ok; HEIC no iPhone ou mensagem clara.
- Foto no feed e na galeria abrem.
- Capa do rolê visível no card de `/roles`.

---

## Passo 6 — Front: erros, corridas, loading

**Páginas prioritárias:** home, rolês, amigos, fotos, perfil, explorar.

**O que fazer (padrão único, repetir nas pages):**

- [x] `loading` / `error` / `empty` separados. Empty **só** se loading false e error vazio.
- [x] `try/catch` + `apiErrorMessage` + toast onde já existe toast.
- [x] Abortar fetch ao desmontar / ao mudar filtro / username.
- [x] Amigos e fotos: não disparar `load()` sem catch.
- [x] Explorar: `.then` sem catch hoje — tratar erro.
- [x] `api.ts`: 401 não pode loop infinito; não redirecionar se já está em login/cadastro (já tem um if; revisar rotas públicas: esqueci-senha, redefinir-senha).

**Como validar:**

- API desligada: mensagem de erro, não tela muda/vazia.
- Trocar de perfil rápido (`/perfil/a` → `/perfil/b`): não fica o conteúdo do A.
- Login expirado: vai para `/login` uma vez, sem flicker eterno.

---

## Passo 7 — Enxugar o AppShell

**O que fazer:**

- [x] Não chamar `/spotify/status` se o usuário não conectou Spotify (ou cachear / lazy).
- [x] Unread de notificações: intervalo longo ou só ao focar a aba, não necessariamente a cada mount pesado — mas o mount já é 1 GET; o problema maior é o **rail** chamar `/calendar` (serializa menos, ok) **e** `/suggestions` em **toda** página.
- [x] Cache curto em memória (ex.: 60s) para sugestões + próximos rolês, compartilhado entre páginas.
- [x] SVG do `WaveBackground`: o `feDropShadow` é caro em mobile. Simplificar ou `prefers-reduced-motion` / esconder o filtro em telas estreitas.

**Como validar:**

- Network ao navegar Início → Rolês → Amigos: bem menos GETs repetidos.
- Celular: scroll mais estável (menos jank do fundo).

---

## Passo 8 — Busca, explorar, conteúdo do perfil

**O que fazer:**

- [x] `searchAll`: **não** varrer todas as tags do banco. `WHERE tags ILIKE` ou tabela/GIN depois. Limit.
- [x] `explore` / `serializeReview`: review na listagem **não** precisa de `nestComments` + fotos + áudios. Card leve; detalhe hidrata o resto.
- [x] `userContent`: limitar rolês/fotos (ex. 20) e usar o batch do passo 2.
- [x] Rotas `GET /roles/:id/comments` e `GET /roles/:id/attendance` não devem chamar `serializeRoleDetail` inteiro.

**Como validar:**

- Digitar 1 letra na busca não mata a API.
- Perfil de quem tem muitos rolês abre em tempo aceitável.
- Página do rolê (detalhe) continua completa (comentários, fotos, presença).

---

## Passo 9 — Hardening do front

- [x] Error Boundary em volta do `children` do shell (erro de render não derruba o app inteiro).
- [x] `img` com `loading="lazy"` na galeria.
- [x] Conferir `/roles/new` vs `/roles/novo` (redirect já existe; links devem apontar só para `/roles/new`).
- [x] Reações: catch + toast (hoje o clique pode falhar em silêncio).
- [x] Passar os olhos em settings, calendar, notifications, music com o mesmo padrão loading/error.

**Como validar:** forçar um throw num card do feed → o resto da página e o menu continuam.

---

## Depois dos bugs — Stories (backlog)

**Não implementar agora.** Quando o passo 9 estiver `[x]`, aí sim:

Ideia: stories 24h (foto/vídeo curto no topo do feed), visualização por amigos, reply opcional.

Precisa de desenho à parte (`docs/plano-stories.md` quando formos começar):

- tabela `stories` (author, media url, expires_at)
- upload reusando `/storage/sign` (kind novo ou `photo`)
- barra no home (círculos)
- viewer full-screen
- quem viu (opcional v1)

Até lá, zero código de stories neste plano.

---

## Fora de escopo (não reabrir)

- apps/mobile e apps/desktop
- chat em tempo real, mapa, pagamentos, push
- reescrever o visual / temas
- migrar de JWT para outra auth
- “otimizar tudo” de uma vez

---

## Mapa rápido de arquivos

```
apps/api/src/db/client.ts                 passo 1
apps/api/src/db/migrate.ts                passo 1 (índices)
apps/api/src/lib/storage.ts               passos 1 e 5
apps/api/src/lib/helpers.ts               passos 2 e 4
apps/api/src/modules/roles/roles.service.ts    passos 2 e 4
apps/api/src/modules/social/social.service.ts  passos 2 e 3
apps/api/src/modules/users/users.service.ts    passo 3 e 8
apps/api/src/modules/media/media.service.ts    passo 5
apps/api/src/modules/search/search.service.ts  passo 8
apps/web/src/app/amigos/page.tsx          passo 3 e 6
apps/web/src/app/perfil/[username]/page.tsx    passo 3 e 6
apps/web/src/app/roles/page.tsx           passos 4 e 6
apps/web/src/app/page.tsx                 passo 6
apps/web/src/app/photos/page.tsx          passos 5 e 6
apps/web/src/components/Avatar.tsx        passo 5
apps/web/src/components/AppShell.tsx      passo 7
apps/web/src/lib/api.ts                   passo 6
```

---

## Registro de execução

| Passo | Data | Quem | Notas |
|------|------|------|--------|
| 0 | | | |
| 1 | 2026-08-25 | agente | pool 5 (Vercel) / 10 (longo); schema_migrations; sem listBuckets no boot; índices friendships/photos/feed/attendances |
| 2 | 2026-08-25 | agente | serializeRoles em batch; GET /roles limit 30 + offset; proximos/passados no SQL por date; getFeed batch + pula órfãos |
| 3 | 2026-08-25 | agente | rejected reabre; PUT exige status; unique LEAST/GREATEST; suggestions ignora amigos/pending; DELETE cancel outgoing; UI amigos/perfil |
| 4 | 2026-08-25 | agente | roleStatus/toDateKey em America/Sao_Paulo; DATE via UTC; SQL próximos/passados com timestamptz SP; AbortController + empty só sem erro |
| 5 | 2026-08-27 | agente | Avatar/MediaImage onError; HEIC aceito + conversão JPEG ou mensagem; publicUrl único; feed photo_added em batch; coverPhoto no card; listAlbums batch; removeStored no delete; timer de áudio cancelado |
| 6 | 2026-08-27 | agente | loading/error/empty nas pages; AbortController; explorar com catch; 401 ignora esqueci/redefinir-senha e redireciona uma vez |
| 7 | 2026-08-27 | agente | cache 60s no rail (calendar/suggestions); spotify/status só se conectado (flag); unread no foco + 2min; feDropShadow só desktop sem reduced-motion |
| 8 | 2026-08-28 | agente | searchAll tags com ILIKE+limit; explore/listReviews card leve (sem comments/fotos/áudios); userContent LIMIT 20 + serializeRoles; GET comments/attendance sem serializeRoleDetail |
| 9 | 2026-08-28 | agente | ErrorBoundary no shell + por card do feed; MediaImage lazy; links só /roles/new; Reactions catch+toast; settings/calendar/notifications/music com loading/error. Stories ainda bloqueadas. |
