# Resenhômetro — Guia da Equipe

> É os mais bigodes da capital krai.

Onboarding: o que é o projeto, como instalar e o Git do dia a dia.

---

## Sobre o projeto

O **Resenhômetro** é uma rede social de rolês e memórias. Dá para criar perfil, registrar encontros, confirmar presença, comentar, reagir, postar resenhas, fotos, áudios, ver calendário, estatísticas e (se configurado) ligar o Spotify.

Repositório: https://github.com/Jean-Griggi/radar-de-resenha

A branch estável é a **`main`**. Trabalho maior entra por PR.

---

## Stack

**Front:** Next.js, React, TypeScript, Tailwind CSS, Axios (`withCredentials`)  
**Back:** Fastify, TypeScript, cookie httpOnly + JWT, bcrypt, Zod  
**Banco:** PGlite no disco (padrão) ou PostgreSQL  
**Repo:** GitHub, pnpm, Turbo

Sessão: cookie `resenhometro_session` no domínio da API. O web **não** guarda JWT no `localStorage`. Senha mínima **8** no cadastro.

Mobile e desktop estão reservados — não mexer.

---

## Estrutura

```
radar-de-resenha/
├── apps/api/src/modules/   Backend por domínio (auth, roles, social, …)
├── apps/web/src/features/  Telas por domínio
├── apps/web/src/app/       Páginas finas do Next
├── packages/shared/        Tipos (PublicUser sem e-mail)
├── packages/ui/
├── packages/config/
├── docs/
└── docker-compose.yml      (PostgreSQL opcional)
```

---

## Equipe

Jean, João, Adryan, Rafael, Lucas, Niel, Davi, Gabriel

---

# PARTE 1 — Instalação (uma vez na máquina)

| Ferramenta | Link |
|------------|------|
| Git | git-scm.com/downloads |
| Node.js 20+ | nodejs.org |
| pnpm 10+ | `npm install -g pnpm` |

```bash
git --version
node --version
pnpm --version
```

Docker só se quiser PostgreSQL separado. Sem Docker o app já guarda dados.

---

# PARTE 2 — Clonar e rodar

```bash
git clone https://github.com/Jean-Griggi/radar-de-resenha.git
cd radar-de-resenha
pnpm install
```

**Windows:**

```powershell
Copy-Item .env.example .env
Copy-Item .env.example apps/web/.env.local
```

No `.env.local` do web, o essencial é `NEXT_PUBLIC_API_URL=http://localhost:3333`.

Dois terminais:

```bash
pnpm --filter @resenhometro/api dev
pnpm --filter @resenhometro/web dev
```

| App | URL |
|-----|-----|
| Web | http://localhost:3000 |
| API | http://localhost:3333 |

Teste: `GET http://localhost:3333/health` → `{"status":"ok"}`.

Depois cadastre uma conta no navegador (senha com **pelo menos 8** caracteres). O login grava o cookie `resenhometro_session` em `localhost:3333`.

Reset do banco **local** (não usa em produção): `pnpm --filter @resenhometro/api db:reset`.

### Comandos

| Comando | O que faz |
|---------|-----------|
| `pnpm install` | Dependências |
| `pnpm --filter @resenhometro/api dev` | API |
| `pnpm --filter @resenhometro/web dev` | Web |
| `pnpm test` | Testes da API |
| `pnpm build` / `pnpm lint` / `pnpm typecheck` | Qualidade |

### Problemas comuns

| Problema | Solução |
|----------|---------|
| `pnpm` não encontrado | `npm install -g pnpm` |
| Login antigo falha | Banco local vazio — cadastre de novo (senha ≥ 8) |
| Cookie de sessão não aparece | `WEB_ORIGIN` tem que ser `http://localhost:3000` |
| Porta em uso | Feche o processo |

---

# PARTE 3 — Git

Git guarda o histórico. GitHub hospeda o repositório.

```bash
git status
git add .
git commit -m "feat: descreva o que fez"
git pull
git push
```

Trabalhamos na **`main`**. Puxe antes de começar (`git pull`) e empurre quando terminar (`git push`). Trabalho maior (segurança, pastas) entra por PR, não commit direto na `main`.

### Commits (Conventional Commits)

| Prefixo | Uso |
|---------|-----|
| `feat:` | Funcionalidade |
| `fix:` | Bug |
| `docs:` | Documentação |
| `refactor:` | Refatoração |
| `test:` | Testes |
| `chore:` | Manutenção |

Exemplos: `feat: cria filtro de rolês` · `fix: corrige cookie de sessão` · `docs: atualiza README`

---

## Objetivos

Aprender stack moderna, trabalhar em equipe e manter um produto real de rolês.

**Licença:** privado — uso interno da equipe.
