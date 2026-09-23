# Spotify no rolê e no story

Status: aberto

## Problema

Quem usa o Resenhômetro conecta o Spotify, mas no rolê a música entra como título e artista digitados. A lista não mostra capa, não distingue playlist de faixa e não diz quem colocou. O story não aceita música. Cada pessoa precisa ver, no rolê e no story, o que a outra escolheu na própria conta.

## Comportamento

- Cada pessoa logada conecta a própria conta do Spotify e desconecta quando quiser.
- Com a conta conectada, escolhe uma faixa ou uma playlist dessa conta e coloca no rolê que já consegue abrir.
- Quem abre o rolê vê cada item com capa, nome e, na faixa, o artista. Se for playlist, o card deixa isso explícito.
- Cada item mostra quem colocou: nome e avatar da pessoa no Resenhômetro.
- No story, a pessoa coloca uma faixa ou playlist da conta conectada. Quem vê o story vê o mesmo card e quem publicou.
- A música do story some junto com o story, em 24 horas.
- Sem conta conectada, não dá para colocar faixa nem playlist.
- A biblioteca e os tokens de uma conta não aparecem para outra pessoa. Só entra o que alguém escolheu colocar.
- Música de rolê que a pessoa não pode abrir não aparece. Música de story que a pessoa não pode ver não aparece.

## Contrato

- `GET /spotify/status` — autenticado. Diz se a conta está conectada e o nome de exibição no Spotify. Não devolve token.
- `GET /spotify/connect` — autenticado. Devolve a URL para a pessoa entrar na própria conta.
- `GET /spotify/callback` — conclui a conexão e volta para a web. Erro de estado ou de código volta com falha, sem gravar conta.
- `DELETE /spotify` — autenticado. Remove a conexão da pessoa.
- `GET /spotify/playlists` — autenticado e conectado. Playlists da conta: nome, capa, link e quantidade de faixas.
- Escolha de faixa na conta conectada: id no Spotify, nome, artista, capa e link.
- `POST /roles/:id/music` — autenticado, conta conectada, rolê que a pessoa pode abrir. Corpo identifica faixa ou playlist da conta. Resposta é o rolê com o item novo.
- Item no rolê e no story: `id`, `kind` (`track` ou `playlist`), `title`, `artist` (nulo na playlist), `cover`, `spotifyUrl`, `addedBy` (`id`, `name`, `username`, `avatar`).
- Story com música segue a mesma audiência e a mesma expiração de 24 horas do story.
- Rolê inexistente ou inacessível: 404. Sem conta Spotify ou item fora da conta: 400.

## Segurança

- Conectar, desconectar, listar e colocar música exigem sessão. O cookie é httpOnly. O navegador não grava token do Spotify nem JWT no `localStorage`.
- O retorno do Spotify só conclui se o estado foi emitido para a mesma pessoa logada, não foi reutilizado e não foi alterado. Estado inválido não grava conta.
- Access token e refresh token ficam só no servidor. Nenhuma resposta, log ou tela os mostra.
- A faixa ou playlist é resolvida no servidor com a conta conectada. O cliente não envia título, capa nem link para serem gravados como vieram. Id de outra conta responde 400 e não grava.
- `addedBy` é a pessoa da sessão, nunca um campo do corpo.
- Desconectar apaga os tokens guardados.
- O callback só redireciona para a origem da web já configurada.
- Capa e link exibidos são os devolvidos pelo Spotify para aquele item, não HTML nem URL solta.

## Fora de escopo

- Tocar a faixa ou a playlist dentro do Resenhômetro.
- Digitar título e artista à mão.
- App mobile, app desktop, pagamento e push.
- Ver a fila ou as playlists privadas de outra pessoa.

## Critério de pronto

- Duas pessoas conectam contas diferentes. Uma coloca uma faixa no rolê; a outra, uma playlist. As duas abrem o rolê e veem capa, nome, o tipo playlist quando for o caso, e o nome de quem colocou.
- Sem Spotify conectado, o rolê não aceita item novo.
- Um story com faixa ou playlist mostra o card e o autor para quem já pode ver o story, e deixa de aparecer depois de 24 horas.
- Pessoa que não abre o rolê não recebe a música desse rolê.
- `GET /spotify/status` e o item do rolê não trazem access token nem refresh token.
- Estado de callback adulterado ou de outra pessoa não conecta conta.
- `POST /roles/:id/music` com id do Spotify de outra conta responde 400 e o rolê não ganha item.
- O corpo não consegue definir `addedBy` diferente da sessão.
