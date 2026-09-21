# Deploy: Resenhômetro na Vercel + Supabase

Frontend (Next.js) e API (Fastify serverless) na Vercel. Banco Postgres e arquivos no Supabase.

Guia resumido. Variáveis: `.env.production.example`.

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Database → Connect → Connection string → URI**  
   Use **Transaction pooler** (porta **6543**), não a conexão direta.  
   Isso vira `DATABASE_URL`. Adicione `?sslmode=require` no final se ainda não tiver.
3. **Project Settings → API**
   - Project URL → `SUPABASE_URL` (`https://xxxx.supabase.co`)
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`  
     **Nunca** use a `anon` key na API e **nunca** coloque a `service_role` no frontend.
4. O bucket `resenhometro-uploads` é criado automaticamente na primeira request da API (público).  
   Se preferir criar na mão: **Storage → New bucket** → nome `resenhometro-uploads` → **Public**.

## 2. GitHub

Suba este repositório para o GitHub (sem `.env` com segredos).

## 3. Vercel — API

1. **Add New → Project** e importe o mesmo repositório.
2. **Root Directory:** `apps/api`
3. Framework: **Other** (lê `apps/api/vercel.json`).
4. **Environment Variables** (Production, Preview e Development):

   | Variável | Valor |
   |---|---|
   | `JWT_SECRET` | string aleatória com **pelo menos 32 caracteres** (obrigatória; a API não tem default em produção) |
   | `DATABASE_URL` | pooler do Supabase (porta 6543) |
   | `SUPABASE_URL` | Project URL |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role |
   | `SUPABASE_STORAGE_BUCKET` | `resenhometro-uploads` |
   | `PUBLIC_API_URL` | preencha depois do 1º deploy |
   | `WEB_ORIGIN` | URL do web (próximo passo; pode usar um placeholder agora) |
   | `CORS_ORIGINS` | igual a `WEB_ORIGIN` |

5. Deploy. Teste: `https://SEU-API.vercel.app/health` → `{"status":"ok"}`.
6. Volte nas env vars, preencha `PUBLIC_API_URL` com a URL real da API e **Redeploy**.

## 4. Vercel — Web

1. **Add New → Project** no **mesmo** repositório (segundo projeto).
2. **Root Directory:** `apps/web`
3. Framework: Next.js (detectado).
4. Env var: `NEXT_PUBLIC_API_URL` = URL da API (passo 3).
5. Deploy.

## 5. Fechar o ciclo (CORS + cookie)

O login **não** guarda JWT no `localStorage`. A API seta o cookie httpOnly `resenhometro_session` (Secure em produção, SameSite=Lax, path `/`, 7 dias) no **domínio da API**. O web manda esse cookie porque o Axios usa `withCredentials`.

Por isso o CORS da API usa `credentials: true` e origem **explícita** — `WEB_ORIGIN` e `CORS_ORIGINS` têm que ser a URL **exata** do front (`https://....vercel.app`). Wildcard (`*` ou `*.vercel.app`) **não** funciona com cookie.

No projeto da **API**, atualize `WEB_ORIGIN` e `CORS_ORIGINS` com a URL final do web e faça Redeploy. Sem isso o navegador bloqueia as chamadas **e** não envia o cookie.

Ordem típica: API (com placeholder de CORS) → Web → API de novo com a URL real do web.

## Checklist rápido

- [ ] `/health` responde `{"status":"ok"}`
- [ ] Cadastro com senha ≥ 8 / login no site
- [ ] DevTools → Application: cookie `resenhometro_session` no domínio da API; **nenhum** `resenhometro_token` no `localStorage`
- [ ] Upload de avatar (arquivo vai para o Storage do Supabase)
- [ ] CORS sem erro no DevTools (e `Access-Control-Allow-Credentials: true`)

## Observações

- **Cold start:** a primeira request depois de idle pode demorar (sobe Fastify + banco). Normal em serverless.
- **Uploads grandes:** o arquivo **não** passa pela função da Vercel (limite de 4.5 MB). O front pede uma URL assinada à API e envia direto ao Supabase Storage.
- **Hobby vs Pro:** `maxDuration` da API está em 30s. Em projetos novos com Fluid Compute o teto do Hobby é bem maior; se o deploy reclamar, reduza em `apps/api/vercel.json`.
- Spotify e e-mail (esqueci a senha) são opcionais.
