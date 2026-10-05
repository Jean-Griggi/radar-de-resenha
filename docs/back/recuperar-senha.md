# Recuperar senha por e-mail

Status: aberto

## Problema

Quem esquece a senha pede um link em `/esqueci-senha`. O pedido só vira e-mail se o SMTP estiver configurado. Sem isso, o ambiente local mostra o link na tela e a produção responde como se o e-mail tivesse saído. A mensagem ainda usa a marca violeta antiga. A pessoa precisa receber o e-mail e definir outra senha por esse link.

## Comportamento

- Na tela de esqueci a senha, a pessoa informa o e-mail da conta e pede o link.
- A resposta é a mesma exista ou não a conta: não diz se o e-mail está cadastrado.
- Se a conta existe e o envio está configurado, chega um e-mail com um link para escolher a nova senha. O link vale 1 hora e serve uma vez.
- O e-mail identifica o Resenhômetro e não usa violeta de marca.
- A tela de pedido não mostra o link cru como caminho para redefinir.
- Abrir o link leva a `/redefinir-senha`. A nova senha tem no mínimo 8 caracteres. Com ela, o login entra. A senha anterior deixa de entrar.
- Link expirado, já usado ou inválido não troca a senha e pede outro e-mail.
- Se o envio não está configurado ou falha, a pessoa não vê confirmação de que o e-mail saiu.

## Contrato

- `POST /auth/forgot-password` — corpo `{ email }`. Sempre `200` com `{ ok: true, message }` genérica, com ou sem conta. Não devolve o link. Não devolve `emailSent` nem `resetUrl`.
- Com conta existente e envio configurado, o e-mail parte nessa requisição. Sem conta, nada é enviado e a resposta continua a mesma.
- `POST /auth/reset-password` — corpo `{ token, password }`. Senha com menos de 8 caracteres: `400`. Token inválido, expirado ou já usado: `400` com mensagem para pedir outro e-mail. Sucesso: senha gravada e o token não serve de novo.
- Pedidos repetidos de esqueci a senha invalidam o link anterior ainda não usado.
- No máximo 5 pedidos por e-mail e 10 por IP a cada 15 minutos. Acima disso: `429`, sem dizer se a conta existe.
- O token do link é guardado só como hash. O valor cru aparece no e-mail e em mais nenhum lugar: nem resposta, nem log em produção, nem tela.

## Segurança

- A resposta de esqueci a senha é igual com conta, sem conta, com envio falho ou com limite estourado no que diz sobre a existência do e-mail. O `429` não confirma a conta.
- Senha nova com menos de 8 caracteres não grava. A senha não entra em log nem na resposta.
- Link expirado, usado ou inválido não altera a senha e não revela de quem era.
- Depois da troca, um cookie de sessão emitido antes do reset deixa de autenticar.
- O e-mail não inclui a senha. O link usa a origem da web já configurada.

## Fora de escopo

- Troca de senha com a pessoa já logada.
- Login sem senha, magic link permanente e confirmação de cadastro.
- App mobile, app desktop, mapa, pagamento e push.

## Critério de pronto

- Com o envio configurado, um e-mail cadastrado recebe o link. A tela de pedido não exibe a URL.
- O link abre a troca de senha. A senha nova entra no login. A antiga não entra.
- O mesmo link, usado de novo ou depois de 1 hora, falha.
- E-mail que não é de conta recebe a mesma resposta, sem mensagem de envio e sem e-mail.
- Com envio desligado, a tela não afirma que o link foi enviado e não oferece URL no lugar do e-mail.
- A resposta HTTP não contém o token. Em produção o log também não contém.
- O sexto pedido do mesmo e-mail em 15 minutos responde `429`.
- Um cookie de sessão de antes do reset, usado depois da troca, não entra na conta.
