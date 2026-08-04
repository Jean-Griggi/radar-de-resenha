# 🎉 Resenhômetro

> É os mais bigodes da capital krai.

---

# 📖 Sobre

O **Resenhômetro** é uma plataforma desenvolvida para facilitar a organização de encontros entre amigos.

O sistema permitirá criar rolês, confirmar presença, compartilhar localização, comentar, avaliar encontros e centralizar todas as informações importantes em um único lugar.

Nosso objetivo é tornar a organização de rolês mais simples, rápida e divertida.

---

# ✨ Funcionalidades

- 👤 Cadastro e Login
- 🧑 Perfil de usuário
- 🎉 Criar rolês
- ✏️ Editar rolês
- 🗑️ Excluir rolês
- 📍 Localização do encontro
- 💬 Comentários
- ⭐ Avaliação dos rolês
- ✅ Confirmar presença
- ❌ Informar ausência
- 💰 Informar gastos
- 📷 Fotos (futuro)
- 🔔 Notificações (futuro)

---

# 🏛️ Arquitetura Geral

```mermaid
flowchart LR

U[👤 Usuário]

U --> WEB[🌐 Front-end<br/>Next.js]

WEB --> API[⚡ API<br/>Fastify]

API --> DB[(🐘 PostgreSQL)]

API --> MAPS[🗺️ OpenStreetMap]

API --> AUTH[🔐 JWT]
```

---

# 🚀 Fluxo do Usuário

```mermaid
flowchart LR

Login --> Home

Home --> CriarRolê

CriarRolê --> Amigos

Amigos --> Comentários

Comentários --> ConfirmarPresença

ConfirmarPresença --> Finalizado
```

---

# ⚙️ Fluxo do Backend

```mermaid
flowchart LR

Request --> Controller

Controller --> Service

Service --> Repository

Repository --> Database

Database --> Repository

Repository --> Service

Service --> Controller

Controller --> Response
```

---

# 🛠️ Stack de Tecnologias

```mermaid
flowchart TD

A[Resenhômetro]

A --> B[Frontend]
B --> B1[Next.js]
B --> B2[React]
B --> B3[TypeScript]
B --> B4[Tailwind CSS]
B --> B5[shadcn/ui]

A --> C[Backend]
C --> C1[Node.js]
C --> C2[Fastify]
C --> C3[Drizzle ORM]
C --> C4[JWT]

A --> D[Banco de Dados]
D --> D1[PostgreSQL]

A --> E[Ferramentas]
E --> E1[Docker]
E --> E2[GitHub]
E --> E3[Bruno]
E --> E4[VS Code]
```

---

# 📚 Tecnologias

## 🌐 Front-end

| Tecnologia | Utilização |
|------------|------------|
| Next.js | Framework React |
| React | Interface da aplicação |
| TypeScript | Tipagem |
| Tailwind CSS | Estilização |
| shadcn/ui | Componentes |
| React Hook Form | Formulários |
| Zod | Validação |
| Axios | Comunicação com API |

---

## ⚡ Back-end

| Tecnologia | Utilização |
|------------|------------|
| Node.js | Ambiente JavaScript |
| Fastify | Framework da API |
| TypeScript | Tipagem |
| Drizzle ORM | ORM |
| JWT | Autenticação |
| bcrypt | Criptografia de senha |

---

## 🐘 Banco de Dados

- PostgreSQL

---

## 🗺️ Mapas

- OpenStreetMap
- Leaflet

---

## 🧪 Testes

- Vitest
- Bruno

---

## 🐳 Infraestrutura

- Docker
- Docker Compose

---

# 📂 Estrutura do Projeto

```text
resenhometro/
│
├── apps/
│   ├── api/
│   ├── web/
│   ├── mobile/
│   └── desktop/
│
├── packages/
│   ├── ui/
│   ├── shared/
│   └── config/
│
├── docs/
│
├── docker/
│
├── .github/
│
└── README.md
```

---

# 🗂️ Organização do Monorepo

```mermaid
flowchart TD

ROOT[Resenhômetro]

ROOT --> APPS[apps]
ROOT --> PACKAGES[packages]
ROOT --> DOCS[docs]
ROOT --> DOCKER[docker]

APPS --> WEB[web]

APPS --> API[api]

APPS --> MOBILE[mobile]

APPS --> DESKTOP[desktop]

PACKAGES --> UI[ui]

PACKAGES --> SHARED[shared]

PACKAGES --> CONFIG[config]
```

---

# 📖 O que é cada pasta?

| Pasta | Objetivo |
|--------|----------|
| apps/api | API Backend |
| apps/web | Aplicação Web |
| apps/mobile | Aplicativo Mobile (futuro) |
| apps/desktop | Aplicativo Desktop (futuro) |
| packages/ui | Componentes reutilizáveis |
| packages/shared | Código compartilhado |
| packages/config | Configurações compartilhadas |
| docs | Documentação |
| docker | Arquivos Docker |

---

# 🌱 Git Flow

```text
main
 │
 ├── develop
 │
 ├── feature/login
 ├── feature/roles
 ├── feature/usuarios
 ├── fix/login
 └── hotfix/producao
```

---

# 🌿 Padrão de Branches

```
feature/nome-da-feature
fix/nome-do-bug
hotfix/nome-do-hotfix
docs/documentacao
refactor/refatoracao
```

---

# 📝 Padrão de Commits

```
feat:
fix:
docs:
style:
refactor:
test:
chore:
```

Exemplo:

```
feat: cria sistema de login

fix: corrige autenticação JWT

docs: atualiza README

refactor: reorganiza estrutura da API
```

---

# 📅 Roadmap

```mermaid
journey
title Desenvolvimento do Resenhômetro

section Planejamento

Criar Repositório: 5: Jean

README: 5: Jean

Arquitetura: 5: Jean

Tecnologias: 5: Equipe

section Desenvolvimento

Backend: 1: Equipe

Frontend: 1: Equipe

Banco de Dados: 1: Equipe

Testes: 1: Equipe

section Futuro

Mobile: 0: Equipe

Desktop: 0: Equipe
```

---

# 👥 Equipe/Usuarios

- Jean
- João
- Adryan
- Rafael
- Lucas
- Niel
- Davi
- Gabriel

---

# 🎯 Objetivos do Projeto

- Aprender novas tecnologias
- Praticar desenvolvimento em equipe
- Criar um projeto real
- Melhorar conhecimentos em arquitetura
- Evoluir em Git e GitHub
- Desenvolver um sistema útil para o grupo

---

# 📄 Licença

Este projeto é privado e foi desenvolvido para uso interno entre os guri.
