# Plano / estado atual — Resenhômetro

Este arquivo é o guia de trabalho **depois** da implementação da rede social e **depois** do plano de segurança e estrutura. Humanos e IAs devem seguir o que está aqui, não o MVP antigo em memória.

## Como a IA deve agir

1. Seja objetiva. Sem enrolação.
2. Não invente escopo. Mobile, desktop, chat em tempo real, pagamentos e push estão fora. Tocar música dentro do produto também.
3. Não volte atrás para store só em memória. Persistência já existe (PGlite ou PostgreSQL).
4. Não mexa em `apps/mobile` nem `apps/desktop`.
5. Backend: `modules/<domínio>/` → `routes` → `service` → `src/db` / storage. Sem god-file de schema nem `helpers` de domínio.
6. Frontend: identidade **Redesenha** (DS v1.0). Dark estrutural + paper `#F2F0EC`, Plus Jakarta Sans, barra superior no desktop, bottom nav 5 no mobile, ondas + grain. Sem violeta de marca. Não reintroduzir `#FF6347` / lima / Inter como fonte principal. Páginas em `app/` finas; telas em `src/features/`; UI genérica em `components/`.
7. A branch estável do produto é a **`main`**. Nada entra nela sem PR.
8. Não publique deploy sozinha. Código já está no GitHub; hospedagem (Vercel + Render/Railway) só com conta e variáveis.
9. Idioma com a equipe: português, direto.
10. Auth: cookie httpOnly `resenhometro_session` (7 dias). Web **não** grava JWT no `localStorage`. Axios `withCredentials`. CORS com origem explícita (`WEB_ORIGIN` / `CORS_ORIGINS`) e `credentials: true`. Não zerar Supabase de produção sem pedido explícito (`pode zerar o Supabase também`).
11. Segurança entra em toda spec, plano e fatia. Sem a seção Segurança, a spec volta para a `sdd-specify`. A fatia não fecha se o critério de segurança que ela toca não passou.

## Onde mexer

| Área | Pasta |
|------|--------|
| Backend | `apps/api/src/modules/` (auth, users, roles, social, search, notifications, stats, reviews, media, stories, music, storage) |
| Frontend | `apps/web/src/features/` (telas) e `apps/web/src/components/` (UI genérica) |
| Tipos | `packages/shared/` (`PublicUser` sem e-mail; `AuthUser` / `Me` com e-mail) |
| Rotas Next | `apps/web/src/app/` (compostores finos) |

## O que o produto já faz

Cadastro/login com cookie httpOnly (senha ≥ 8 no cadastro/reset/troca), recuperar senha por e-mail, perfil com avatar e capa, localização no mapa (MapLibre, ponto + nome do lugar, mapa de pessoas, prédios 3D), rolês (CRUD + presença), feed, comentários aninhados, reações, amigos, follow, busca, explorar, resenhas, fotos, álbuns, áudios, calendário, stats, retrospectiva, conquistas, notificações in-app, tema claro/escuro, stories 24h e Spotify (se configurado): faixa ou playlist da conta conectada no rolê e no story.

Perfil privado (`is_public = false`): conteúdo só para dono, amigo aceito ou quem segue; estranho vê payload reduzido, sem e-mail.

### Recuperar senha

- `POST /auth/forgot-password` responde sempre `{ ok, message }`, com ou sem conta. O link vai só no e-mail (nunca na resposta, na tela ou em log de produção). Limites: 5 pedidos por e-mail e 10 por IP a cada 15 min (`429`).
- `POST /auth/reset-password` consome o token (1 h, uso único). `users.password_changed_at` derruba qualquer sessão emitida antes da troca (`lib/authenticate.ts`).

### Spotify

- O cliente só diz `{ kind: 'track' | 'playlist', spotifyId }`. O servidor confere no Spotify se o item é da conta conectada (`400` se não for) e grava título, artista, capa e link que o Spotify devolveu. `addedBy` é sempre a sessão.
- `GET /spotify/tracks` (músicas curtidas) e `GET /spotify/playlists` alimentam o seletor. Rolê: `POST /roles/:id/music`. Story: campos `musicKind` e `musicId` no `POST /stories`; a música fica na linha do story e some com ele em 24 h.
- O `state` do OAuth é assinado e de uso único (`spotify_oauth_states`); o callback só conclui para a mesma pessoa logada. Tokens ficam só no servidor.

## Como rodar

Ver o [README da raiz](../../README.md). Resumo:

```bash
pnpm install
pnpm --filter @resenhometro/api dev
pnpm --filter @resenhometro/web dev
```

Web: http://localhost:3000 · API: http://localhost:3333

Login no navegador: senha ≥ 8. Cookie `resenhometro_session` no domínio da API (`localhost:3333`). Sem `resenhometro_token` no `localStorage`.

## Persistência

- Padrão: PGlite em `apps/api/data` (gitignored)
- Opcional: `DATABASE_URL` + `docker compose up -d`
- Mídia: `apps/api/data/uploads`
- Reset **só local**: `pnpm --filter @resenhometro/api db:reset` (não toca Supabase)

## Onde estão os planos

Índice: [docs/README.md](../README.md). Só planos abertos ficam em `docs/`; os encerrados foram apagados e o histórico está no git.

Spec nova: `docs/front` ou `docs/back`. Fluxo: `sdd-specify` → `sdd-plan` → `sdd-execute`. Uma fatia por vez.

## Pendências reais

- Spotify só conecta com credenciais no `.env` (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`). Quem já tinha conectado antes precisa **desconectar e conectar de novo** para o escopo `user-library-read` (lista de faixas).
- A integração com o Spotify foi testada com o Spotify simulado; ainda falta um teste manual com credenciais reais.
- Recuperar senha só manda e-mail com `SMTP_*` configurado; sem isso, em dev, o link aparece só no log do servidor.
- Site público depende de Vercel (front) e Render/Railway (API)
