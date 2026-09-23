# Plano / estado atual — Resenhômetro

Este arquivo é o guia de trabalho **depois** da implementação da rede social e **depois** do plano de segurança e estrutura. Humanos e IAs devem seguir o que está aqui, não o MVP antigo em memória.

## Como a IA deve agir

1. Seja objetiva. Sem enrolação.
2. Não invente escopo. Mobile, desktop, mapa, chat em tempo real, pagamentos e push estão fora.
3. Não volte atrás para store só em memória. Persistência já existe (PGlite ou PostgreSQL).
4. Não mexa em `apps/mobile` nem `apps/desktop`.
5. Backend: `modules/<domínio>/` → `routes` → `service` → `src/db` / storage. Sem god-file de schema nem `helpers` de domínio.
6. Frontend: identidade **Redesenha** (DS v1.0). Dark estrutural + paper `#F2F0EC`, Plus Jakarta Sans, barra superior no desktop, bottom nav 5 no mobile, ondas + grain. Sem violeta de marca. Não reintroduzir `#FF6347` / lima / Inter como fonte principal. Páginas em `app/` finas; telas em `src/features/`; UI genérica em `components/`.
7. A branch estável do produto é a **`main`**. O plano de segurança e estrutura (passos 0–12) está **encerrado** na branch `chore/security-and-modular-stacks` — entra na `main` só via PR. Não reabrir esse plano passo a passo. Não misturar na `main` sem PR.
8. Não publique deploy sozinha. Código já está no GitHub; hospedagem (Vercel + Render/Railway) só com conta e variáveis.
9. Idioma com a equipe: português, direto.
10. Auth: cookie httpOnly `resenhometro_session` (7 dias). Web **não** grava JWT no `localStorage`. Axios `withCredentials`. CORS com origem explícita (`WEB_ORIGIN` / `CORS_ORIGINS`) e `credentials: true`. Não zerar Supabase de produção sem pedido explícito (`pode zerar o Supabase também`).

## Onde mexer

| Área | Pasta |
|------|--------|
| Backend | `apps/api/src/modules/` (auth, users, roles, social, search, notifications, stats, reviews, media, stories, music, storage) |
| Frontend | `apps/web/src/features/` (telas) e `apps/web/src/components/` (UI genérica) |
| Tipos | `packages/shared/` (`PublicUser` sem e-mail; `AuthUser` / `Me` com e-mail) |
| Rotas Next | `apps/web/src/app/` (compostores finos) |

## O que o produto já faz

Cadastro/login com cookie httpOnly (senha ≥ 8 no cadastro/reset/troca), perfil com avatar e capa, rolês (CRUD + presença), feed, comentários aninhados, reações, amigos, follow, busca, explorar, resenhas, fotos, álbuns, áudios, calendário, stats, retrospectiva, conquistas, notificações in-app, Spotify (se configurado), tema claro/escuro, stories 24h.

Perfil privado (`is_public = false`): conteúdo só para dono, amigo aceito ou quem segue; estranho vê payload reduzido, sem e-mail.

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

Índice: [docs/README.md](../README.md). Arquivo com `-pronto` está encerrado.

- Correção 0–9: [plano-correcao-pronto.md](../correcao/plano-correcao-pronto.md)
- Segurança e estrutura 0–12: [plano-seguranca-e-estrutura-pronto.md](../implementacao/plano-seguranca-e-estrutura-pronto.md) (branch `chore/security-and-modular-stacks`)
- Stories v1: [plano-stories-pronto.md](../stories/plano-stories-pronto.md)
- Identidade visual: [plano-migracao-identidade-visual-pronto.md](../front/plano-migracao-identidade-visual-pronto.md)

Spec nova: `docs/front`, `docs/back`, `docs/stories`, `docs/correcao` ou `docs/implementacao`. Fluxo: `sdd-specify` → `sdd-plan` → `sdd-execute`. Uma fatia por vez.

## Pendências reais

- Plano de segurança e estrutura: **encerrado** (0–12). Entra na `main` só via PR. Não reabrir.
- Spotify só conecta com credenciais no `.env`
- Site público depende de Vercel (front) e Render/Railway (API)
