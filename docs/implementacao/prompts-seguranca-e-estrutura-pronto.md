# Prompts — segurança e estrutura

> **Pronto.** Arquivo histórico. Os passos já foram executados.

Cole **um** bloco no chat do Cursor (modo **Agent**). A IA lê o plano, executa **só aquele passo**, commita, explica para você aprender e anuncia o próximo.

Plano: [plano-seguranca-e-estrutura-pronto.md](plano-seguranca-e-estrutura-pronto.md)  
Regras: [plano-execucao.md](../ai/plano-execucao.md)

Não cole dois passos de uma vez. Branch: `chore/security-and-modular-stacks`. Sem merge na `main`. Sem deploy sozinho. Sem zerar Supabase de produção, a menos que você escreva `pode zerar o Supabase também`.

---

## Como usar

1. Abra o plano e veja o próximo passo `[ ]`.
2. Copie o prompt desse número (ou o genérico).
3. Cole no Agent.
4. Leia o bloco **O que mudou / Como isso funciona**.
5. Valide na tela. Só então cole o próximo.

Ordem: **0 → 12**. Não pular 1–3.

---

## Prompt genérico (troque o N)

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md, docs/implementacao/prompts-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo N do plano de segurança e estrutura.
- Branch: chore/security-and-modular-stacks (não trabalhe na main; não crie outra branch).
- Siga "O que fazer", "Como validar" e "Não fazer" desse passo.
- Não implemente outro passo. Não invente escopo. Não mexa em mobile/desktop. Não redesenhe o visual.
- Idioma: português.

Ao terminar, obrigatório nesta ordem:
1. Marque o passo [x] no plano e preencha o Registro de execução.
2. Um commit Conventional Commits só deste passo (mensagem da seção Ship). Push da branch chore/security-and-modular-stacks.
3. Responda com o bloco de aprendizado do plano:
   - O que mudou neste passo
   - Como isso funciona (termo técnico + tradução simples)
   - O que você veria se testasse
   - O que não fizemos ainda
   - Próximo: Passo N+1 — <nome>.
```

Substitua `N` por `0` … `12`.

---

## Passo 0 — Baseline

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md, docs/implementacao/prompts-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 0 — Baseline.
- Confirme que estamos na branch chore/security-and-modular-stacks.
- Preencha a tabela de inventário no próprio plano com achados reais do código (arquivo + fato). Não invente.
- Não altere apps/, packages/, .env nem o banco.

Ao terminar: marque [x], registro, commit Ship do passo 0, push da branch, bloco de aprendizado, e fale:
Próximo: Passo 1 — Perímetro da API.
```

---

## Passo 1 — Perímetro da API

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 1 — Perímetro da API.
- JWT_SECRET sem default fraco em produção; CORS allowlist (sem *.vercel.app); rate limit em login/register/forgot; resetUrl só fora de produção; Helmet básico; sem logar token/resetUrl em prod.
- Não implemente cookie/localStorage neste passo. Não fatie pastas.

Ao terminar: [x], registro, commit Ship do passo 1, push, bloco de aprendizado.
Próximo: Passo 2 — Sessão em cookie.
```

---

## Passo 2 — Sessão em cookie

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 2 — Sessão em cookie.
- Cookie httpOnly + expiresIn; logout limpa cookie; Axios withCredentials; web para de guardar JWT no localStorage; CORS credentials.
- Não fatie módulos. Não mude is_public. Não zere o banco.

Ao terminar: [x], registro, commit Ship do passo 2, push, bloco de aprendizado.
Próximo: Passo 3 — Privacidade.
```

---

## Passo 3 — Privacidade

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 3 — Privacidade.
- E-mail só em /auth/me; honrar is_public; senha mínima 8; testes.
- Não refatore pastas nem cookie de novo.

Ao terminar: [x], registro, commit Ship do passo 3, push, bloco de aprendizado.
Próximo: Passo 4 — Fatiar rotas da API.
```

---

## Passo 4 — Fatiar rotas da API

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 4 — Fatiar rotas da API.
- search só /search e /explore; social, notifications e stats/calendar com as próprias rotas. HTTP igual.
- Não quebre common.schema.ts neste passo.

Ao terminar: [x], registro, commit Ship do passo 4, push, bloco de aprendizado.
Próximo: Passo 5 — Schemas por módulo.
```

---

## Passo 5 — Schemas por módulo

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 5 — Schemas por módulo.
- Zod por domínio; sem god-file common.schema. Sem mudar regra além do passo 3.

Ao terminar: [x], registro, commit Ship do passo 5, push, bloco de aprendizado.
Próximo: Passo 6 — Helpers e rotas canônicas.
```

---

## Passo 6 — Helpers e rotas canônicas

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 6 — Helpers e rotas canônicas.
- helpers.ts só data/SQL helpers; notify/mapUser no módulo dono; uma URL por recurso; remover GET /me gêmeo; avatar/capa em users.
- Ajuste mínimo no web se a URL mudar.

Ao terminar: [x], registro, commit Ship do passo 6, push, bloco de aprendizado.
Próximo: Passo 7 — Chrome do web.
```

---

## Passo 7 — Chrome do web

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 7 — Chrome do web.
- Chat mock fora do AppShell; links só /roles/new. Sem mudar o visual Redesenha. Sem features/ ainda.

Ao terminar: [x], registro, commit Ship do passo 7, push, bloco de aprendizado.
Próximo: Passo 8 — features/auth e features/roles.
```

---

## Passo 8 — features/auth e features/roles

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 8 — features/auth e features/roles.
- Pages finas; extrair código existente. Sem mudar comportamento. Sem migrar o resto das telas.

Ao terminar: [x], registro, commit Ship do passo 8, push, bloco de aprendizado.
Próximo: Passo 9 — Resto das features.
```

---

## Passo 9 — Resto das features

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 9 — Resto das features.
- Extrair social, users, media, stories, reviews, search, notifications, stats, music, settings. Sem feature nova. Sem chat realtime.

Ao terminar: [x], registro, commit Ship do passo 9, push, bloco de aprendizado.
Próximo: Passo 10 — Contrato shared.
```

---

## Passo 10 — Contrato shared

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 10 — Contrato shared.
- Tipos públicos sem e-mail obrigatório; shared sem React/SQL. Typecheck verde.

Ao terminar: [x], registro, commit Ship do passo 10, push, bloco de aprendizado.
Próximo: Passo 11 — Reset do banco local.
```

---

## Passo 11 — Reset do banco local

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 11 — Reset do banco local.
- Zerar PGlite e uploads em apps/api/data/. Se houver Postgres Docker local, zerar também.
- NÃO zere Supabase de produção, a menos que eu tenha escrito neste chat: "pode zerar o Supabase também".
- Ideal: script pnpm db:reset documentado. Commit só do script/docs, não de dados.
- Na explicação, liste o que foi apagado e o que não foi.

Ao terminar: [x], registro, commit Ship do passo 11, push, bloco de aprendizado.
Próximo: Passo 12 — Docs e fechamento.
```

---

## Passo 12 — Docs e fechamento

```
Leia docs/implementacao/plano-seguranca-e-estrutura-pronto.md e docs/ai/plano-execucao.md.

Execute SOMENTE o Passo 12 — Docs e fechamento.
- Atualize README, DEPLOY, guia da API/web e plano-execucao para cookie, módulos e features/.
- Não implemente feature nova.
- Ao final: Próximo: nenhum. Plano encerrado. Abra o PR da branch chore/security-and-modular-stacks.

Ao terminar: [x], registro, commit Ship do passo 12, push, bloco de aprendizado.
```
