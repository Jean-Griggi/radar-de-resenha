> **Pronto.** Não reabrir passo a passo.

# Plano — Localização no MapLibre

Spec: docs/back/localizacao-pronto.md
Status: pronto

O mapa sai do Google Maps. No navegador, MapLibre GL desenha o estilo gratuito do OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`). Sem chave, sem cartão e sem cobrança por uso. A assinatura © OpenStreetMap fica visível no canto do mapa. Não se esconde e não se apaga.

O par `latitude` e `longitude` que o perfil já grava continua. Os dois vêm juntos ou os dois somem. Perfil privado reduzido não recebe o ponto. Coordenada fora de −90 a 90 ou −180 a 180 responde `400` e não grava o ponto anterior. Só a própria sessão altera o próprio ponto. A foto do marcador é o avatar que o perfil já mostra. O cliente não envia outra URL de imagem.

## Fatia 1 — Minimapa MapLibre

- [x] feito

2026-09-28 — Minimapa MapLibre sem chave, estilo OpenFreeMap, assinatura expandida. Teste do `mapPoint` passou. API: lat 91 e lng 181 respondem 400 sem mudar o par; outra sessão não altera; perfil privado reduzido não traz o ponto; limpar tira o par.

**O que fazer:**

Na edição do próprio perfil, a pessoa logada vê um minimapa MapLibre e escolhe o lugar com um clique. Salvar grava o par. Limpar tira o ponto. No perfil que a pessoa já pode ver, o mapa abre centrado no ponto salvo, com a foto de perfil no pino. Sem foto, o pino continua visível. O mapa abre sem chave.

**O que não fazer:**

Não carregar o script do Google Maps. Não ler `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` nem map id. Não esconder a assinatura do OpenStreetMap. Não gravar chave de mapa no banco nem devolvê-la no JSON. App mobile, app desktop, GPS contínuo e mapa do rolê ficam de fora.

**Como validar:**

- Sem chave de mapa, clicar, salvar, reabrir o perfil e ver o MapLibre no ponto escolhido, com a assinatura visível.
- Quem pode ver o perfil vê o mesmo ponto e a foto. Quem só vê o perfil privado reduzido não vê o ponto.
- Limpar tira o ponto do mapa e da resposta.
- Latitude 91 ou longitude 181 responde `400` e o par salvo não muda.
- Outra sessão não altera o ponto.

**Arquivos prováveis:**

`apps/web/src/features/users/mapPoint.ts`, `LocationMap.tsx`, `mapPoint.test.ts`, `apps/web/src/features/settings/SettingsScreen.tsx`, `apps/web/src/features/users/ProfileScreen.tsx`, `apps/web/package.json`

## Fatia 2 — Foto e nome do lugar

- [x] feito

2026-09-28 — Nome curto `placeName` viaja com o par. Salvar "casa" devolve o par e o nome; limpar apaga os dois. Estranho em perfil privado não recebe o nome. Outra sessão não grava o nome alheio. No mapa, o nome fica ao lado da foto.

**O que fazer:**

A pessoa dá um nome curto ao próprio ponto, por exemplo "casa". O nome viaja com o par: salvar o ponto grava o texto; limpar o ponto apaga o texto. No mapa, o pino é a foto de perfil e o nome aparece junto dela. Quem não recebe latitude e longitude também não recebe o nome.

**O que não fazer:**

Não criar uma lista fechada de tipos de lugar. Não mostrar o nome sem o ponto. Não deixar o texto escolher o id de outra conta. Não usar o nome como endereço pesquisável nesta fatia.

**Como validar:**

- Salvar um ponto com "casa" devolve o par e o nome para quem já pode ver o perfil.
- Limpar tira o par e o nome.
- Estranho em perfil privado não recebe o nome.
- Outra sessão não grava o nome de outra pessoa.

**Arquivos prováveis:**

`apps/api/src/db/migrate.ts`, `apps/api/src/modules/users/users.schema.ts`, `users.service.ts`, `users.map.ts`, `packages/shared/src/types.ts`, `apps/web/src/features/settings/SettingsScreen.tsx`, `apps/web/src/features/users/LocationMap.tsx`

## Fatia 3 — Várias pessoas no mesmo mapa

- [x] feito

2026-09-28 — `GET /users/map` lista só o ponto que o mesmo usuário já receberia no perfil. Privado de estranho e pedido pendente ficam de fora; a própria sessão, amigo aceito e quem segue entram, com o avatar e o nome do lugar. Sem GPS. Teste da API e do `mapPoint` passaram.

**O que fazer:**

Um mapa MapLibre mostra as pessoas que a sessão já pode ver, cada uma com a própria foto e o próprio nome do lugar. Ponto de perfil privado reduzido não entra. O mapa não acompanha movimento.

**O que não fazer:**

Não incluir quem a sessão não pode ver. Não fazer rastro, GPS contínuo nem mapa do rolê. Não repetir a foto de um avatar que o perfil não mostra.

**Como validar:**

- O mapa lista só pontos que o mesmo usuário já receberia no perfil de cada pessoa.
- Perfil privado de quem não é permitido não aparece no mapa.
- Cada pino usa a foto e o nome já gravados na fatia 2.

**Arquivos prováveis:**

`apps/api/src/modules/users/`, `apps/web/src/features/users/LocationMap.tsx`, `ProfileScreen.tsx`

## Fatia 4 — Prédios em 3D

- [x] feito

2026-09-28 — A câmera inclina até 60°. O volume `building-3d` sobe no zoom 15 com `render_height` do OpenFreeMap; sem altura o valor é 0 e a camada `building` continua chapada. Se o volume não carregar, o mapa plano permanece. A assinatura segue visível. Teste do `mapPoint` passou.

**O que fazer:**

No mesmo MapLibre, a câmera pode inclinar e os prédios sobem em volume com a altura que o OpenFreeMap já traz do OpenStreetMap (`fill-extrusion` na camada `building`, a partir do zoom 15). Onde o OpenStreetMap não tem altura, o prédio fica chapado. A assinatura continua visível.

**O que não fazer:**

Não prometer globo, relevo de morro nem vista do Google Earth. Não depender de outra chave para o 3D. Não esconder o mapa plano se o 3D não carregar.

**Como validar:**

- Com o mapa inclinado e zoom próximo, um centro que tem altura no OpenStreetMap mostra prédios em volume.
- Um lugar sem altura continua com o ponto, a foto e o nome.
- A assinatura © OpenStreetMap segue no canto.

**Arquivos prováveis:**

`apps/web/src/features/users/mapPoint.ts`, `LocationMap.tsx`
