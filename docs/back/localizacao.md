# Localização no mapa

Status: aberto

## Problema

A cidade da pessoa é um texto. O mapa precisa ser gratuito, sem chave e sem fatura. Quem define a própria localização escolhe um ponto, dá um nome curto (por exemplo "casa") e quem já pode ver essa pessoa vê a foto dela nesse lugar. Várias pessoas cabem no mesmo mapa. O Google Maps sai.

## Comportamento

- No navegador, MapLibre GL desenha o estilo gratuito do OpenFreeMap (`https://tiles.openfreemap.org/styles/liberty`). Sem chave, sem cartão e sem cobrança por uso.
- A assinatura © OpenStreetMap fica visível no canto. Não se esconde e não se apaga.
- Pessoa logada, ao definir a própria localização, clica no minimapa, pode nomear o lugar e salva. Limpar tira o ponto e o nome.
- No perfil que a pessoa já pode ver, o mapa abre centrado no ponto, com a foto de perfil no pino e o nome do lugar junto. Sem foto, o pino continua visível.
- Um mapa mostra as pessoas que a sessão já pode ver, cada uma com a própria foto e o próprio nome. Perfil privado reduzido não entra.
- A câmera pode inclinar e os prédios sobem em volume onde o OpenStreetMap tem altura, a partir do zoom 15. Sem altura, o prédio fica chapado e o ponto continua.
- O mapa não acompanha movimento.

## Contrato

- Localização da pessoa: `latitude` e `longitude`, ou ausência dos dois. Não há ponto pela metade.
- Nome do lugar: texto curto escolhido pela pessoa, junto do par. Sem o par, não há nome. Limpar o ponto apaga o nome.
- Atualização no perfil autenticado, no mesmo fluxo em que a pessoa já edita os próprios dados. Corpo aceita o par, o nome, ou `null` para limpar.
- Coordenada fora do intervalo (latitude −90 a 90, longitude −180 a 180): `400`. A mensagem não devolve o ponto anterior.
- `GET` do perfil que a pessoa já pode ver inclui o par e o nome quando existem. Perfil reduzido de estranho em conta privada não inclui latitude, longitude nem o nome.
- O mapa de várias pessoas só inclui pontos que essa sessão já receberia no perfil de cada uma.
- O mapa no navegador não usa chave. Nenhuma chave de mapa vai para o banco nem para a resposta de perfil.

## Segurança

- Só a própria pessoa, com sessão, grava ou apaga as próprias coordenadas e o próprio nome. O corpo não escolhe o id de outra conta.
- Perfil privado reduzido não inclui latitude, longitude nem o nome do lugar.
- A foto do marcador é o avatar que o perfil já mostra. O cliente não envia outra URL de imagem pelo mapa.
- Coordenada fora do intervalo não grava e não vaza o ponto anterior na mensagem de erro.

## Fora de escopo

- Google Maps, chave de mapa e cobrança por uso.
- Esconder a assinatura do OpenStreetMap.
- Globo, relevo de morro e vista do Google Earth.
- Mapa do local do rolê.
- Rastro em tempo real e GPS contínuo.
- App mobile, app desktop, pagamento e push.
- Lista fechada de tipos de lugar e busca por endereço.

## Critério de pronto

- Sem chave, a pessoa clica no MapLibre, salva um ponto com um nome, reabre o perfil e vê a foto e o nome nesse ponto, com a assinatura visível.
- Quem pode ver esse perfil vê o mesmo ponto. Quem só vê o perfil privado reduzido não recebe coordenadas nem nome.
- O mapa de várias pessoas só mostra quem essa sessão já pode ver.
- Com o mapa inclinado e zoom próximo, um lugar com altura no OpenStreetMap mostra prédios em volume. Sem altura, o ponto, a foto e o nome continuam.
- Limpar tira o ponto e o nome do mapa e da resposta.
- Outra sessão não altera o ponto. A resposta de perfil não contém chave de mapa.
- Latitude 91 ou longitude 181 responde `400` e o ponto salvo não muda.
