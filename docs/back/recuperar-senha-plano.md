# Plano — Recuperar senha por e-mail

Spec: docs/back/recuperar-senha.md
Status: aberto

## Fatia 1 — Pedido, e-mail e tela sem o link

- [ ] pendente

**O que fazer:**

`POST /auth/forgot-password` responde sempre `200` com `{ ok: true, message }` genérica, com ou sem conta. Não devolve o link, `emailSent` nem `resetUrl`. Com conta existente e envio configurado, o e-mail parte nessa requisição. Sem conta, nada é enviado e a resposta continua a mesma. Pedido repetido invalida o link anterior ainda não usado. O token fica só como hash. O valor cru vai no e-mail e em mais nenhum lugar: nem resposta, nem log em produção, nem tela. O e-mail identifica o Resenhômetro, usa a origem da web já configurada e não usa violeta de marca. No máximo 5 pedidos por e-mail e 10 por IP a cada 15 minutos; acima disso `429`, sem dizer se a conta existe. Se o envio não está configurado ou falha, a resposta e a tela não confirmam que o e-mail saiu e não oferecem a URL no lugar. A tela de `/esqueci-senha` só informa o e-mail e pede o link.

**O que não fazer:**

Troca de senha com a pessoa já logada, login sem senha, magic link permanente e confirmação de cadastro. Não colocar a senha no e-mail, no log nem na resposta. O `429` não confirma a conta. Não reabrir app mobile, desktop, mapa, pagamento ou push.

**Como validar:**

- Com o envio configurado, e-mail cadastrado recebe o link. A tela de pedido não exibe a URL. A resposta HTTP não contém o token. Em produção o log também não contém.
- E-mail que não é de conta recebe a mesma resposta, sem mensagem de envio e sem e-mail.
- Com envio desligado ou falho, a tela não afirma que o link foi enviado e não oferece URL.
- O sexto pedido do mesmo e-mail em 15 minutos responde `429`. O limite por IP (10 em 15 minutos) também responde `429` sem revelar a conta.
- O e-mail não usa violeta de marca.

**Arquivos prováveis:**

`apps/api/src/modules/auth/auth.service.ts`, `auth.routes.ts`, `auth.test.ts`, `apps/api/src/lib/mail.ts`, `apps/api/src/lib/auth-rate-limit.ts`, `apps/web/src/features/auth/EsqueciSenhaScreen.tsx`

## Fatia 2 — Troca pelo link e sessão anterior

- [ ] pendente

**O que fazer:**

`POST /auth/reset-password` com `{ token, password }`. Senha com menos de 8 caracteres: `400`, sem gravar. Token inválido, expirado (1 hora) ou já usado: `400` com mensagem para pedir outro e-mail, sem revelar de quem era e sem alterar a senha. Sucesso grava a senha nova e o token não serve de novo. A senha anterior deixa de entrar no login. Um cookie de sessão emitido antes desse reset deixa de autenticar. A sessão nova, depois do login com a senha nova, entra.

**O que não fazer:**

Não tratar aqui a troca de senha da pessoa já logada. Não devolver a senha nem o token. Não autenticar link expirado, usado ou inválido. Não estender a sessão antiga.

**Como validar:**

- O link abre a troca em `/redefinir-senha`. A senha nova entra no login. A antiga não entra.
- O mesmo link, usado de novo ou depois de 1 hora, falha e a senha não muda.
- Senha com menos de 8 caracteres responde `400` e não grava.
- Um cookie de sessão de antes do reset, usado depois da troca, não entra na conta.

**Arquivos prováveis:**

`apps/api/src/modules/auth/auth.service.ts`, `auth.routes.ts`, `apps/api/src/lib/authenticate.ts`, `apps/api/src/db/migrate.ts`, `apps/web/src/features/auth/RedefinirSenhaScreen.tsx`, `apps/api/src/modules/auth/auth.test.ts`
