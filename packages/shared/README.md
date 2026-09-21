# Shared — Resenhômetro

Utilitários, constantes e tipos compartilhados entre `apps/api` e `apps/web` (categorias de rolê, reações, usuários públicos, feed, etc.).

- `PublicUser` / `UserProfile`: sem e-mail.
- `AuthUser` / `Me`: único contrato com e-mail (sessão `/auth/me`).

Sem React, sem SQL, sem código de cookie. Importar de `@resenhometro/shared`.
