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
