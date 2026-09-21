# Plano — Segurança e estrutura (monólito modular por stacks)

Guia para endurecer a sessão, fechar o perímetro da API, reorganizar pastas/código e, no fim, zerar o banco **local**.

Arquitetura travada: **2 stacks** (`apps/web`, `apps/api`) + `packages/shared` + 1 Postgres. Sem microserviço, sem Nest, sem Clerk, sem GraphQL.

Branch deste plano: **`chore/security-and-modular-stacks`**.

Prompts prontos: [prompts-seguranca-e-estrutura.md](prompts-seguranca-e-estrutura.md).

---

## Como usar

1. Estar na branch `chore/security-and-modular-stacks` (já criada). Não trabalhar na `main`.
2. Abrir o passo ainda `[ ]`.
3. Copiar o prompt desse passo em [prompts-seguranca-e-estrutura.md](prompts-seguranca-e-estrutura.md) e colar no chat (modo Agent).
4. A IA implementa **só** aquele passo.
5. Você valida a seção **Como validar**.
6. Marcar o passo (`[x]`) e ir ao próximo.

Status: `[ ]` pendente · `[~]` em andamento · `[x]` feito

Atalho:

```
Execute o passo N de docs/plano-seguranca-e-estrutura.md. Só esse passo. Siga o prompt em docs/prompts-seguranca-e-estrutura.md.
```

Ordem obrigatória: **0 → 12**. Não pular 1–3 (segurança) para ir direto às pastas. Senão a auth é refatorada duas vezes.

---

## Protocolo de encerramento (obrigatório em todo passo)

Quem executar (humano ou IA) **não fecha o passo só no código**. Ao cumprir o critério:

1. **Marcar** o passo `[x]` neste arquivo e preencher a [tabela de registro](#registro-de-execução).
2. **Commitar** — um commit Conventional Commits **só deste passo**, na branch `chore/security-and-modular-stacks`. Sem `--no-verify`. Sem commit vazio. Sem commit na `main`.
3. **Push** dessa branch (`git push -u origin HEAD` na primeira vez; depois `git push`).
4. **Explicar para o humano aprender** — bloco obrigatório na resposta (ver abaixo). Termos técnicos com tradução simples. Sem despejar diff.
5. **Falar o próximo** — uma linha: `Próximo: Passo N — <nome>.` Se for o 12: `Próximo: nenhum. Plano encerrado. Abra o PR da branch chore/security-and-modular-stacks.`

```bash
git add -A
git status
git commit -m "$(cat <<'EOF'
<mensagem do passo>

EOF
)"
git push origin HEAD
```

No Windows PowerShell, se o heredoc falhar, use `git commit -m "mensagem do passo"` com a mesma mensagem da seção **Ship**.

Não misturar dois passos. Se o hook recusar, corrigir e fazer **outro** commit. Não mergear na `main` sozinho. Não publicar deploy sozinho.

### Bloco de aprendizado (obrigatório na resposta)

```
## O que mudou neste passo
3–6 frases: o que foi feito, em qual stack (web / API / shared), e por quê.

## Como isso funciona
Explique o conceito. Termo técnico na primeira vez + tradução em linguagem comum.
Ex.: cookie httpOnly = o navegador guarda o login num lugar que o JavaScript da página não consegue ler.

## O que você veria se testasse
1–3 checagens concretas (DevTools, uma URL, um clique).

## O que não fizemos ainda
Uma linha, para não achar que o plano acabou.

## Próximo: Passo N — <nome>.
```

---

## Fora de escopo (não reabrir)

- Tirar a API da Vercel / mudar hospedagem
- `apps/mobile` e `apps/desktop`
- Chat em tempo real (o mock pode sair da UI; não vira WebSocket)
- Expandir `packages/ui`
- Trocar Fastify, Next, JWT-por-Clerk, GraphQL
- Zerar **Supabase de produção** sem o humano escrever no chat: `pode zerar o Supabase também`
- Redesenhar visual / temas

---

## Mapa dos passos

| # | Passo | Tipo |
|---|--------|------|
| 0 | Baseline (inventário) | prep |
| 1 | Perímetro da API | segurança |
| 2 | Sessão em cookie | segurança |
| 3 | Privacidade (e-mail, `is_public`, senha 8) | segurança |
| 4 | Fatiar rotas da API | pastas API |
| 5 | Schemas por módulo | pastas API |
| 6 | Helpers e rotas canônicas | código API |
| 7 | Chrome do web (chat mock, `/roles/new`) | código web |
| 8 | `features/auth` + `features/roles` | pastas web |
| 9 | Resto das `features/` | pastas web |
| 10 | Contrato `shared` | shared |
| 11 | Reset do banco **local** | dados |
| 12 | Docs + fechamento | docs |

---

## Passo 0 — Baseline

**Objetivo:** saber o que está aberto **hoje**, sem mudar comportamento do app.

**O que fazer:**

- [x] Confirmar que o git está em `chore/security-and-modular-stacks` (já criada). Se estiver na `main`, `git checkout chore/security-and-modular-stacks`. Não criar outra branch.
- [x] Preencher as linhas abaixo com achados **do código** (não inventar). Citar arquivo.

**Inventário (preencher neste passo):**

| Tema | Achado | Arquivo |
| --- | --- | --- |
| Onde o token é guardado | `localStorage` na chave `resenhometro_token` (`getToken` / `setAuth`). | `apps/web/src/lib/auth.ts` |
| JWT tem `expiresIn`? | Não. `app.jwt.sign({ sub, email })` sem `expiresIn`; plugin JWT só com `secret`. | `apps/api/src/modules/auth/auth.routes.ts`; `apps/api/src/app.ts` |
| `JWT_SECRET` tem default? | Sim: Zod `.default('change-me-dev-secret')` (mín. 8). | `apps/api/src/config/env.ts` |
| CORS aceita `*.vercel.app`? | Sim: `origin.endsWith('.vercel.app')` além da allowlist. Origem vazia também passa (`if (!origin) return true`). | `apps/api/src/config/env.ts` (`isAllowedOrigin`) |
| Rate limit em login/forgot? | Não. Sem `@fastify/rate-limit` no repo. `POST /auth/login`, `/auth/register` e `/auth/forgot-password` sem throttle. | `apps/api/src/modules/auth/auth.routes.ts` |
| `resetUrl` volta no JSON? | Sim, quando SMTP não está configurado (`mailConfigured()` falso inclui `resetUrl`). Também loga o link em `console.info`. | `apps/api/src/modules/auth/auth.service.ts` |
| Busca/listagem devolve `email`? | Não no JSON: `mapUser` omite e-mail por padrão. Busca e sugestões chamam `mapUser(row)` sem `withEmail`. SQL ainda seleciona a coluna. E-mail só em login/me/perfil próprio. | `apps/api/src/lib/helpers.ts`; `apps/api/src/modules/search/search.service.ts`; `apps/api/src/modules/users/users.service.ts` |
| `is_public` autoriza conteúdo? | Não. Flag é persistida, atualizada no perfil e espelhada em `isPublic`. `getUserByUsername` e `userContent` não checam o flag (sem 403 / payload reduzido). | `apps/api/src/modules/users/users.service.ts`; `apps/api/src/modules/auth/auth.service.ts` |
| Rotas duplicadas (`/me`, `/auth/me`, `/roles/novo`) | `GET /auth/me` e `GET /me` (mesmo handler); `PUT /auth/me` e `PUT /users/me`. Web: `/roles/novo` redireciona para `/roles/new`. | `apps/api/src/modules/auth/auth.routes.ts`; `apps/web/src/app/roles/novo/page.tsx` |
| Quem registra `/feed` (arquivo de rotas) | `socialRoutes` em `search.routes.ts` (`app.get('/feed', ...)`); `app.ts` registra esse plugin. | `apps/api/src/modules/search/search.routes.ts`; `apps/api/src/app.ts` |

**Como validar:** a tabela acima tem uma linha por tema, com arquivo. App **não** mudou (diff só neste markdown + registro).

**Não fazer:** alterar `apps/`, `packages/`, `.env`, banco.

**Ship:** `docs: record security and structure baseline`  
**Ao terminar, falar:** `Próximo: Passo 1 — Perímetro da API.`

---

## Passo 1 — Perímetro da API

**Objetivo:** fechar a porta da API sem ainda trocar o jeito de login.

**O que fazer:**

- [x] Em `apps/api/src/config/env.ts`:
  - `JWT_SECRET` **sem default** quando `VERCEL` ou `NODE_ENV=production`. Em dev, default pode ficar, mas mínimo longo (≥ 32 caracteres no schema de prod).
  - CORS: allowlist = localhost (dev) + `WEB_ORIGIN` + `CORS_ORIGINS`. **Remover** `origin.endsWith('.vercel.app')`. Origem vazia: manter só para health/curl (sem `Origin`); browser sempre manda Origin.
- [x] Rate limit em `POST /auth/login`, `POST /auth/register`, `POST /auth/forgot-password` (por IP; forgot também por e-mail). 429 com mensagem clara.
- [x] `resetUrl` no JSON **somente** se `NODE_ENV !== 'production'` (e de preferência só quando SMTP não está configurado). Em produção: mensagem genérica, sem link.
- [x] Headers: `@fastify/helmet` (ou equivalente): `nosniff`, `frame-ancestors: none`, HSTS só em produção. Sem CSP agressiva que quebre o front neste passo.
- [x] Não logar senha, token nem `resetUrl` em produção (`console.info` do link de reset: só dev).

**Como validar:**

- Request com `Origin: https://qualquer-coisa.vercel.app` **não** passa CORS (a menos que esteja na allowlist).
- 20 `POST /auth/login` seguidos → 429.
- Com `NODE_ENV=production`, forgot **não** devolve `resetUrl`.
- `/health` continua ok.

**Não fazer:** cookie, `localStorage`, pastas de módulo, visual.

**Ship:** `fix(api): tighten cors secret rate-limit and reset-url`  
**Ao terminar, falar:** `Próximo: Passo 2 — Sessão em cookie.`

---

## Passo 2 — Sessão em cookie

**Objetivo:** o crachá de login sai do `localStorage` e vai para um cookie que o JavaScript da página não lê.

**O que fazer:**

- [ ] Login e cadastro: `jwt.sign` **com `expiresIn`** (access curto, ex. 15 min, **ou** sessão ≤ 7 dias — escolher um e documentar no código). Setar cookie `httpOnly`, `Secure` em prod, `SameSite=Lax`, path `/`. Nome sugerido: `resenhometro_session`.
- [ ] `POST /auth/logout` limpa o cookie.
- [ ] `authenticate` aceita o cookie **e**, só neste passo de transição se precisar, o `Authorization: Bearer` antigo. Preferir cookie. Não deixar os dois para sempre: Bearer pode ficar só para testes/scripts, não para o web.
- [ ] Web: `apps/web/src/lib/auth.ts` **para de gravar token** no `localStorage`. Pode guardar dados públicos do user (nome, avatar) se ainda precisar, sem o JWT.
- [ ] Axios: `withCredentials: true`. Não mandar `Authorization` se não houver token.
- [ ] CORS: `credentials: true` e origem **explícita** (não `*`).
- [ ] 401: igual hoje (vai para `/login`), mas `clearAuth` não precisa apagar JWT inexistente.
- [ ] Cookie no browser aponta para o domínio da API. Em dev: `localhost` API `3333` + web `3000` — CORS + credentials têm que fechar o ciclo. Documentar no README da API se a URL do cookie exigir `WEB_ORIGIN`.

**Como validar:**

- Login → DevTools → Application: cookie httpOnly presente; **nenhum** `resenhometro_token` no `localStorage`.
- Logout → cookie some; próxima chamada autenticada → 401.
- Recarregar a home logado continua logado (cookie vai sozinho).

**Não fazer:** fatiar módulos, privacidade `is_public`, reset de banco, chat.

**Ship:** `feat(auth): store session in httpOnly cookie`  
**Ao terminar, falar:** `Próximo: Passo 3 — Privacidade.`

---

## Passo 3 — Privacidade

**Objetivo:** a API para de vazar e-mail e respeita perfil privado. Senha mínima sobe para 8.

**O que fazer:**

- [ ] `email` só em `/auth/me` (e update do próprio user). Busca, sugestões, listagem, perfil alheio: **sem** e-mail.
- [ ] `is_public = false`: perfil/conteúdo (rolês, fotos, resenhas no `userContent`) só para o dono, amigo aceito ou (definir uma regra e seguir) quem segue. Estranho → 403 ou payload reduzido (nome/username/avatar, sem conteúdo). Escrever a regra num comentário curto no service.
- [ ] Zod: senha min **8** no cadastro, login (login ainda aceita comparar hash antigo, mas **novo** cadastro/troca exige 8), reset e change password.
- [ ] Testes em `auth.test.ts` / users: e-mail não aparece no perfil alheio; senha curta → 400.

**Como validar:**

- Duas contas: A privada, B não é amigo. B abre `/users/username-de-A` e não vê e-mail nem lista completa de rolês.
- Cadastro com senha `1234567` → 400; `12345678` → ok.

**Não fazer:** cookie de novo, pastas `features/`, Helmet de novo.

**Ship:** `fix(api): hide emails and honor private profiles`  
**Ao terminar, falar:** `Próximo: Passo 4 — Fatiar rotas da API.`

---

## Passo 4 — Fatiar rotas da API

**Objetivo:** cada domínio registra as próprias URLs. `search` deixa de ser o saco de gatos.

**O que fazer:**

- [ ] `search.routes.ts` **só** `/search` e `/explore`.
- [ ] Rotas de feed, posts, comments, reactions → `social.routes.ts` (criar se não existir).
- [ ] `/notifications*` → `notifications.routes.ts` (+ service já existente ou extraído).
- [ ] `/calendar`, `/stats`, `/year-review` → `stats.routes.ts` (calendar pode permanecer no service de calendar, registrado por stats ou por um `calendar.routes.ts` — escolher um; não deixar em search).
- [ ] `app.ts` registra os plugins novos. Comportamento HTTP **igual**.
- [ ] Amigos podem continuar em `users.routes.ts` neste passo (canônico no passo 6).

**Como validar:**

- `pnpm --filter @resenhometro/api test` passa.
- Smoke: `GET /feed`, `GET /search`, `GET /notifications`, `GET /stats` (com cookie/sessão) respondem como antes.

**Não fazer:** quebrar `common.schema.ts`, helpers, web, banco.

**Ship:** `refactor(api): split search social stats and notification routes`  
**Ao terminar, falar:** `Próximo: Passo 5 — Schemas por módulo.`

---

## Passo 5 — Schemas por módulo

**Objetivo:** cada módulo é dono do Zod que as rotas dele usam.

**O que fazer:**

- [ ] Quebrar `modules/common.schema.ts` em `auth.schema.ts`, `roles.schema.ts`, `social.schema.ts`, `reviews.schema.ts`, `media.schema.ts`, `stories.schema.ts`, `music.schema.ts`, `storage.schema.ts` (só o que cada um usa).
- [ ] Apagar ou deixar `common.schema.ts` só com pedaços realmente cruzados (ex. uuid). Sem god-file.
- [ ] Imports das rotas atualizados. Sem mudança de regra de validação, **exceto** o que o passo 3 já definiu.

**Como validar:** typecheck da API; testes; um POST `/roles` inválido ainda dá 400.

**Não fazer:** web, cookie, SQL novo.

**Ship:** `refactor(api): move zod schemas into domain modules`  
**Ao terminar, falar:** `Próximo: Passo 6 — Helpers e rotas canônicas.`

---

## Passo 6 — Helpers e rotas canônicas

**Objetivo:** `helpers.ts` deixa de ser a gaveta da casa. Uma URL por recurso.

**O que fazer:**

- [ ] `helpers.ts` fica com data/timezone, `sqlPlaceholders`, `parseJson`. Tirar `notify`, `addFeedEvent`, `mapUser`, `getUserRow`, achievements, reações — para o módulo dono (`users`, `social`, etc.).
- [ ] Rotas canônicas:
  - sessão: `/auth/login` `/auth/register` `/auth/logout` `/auth/me` `/auth/password`
  - perfil: `/users/me` (update, avatar, capa)
  - **Remover** ou redirecionar gêmeos: `GET /me` duplicado de `/auth/me`
- [ ] Avatar/capa: se hoje estão em `auth.routes`, mover para `users.routes` (`/users/me/avatar`, `/users/me/cover`).
- [ ] Web: atualizar fetches se alguma URL canônica mudou. Manter um alias **só** se quebrar o front no mesmo passo — preferir atualizar o front junto, ainda neste passo, **mínimo**.

**Como validar:** login, `/auth/me`, editar perfil, upload de avatar. `GET /me` ou 404 ou redirect documentado.

**Não fazer:** `features/` no web além do ajuste de URL; reset de banco.

**Ship:** `refactor(api): split helpers and canonicalize auth routes`  
**Ao terminar, falar:** `Próximo: Passo 7 — Chrome do web.`

---

## Passo 7 — Chrome do web

**Objetivo:** o casco do app (shell) para de carregar feature fake e rota velha.

**O que fazer:**

- [ ] `Chat.tsx` / `chatMock` **fora** do `AppShell` (não montar `ChatProvider` / botão / dock / coluna). Não apagar os arquivos neste passo se ainda quiser referência; não renderizar. Comentário curto: chat realtime fora de escopo.
- [ ] Links e redirect: só `/roles/new`. `/roles/novo` pode redirecionar (já existe) — garantir que nenhum link aponte para `novo`.
- [ ] Não mudar layout Redesenha (nav, ondas, tokens).

**Como validar:** logado, nenhuma UI de chat ( balão / dock / coluna). Criar rolê usa `/roles/new`.

**Não fazer:** criar pasta `features/` ainda; auth cookie de novo.

**Ship:** `fix(web): remove mock chat from shell`  
**Ao terminar, falar:** `Próximo: Passo 8 — features/auth e features/roles.`

---

## Passo 8 — `features/auth` + `features/roles`

**Objetivo:** nascer o padrão do stack web. Pages viram compostores finos.

**O que fazer:**

- [ ] Criar `apps/web/src/features/auth/` (login, cadastro, esqueci/redefinir, sessão/cliente).
- [ ] Criar `apps/web/src/features/roles/` (lista, criar, detalhe, editar).
- [ ] `app/login/page.tsx`, `cadastro`, `esqueci-senha`, `redefinir-senha`, `roles/*` só importam a feature e `RequireAuth` quando couber.
- [ ] Comportamento **igual** (cookie do passo 2 já está). Sem React Query obrigatório neste passo — extrair o código que já existe.

**Como validar:** fluxo login → criar rolê → abrir detalhe → editar. Visual igual.

**Não fazer:** migrar feed/amigos/fotos ainda; `packages/ui`.

**Ship:** `refactor(web): extract auth and roles features`  
**Ao terminar, falar:** `Próximo: Passo 9 — Resto das features.`

---

## Passo 9 — Resto das `features/`

**Objetivo:** o web segue o mesmo mapa de domínio da API, **sem** mudar regra de negócio.

**O que fazer:**

- [ ] Extrair para `features/`: `social` (home/feed, amigos), `users` (perfil), `media` (photos), `stories`, `reviews`, `search` (explore), `notifications`, `stats` (calendar, stats, year-review), `music`, `settings`.
- [ ] `components/` fica UI genérica (Button, Avatar, Shell, Field, Toast, Theme, Player, ErrorBoundary, MediaImage, WaveBackground, Brand*).
- [ ] Pages em `app/` finas.

**Como validar:** clicar as rotas principais (home, amigos, perfil, fotos, explore, calendar, settings, music, notifications). Loading/error/empty continuam.

**Não fazer:** novo design, chat realtime, TanStack Query em massa (opcional pontual se um extract exigir).

**Ship:** `refactor(web): extract remaining domain features`  
**Ao terminar, falar:** `Próximo: Passo 10 — Contrato shared.`

---

## Passo 10 — Contrato `shared`

**Objetivo:** `packages/shared` descreve o contrato das duas stacks, sem React e sem SQL.

**O que fazer:**

- [ ] Tipos de user público **sem** e-mail obrigatório; e-mail só num tipo `AuthUser` / `Me`.
- [ ] Constantes (categorias, reações, stories) intactas.
- [ ] Web e API compilam com o package. Sem código de cookie no shared (cookie é detalhe da API + browser).
- [ ] Exportar o que o front precisa da sessão (ex. `PublicUser`) de forma alinhada ao passo 3.

**Como validar:** `pnpm typecheck`. Perfil alheio no tipo não exige `email`.

**Não fazer:** reset de banco; visual.

**Ship:** `refactor(shared): align public user types with privacy`  
**Ao terminar, falar:** `Próximo: Passo 11 — Reset do banco local.`

---

## Passo 11 — Reset do banco local

**Objetivo:** ambiente de dev sem dados velhos, para cadastrar de novo já com senha 8 e cookie.

**Padrão:** só **dev local**. PGlite + uploads em `apps/api/data/`. Se existir Postgres Docker (`DATABASE_URL` local), zerar esse também.

**O que fazer:**

- [ ] Parar a API se estiver rodando.
- [ ] Apagar dados locais: pasta `apps/api/data/` (PGlite + uploads). Está no `.gitignore`.
- [ ] Se `DATABASE_URL` apontar para localhost/Docker: `TRUNCATE` / drop das tabelas de negócio **ou** `docker compose down -v` + `up` — o que for mais limpo neste repo. Recriar schema na próxima subida (`applyMigrations`).
- [ ] **Não** apagar o volume/projeto Supabase de produção, **a menos que** o humano tenha escrito neste chat: `pode zerar o Supabase também`.
- [ ] Na resposta do aprendizado: listar **o que foi apagado** e **o que não foi**.
- [ ] Não commitar dumps nem `.env`. Commit só de script de reset se criar um (`apps/api` script `pnpm --filter @resenhometro/api db:reset` é desejável, documentado no README da API).

**Como validar:**

- API sobe; `GET /health` → `{"status":"ok"}`.
- Login antigo falha. Cadastro novo (senha ≥ 8) funciona. Cookie de sessão aparece.

**Não fazer:** `git rm` de código de produto; push de secrets; wipe de produção sem frase explícita.

**Ship:** `chore(db): add local database reset`  
**Ao terminar, falar:** `Próximo: Passo 12 — Docs e fechamento.`

---

## Passo 12 — Docs e fechamento

**Objetivo:** a documentação da equipe aponta para o estado **depois** do plano.

**O que fazer:**

- [ ] Marcar todos os passos `[x]` (os que realmente rodaram).
- [ ] Atualizar [ai/plano-execucao.md](ai/plano-execucao.md): sessão em cookie, módulos por domínio, `features/` no web, reset local, branch deste trabalho.
- [ ] Atualizar [README.md](README.md) desta pasta, READMEs de `apps/api` e `apps/web` se URLs/auth mudaram.
- [ ] `DEPLOY.md`: cookie + `WEB_ORIGIN` + CORS credentials, se ainda falar só em JWT no front.
- [ ] Tabela de registro completa.

**Como validar:** um colega lê o README e consegue logar com o modelo novo (cookie, senha 8).

**Não fazer:** código novo de feature.

**Ship:** `docs: record security cookie auth and modular stacks`  
**Ao terminar, falar:** `Próximo: nenhum. Plano encerrado. Abra o PR da branch chore/security-and-modular-stacks.`

---

## Registro de execução

| Passo | Data | Quem | Notas |
|------|------|------|--------|
| 0 | 2026-09-21 | IA (Cursor) | Branch `chore/security-and-modular-stacks` confirmada. Inventário só neste markdown; `apps/`, `packages/`, `.env` e banco intocados. |
| 1 | 2026-09-21 | IA (Cursor) | JWT_SECRET sem default em prod/Vercel (mín. 32). CORS só allowlist (sem `*.vercel.app`). Rate limit login/register/forgot. `resetUrl` e log do link só fora de produção. Helmet básico. Cookie/localStorage intocados. |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |
| 9 | | | |
| 10 | | | |
| 11 | | | wipe local apenas, salvo autorização de prod |
| 12 | | | |

---

## Mapa rápido de arquivos

```
apps/api/src/config/env.ts                 passo 1
apps/api/src/app.ts                        passos 1, 4
apps/api/src/lib/authenticate.ts           passo 2
apps/api/src/modules/auth/                 passos 1–3, 5, 6
apps/api/src/modules/search/search.routes.ts    passo 4
apps/api/src/modules/common.schema.ts      passo 5
apps/api/src/lib/helpers.ts                passo 6
apps/web/src/lib/auth.ts                   passo 2
apps/web/src/lib/api.ts                    passo 2
apps/web/src/components/AppShell.tsx       passo 7
apps/web/src/components/Chat.tsx           passo 7
apps/web/src/features/                   passos 8–9
packages/shared/                           passo 10
apps/api/data/                             passo 11 (gitignored)
```
