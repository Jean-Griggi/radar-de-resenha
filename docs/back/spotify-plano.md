# Plano — Spotify no rolê e no story

Spec: docs/back/spotify.md
Status: aberto

## Fatia 1 — Item de faixa ou playlist

- [ ] pendente

**O que fazer:**

O item de música do rolê passa a ter `kind` (`track` ou `playlist`), `artist` nulo na playlist, e `addedBy` (`id`, `name`, `username`, `avatar`) de quem colocou. Capa e link ficam nos campos que o servidor vai preencher na fatia 3. O story ganha o mesmo item, na mesma linha que já expira em 24 horas, para sumir junto com o story. Tipos compartilhados acompanham o contrato: `id`, `kind`, `title`, `artist`, `cover`, `spotifyUrl`, `addedBy`.

**O que não fazer:**

Não tocar a faixa dentro do produto. Não gravar access token nem refresh token nessas colunas. Não aceitar ainda título, capa ou link vindos do cliente. Não abrir fila nem playlist privada de outra pessoa. App mobile, desktop, pagamento e push ficam de fora.

**Como validar:**

- Migração sobe com `kind` e artista opcional no rolê, e com o item no story preso à expiração já existente.
- O tipo compartilhado não tem campo de token.

**Arquivos prováveis:**

`apps/api/src/db/migrate.ts`, `packages/shared/src/types.ts`, `apps/api/src/modules/music/music.schema.ts`, `apps/api/src/modules/stories/stories.schema.ts`

## Fatia 2 — Conexão de uso único na sessão

- [ ] pendente

**O que fazer:**

Manter `GET /spotify/status`, `GET /spotify/connect`, `GET /spotify/callback` e `DELETE /spotify`. Status diz se está conectado e o nome de exibição, sem token. Connect devolve só a URL da própria conta. O callback só conclui se o estado foi emitido para a mesma pessoa logada, não foi reutilizado e não foi alterado. Estado inválido não grava conta. O redirect volta só para a origem da web já configurada. Desconectar apaga os tokens guardados. Access token e refresh token ficam só no servidor.

**O que não fazer:**

Não devolver token em status, no item, em log ou na tela. Não gravar token do Spotify nem JWT no `localStorage`. O cookie continua httpOnly. Não conectar conta com estado de outra pessoa.

**Como validar:**

- `GET /spotify/status` não traz access token nem refresh token.
- Estado de callback adulterado ou de outra pessoa não conecta conta.
- Estado já usado não conecta de novo.
- Desconectar remove a conexão. O retorno só redireciona para a origem configurada.

**Arquivos prováveis:**

`apps/api/src/modules/music/music.service.ts`, `music.routes.ts`, `music.service.test.ts`, `apps/api/src/db/migrate.ts`

## Fatia 3 — Colocar música no rolê pelo servidor

- [ ] pendente

**O que fazer:**

A pessoa conectada escolhe uma faixa ou playlist da própria conta. Playlists continuam em `GET /spotify/playlists` (nome, capa, link, quantidade). A escolha de faixa devolve id no Spotify, nome, artista, capa e link, resolvidos no servidor. `POST /roles/:id/music` exige sessão, conta conectada e rolê que a pessoa pode abrir. O corpo identifica `kind` e o id do Spotify. O servidor busca o item com a conta conectada e grava capa, nome, artista e link que o Spotify devolveu. A resposta é o rolê com o item novo. `addedBy` é a pessoa da sessão. Rolê inexistente ou inacessível: `404`. Sem conta Spotify ou id de outra conta: `400`, sem gravar. Música de rolê que a pessoa não pode abrir não entra na resposta.

**O que não fazer:**

Não gravar título, capa ou link enviados pelo cliente. Não aceitar `addedBy` no corpo. Não digitar título e artista à mão. Não mostrar a biblioteca nem os tokens de outra pessoa. Não tocar a mídia.

**Como validar:**

- Sem Spotify conectado, o rolê não aceita item novo (`400`).
- Id do Spotify de outra conta responde `400` e o rolê não ganha item.
- O corpo não define `addedBy` diferente da sessão.
- O item do rolê não traz access token nem refresh token.
- Pessoa que não abre o rolê não recebe a música desse rolê. Rolê inexistente responde `404`.

**Arquivos prováveis:**

`apps/api/src/modules/music/music.service.ts`, `music.schema.ts`, `music.routes.ts`, `apps/api/src/modules/roles/roles.routes.ts`, `roles.service.ts`

## Fatia 4 — Card no rolê

- [ ] pendente

**O que fazer:**

No rolê que a pessoa já abre, com a conta conectada, ela escolhe faixa ou playlist e coloca. Quem abre o rolê vê capa, nome e, na faixa, o artista. Playlist deixa o tipo explícito. Cada item mostra nome e avatar de quem colocou no Resenhômetro. Sem conta conectada, não há como colocar item novo.

**O que não fazer:**

Não oferecer campo de título e artista digitados. Não tocar a faixa no produto. Não guardar token no navegador. Não listar a biblioteca de outra pessoa.

**Como validar:**

- Duas pessoas conectam contas diferentes. Uma coloca uma faixa; a outra, uma playlist. As duas abrem o rolê e veem capa, nome, o tipo playlist quando for o caso, e o nome de quem colocou.
- Sem Spotify conectado, a tela não envia item novo.

**Arquivos prováveis:**

`apps/web/src/features/roles/RoleDetailScreen.tsx`, `apps/web/src/features/music/MusicScreen.tsx`

## Fatia 5 — Música no story

- [ ] pendente

**O que fazer:**

No story, a pessoa coloca uma faixa ou playlist da conta conectada, resolvida no servidor como no rolê. Quem já pode ver o story vê o mesmo card e quem publicou. A música some com o story, em 24 horas. Sem conta conectada, não dá para colocar. Música de story que a pessoa não pode ver não aparece.

**O que não fazer:**

Não criar outra audiência nem outro prazo além das 24 horas do story. Não tocar a mídia. Não aceitar título, capa, link ou autor vindos do cliente. Não mostrar story de quem a pessoa não pode ver.

**Como validar:**

- Um story com faixa ou playlist mostra o card e o autor para quem já pode ver o story, e deixa de aparecer depois de 24 horas.
- Sem conta conectada, o story não ganha música.
- Id de outra conta responde `400` e o story não ganha item.
- A resposta do story não traz token.

**Arquivos prováveis:**

`apps/api/src/modules/stories/stories.service.ts`, `stories.routes.ts`, `stories.schema.ts`, `apps/web/src/features/stories/StoriesBar.tsx`, `StoryViewer.tsx`
