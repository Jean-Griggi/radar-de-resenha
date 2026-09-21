# Web — Resenhômetro

Frontend Next.js (App Router) + Tailwind. Identidade visual dark/light, fundo de waves, layout com sidebar, topbar e mini-player.

## Rodar

Na raiz do monorepo:

```bash
pnpm install
```

Crie `apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3333
```

```bash
pnpm --filter @resenhometro/web dev
```

Abra http://localhost:3000. A API precisa estar em http://localhost:3333.

A sessão fica no cookie httpOnly da API (`resenhometro_session`, 7 dias, domínio `localhost:3333` em dev). O Axios usa `withCredentials`; o web **não** guarda JWT no `localStorage`. Cadastro, reset e troca de senha exigem **pelo menos 8** caracteres.

`WEB_ORIGIN` na API precisa ser exatamente `http://localhost:3000` (ou a URL do Vercel em produção). Sem isso o navegador não envia o cookie.

## Onde o código mora

Páginas em `src/app/` são compostores finos (importam a feature + `RequireAuth` quando couber). Telas e regras de tela ficam em `src/features/`. `src/components/` é UI genérica (Button, Avatar, Shell, Field, Toast, Theme, Player).

| Feature | Telas |
| ------- | ----- |
| `auth` | login, cadastro, esqueci/redefinir, sessão |
| `roles` | lista, criar, detalhe, editar |
| `social` | feed, amigos, comments, reactions |
| `users` | perfil |
| `media` | fotos |
| `stories` | barra e viewer |
| `reviews` | detalhe de resenha |
| `search` | explorar |
| `notifications` | avisos |
| `stats` | calendário, stats, retrospectiva |
| `music` | Spotify |
| `settings` | conta |

Sessão do cliente: `src/features/auth/session.ts` (`src/lib/auth.ts` reexporta).

## Scripts

- `pnpm dev` — desenvolvimento (Turbopack)
- `pnpm build` — produção
- `pnpm start` — servir o build
- `pnpm typecheck` — TypeScript

## Telas

| Rota | Conteúdo |
| ---- | -------- |
| `/login` `/cadastro` | Auth |
| `/` | Feed |
| `/roles` `/roles/new` `/roles/[id]` | Rolês |
| `/perfil/[username]` | Perfil |
| `/explore` `/amigos` `/photos` | Social e mídia |
| `/calendar` `/stats` `/year-review` | Calendário e números |
| `/music` `/settings` `/notifications` | Música, conta, avisos |

Tema: botão claro/escuro no topo (salvo no `localStorage`).

## Deploy (Vercel)

- Root Directory: `apps/web`
- Variável: `NEXT_PUBLIC_API_URL` = URL pública da API
- Na API, `WEB_ORIGIN` / `CORS_ORIGINS` = URL **exata** deste projeto (cookie + credentials)
