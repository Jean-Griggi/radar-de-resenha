# API — Resenhômetro

Backend Fastify com sessão em cookie httpOnly. Os dados **persistem**: sem `DATABASE_URL` a API usa PostgreSQL embarcado (PGlite) em `apps/api/data`. Com `DATABASE_URL`, usa PostgreSQL.

Uploads ficam em `apps/api/data/uploads` e são servidos em `/uploads`.

## Reset do banco local

Apaga o PGlite e os uploads em `apps/api/data/`. Se `DATABASE_URL` apontar para Postgres em localhost/Docker, zera esse volume também (`docker compose down -v` + `up`, ou `DROP SCHEMA` se o Docker não estiver no ar). **Não** toca em Supabase nem em qualquer Postgres remoto.

Pare a API antes (o PGlite trava arquivos em `data/` se estiver rodando).

```bash
pnpm db:reset
# ou:
pnpm --filter @resenhometro/api db:reset
```

Na próxima subida, `applyMigrations` recria o schema vazio. Cadastre de novo (senha ≥ 8). O cookie de sessão antigo deixa de valer.

## Rodar

Na raiz do monorepo:

```bash
pnpm install
Copy-Item .env.example .env   # PowerShell
pnpm --filter @resenhometro/api dev
```

Health: `GET http://localhost:3333/health`

## Sessão

Login e cadastro gravam o JWT no cookie `resenhometro_session` (httpOnly, path `/`, 7 dias). O JavaScript da página não lê esse cookie.

O browser guarda o cookie no **domínio da API** (`localhost:3333` em dev). O web (`localhost:3000`) envia o cookie porque Axios usa `withCredentials` e o CORS da API tem `credentials: true` com origem explícita.

`WEB_ORIGIN` (e `CORS_ORIGINS` em produção) precisa ser a URL exata do front. Sem isso o navegador não envia o cookie.

`POST /auth/logout` apaga o cookie. `Authorization: Bearer` ainda vale para testes/scripts; o web não usa.

## Variáveis

Ver `.env.example` na raiz. As principais:

- `API_PORT` (3333)
- `JWT_SECRET`
- `PUBLIC_API_URL` / `WEB_ORIGIN` / `CORS_ORIGINS`
- `DATABASE_URL` (opcional)
- `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI` (opcional)

PostgreSQL via Docker (opcional):

```bash
docker compose up -d
```

Aí defina `DATABASE_URL=postgres://resenhometro:resenhometro@localhost:5432/resenhometro`.

## Padrão de código

Cada domínio vive em `src/modules/<domínio>/`: `routes` → `service` → banco (`src/db`) / arquivos (`src/lib/storage.ts`). O Zod do módulo fica no `*.schema.ts` dele.

| Módulo | Responsabilidade |
| ------ | ---------------- |
| `auth` | login, cadastro, logout, `/auth/me`, senha |
| `users` | perfil, avatar/capa, amigos, follow |
| `roles` | rolês e presença |
| `social` | feed, posts, comments, reactions |
| `search` | `/search` e `/explore` |
| `notifications` | in-app |
| `stats` | `/calendar`, `/stats`, `/year-review` |
| `reviews` | resenhas |
| `media` | fotos, álbuns, áudios |
| `stories` | stories 24h |
| `music` | Spotify |
| `storage` | upload assinado |

`GET /me` e `PUT /auth/me` não existem mais (404). Sessão: `/auth/me`. Perfil: `/users/me`.

## Rotas principais

- `GET /health`
- `POST /auth/register` `POST /auth/login` `POST /auth/logout` `GET /auth/me` `PUT /auth/password`
- `GET /users/:username` `PUT /users/me` `POST|DELETE /users/me/avatar` `POST|DELETE /users/me/cover`
- `GET /feed` `GET /explore` `GET /search`
- `GET|POST /roles` `GET|PUT|PATCH|DELETE /roles/:id`
- `POST /roles/:id/attendance` `POST /roles/:id/comments` `POST /roles/:id/music`
- `POST /reviews` `GET|PUT|DELETE /reviews/:id`
- `POST /reactions` `PUT|DELETE /comments/:id`
- `POST /friends/requests` `GET /friends` `POST|DELETE /users/:id/follow`
- `GET /calendar` `GET /stats` `GET /year-review`
- `GET /notifications` `PUT /notifications/:id/read`
- `POST /photos` `POST /audios` `POST /albums`
- `GET /spotify/connect` `GET /spotify/callback` `GET /spotify/status`

Rotas autenticadas leem o cookie `resenhometro_session` (ou `Authorization: Bearer` em scripts).

## Testes

```bash
pnpm --filter @resenhometro/api test
```
