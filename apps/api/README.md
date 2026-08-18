# API — Resenhômetro

Backend Fastify com JWT. Os dados **persistem**: sem `DATABASE_URL` a API usa PostgreSQL embarcado (PGlite) em `apps/api/data`. Com `DATABASE_URL`, usa PostgreSQL.

Uploads ficam em `apps/api/data/uploads` e são servidos em `/uploads`.

## Rodar

Na raiz do monorepo:

```bash
pnpm install
Copy-Item .env.example .env   # PowerShell
pnpm --filter @resenhometro/api dev
```

Health: `GET http://localhost:3333/health`

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

`routes` → `service` → banco (`src/db`) / arquivos (`src/lib/storage.ts`)

## Rotas principais

- `GET /health`
- `POST /auth/register` `POST /auth/login` `GET /auth/me` `PUT /auth/me` `PUT /auth/password`
- `GET /users/:username` `PUT /users/me`
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

Rotas autenticadas exigem `Authorization: Bearer <jwt>`.

## Testes

```bash
pnpm --filter @resenhometro/api test
```
