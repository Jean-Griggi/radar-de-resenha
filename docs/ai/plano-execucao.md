# Plano / estado atual — Resenhômetro

Este arquivo é o guia de trabalho **depois** da implementação da rede social. Humanos e IAs devem seguir o que está aqui, não o MVP antigo em memória.

## Como a IA deve agir

1. Seja objetiva. Sem enrolação.
2. Não invente escopo. Mobile, desktop, mapa, chat em tempo real, pagamentos e push estão fora.
3. Não volte atrás para store só em memória. Persistência já existe (PGlite ou PostgreSQL).
4. Não mexa em `apps/mobile` nem `apps/desktop`.
5. Backend: `routes` → `service` → `src/db` / storage.
6. Frontend: identidade **Redesenha** (DS v1.0). Dark estrutural + paper `#F2F0EC`, Plus Jakarta Sans, barra superior no desktop, bottom nav 5 no mobile, ondas + grain. Sem violeta de marca. Não reintroduzir `#FF6347` / lima / Inter como fonte principal.
7. A branch estável do produto é a **`main`**. O plano de segurança e estrutura roda na branch **`chore/security-and-modular-stacks`** até o PR. Não misturar esse trabalho na `main` passo a passo sem PR.
8. Não publique deploy sozinha. Código já está no GitHub; hospedagem (Vercel + Render/Railway) só com conta e variáveis.
9. Idioma com a equipe: português, direto.
10. Segurança + pastas: seguir [plano-seguranca-e-estrutura.md](../plano-seguranca-e-estrutura.md), **um passo por vez**. Arquitetura alvo: monólito modular **por stacks** (web / API / shared). Cookie httpOnly no lugar de JWT no `localStorage`. Não zerar Supabase de produção sem pedido explícito.

## Onde mexer

| Área | Pasta |
|------|--------|
| Backend | `apps/api/` |
| Frontend | `apps/web/` |
| Tipos | `packages/shared/` |
| UI | `apps/web/src/components` (preferir) |

## O que o produto já faz

Cadastro/login JWT, perfil com avatar e capa, rolês (CRUD + presença), feed, comentários aninhados, reações, amigos, follow, busca, explorar, resenhas, fotos, álbuns, áudios, calendário, stats, retrospectiva, conquistas, notificações in-app, Spotify (se configurado), tema claro/escuro, stories 24h.

## Como rodar

Ver o [README da raiz](../../README.md). Resumo:

```bash
pnpm install
pnpm --filter @resenhometro/api dev
pnpm --filter @resenhometro/web dev
```

Web: http://localhost:3000 · API: http://localhost:3333

## Persistência

- Padrão: PGlite em `apps/api/data` (gitignored)
- Opcional: `DATABASE_URL` + `docker compose up -d`
- Mídia: `apps/api/data/uploads`

## Pendências reais

- Plano em andamento: [segurança e estrutura](../plano-seguranca-e-estrutura.md) (passos 0–12; prompts em [prompts-seguranca-e-estrutura.md](../prompts-seguranca-e-estrutura.md))
- Spotify só conecta com credenciais no `.env`
- Site público depende de Vercel (front) e Render/Railway (API)
