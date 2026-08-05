# API — Resenhômetro

Backend Fastify. **Dados em memória** (sem banco por enquanto — reinicia ao parar o servidor).

## Rodar

```bash
pnpm dev
```

## Rotas

- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `GET /roles`
- `GET /roles/:id`
- `POST /roles` (JWT)
