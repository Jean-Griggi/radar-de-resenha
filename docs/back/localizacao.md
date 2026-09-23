# Localização no mapa

Status: aberto

## Problema

A cidade da pessoa é um texto. Não há mapa para escolher um ponto nem para ver esse ponto. Quem define a própria localização precisa de um minimapa para clicar o lugar, e quem já pode ver o perfil precisa ver esse mapa.

## Comportamento

- Pessoa logada, ao definir a própria localização, vê um minimapa do Google Maps e escolhe o lugar com um clique.
- O ponto escolhido fica salvo e o mapa do perfil abre centrado nele.
- Quem já pode ver o perfil vê esse mapa. Perfil privado não mostra o ponto para quem só recebe o perfil reduzido.
- Se o marcador do Google Maps aceitar imagem, o ponto usa a foto da pessoa. Se não aceitar, o mapa continua no ponto, sem foto.
- Sem chave do Google Maps configurada, o mapa não abre e a tela não finge que o ponto foi escolhido.
- A pessoa pode limpar a localização. Aí o mapa deixa de mostrar ponto.

## Contrato

- Localização da pessoa: `latitude` e `longitude`, ou ausência dos dois. Não há ponto pela metade.
- Atualização no perfil autenticado, no mesmo fluxo em que a pessoa já edita os próprios dados. Corpo aceita o par de coordenadas ou `null` para limpar.
- Coordenada fora do intervalo (latitude −90 a 90, longitude −180 a 180): `400`.
- `GET` do perfil que a pessoa já pode ver inclui o par quando existe. Perfil reduzido de estranho em conta privada não inclui latitude nem longitude.
- O mapa no navegador usa a chave configurada do Google Maps. A chave não vai para o banco nem para a resposta de perfil.

## Segurança

- Só a própria pessoa, com sessão, grava ou apaga as próprias coordenadas. O corpo não escolhe o id de outra conta.
- Perfil privado reduzido não inclui latitude, longitude nem a chave do mapa.
- A chave do mapa é de uso no navegador, restrita à origem da web. Não é segredo de servidor, não entra no repositório e não volta em JSON de perfil.
- A foto do marcador é o avatar que o perfil já mostra. O cliente não envia outra URL de imagem pelo mapa.
- Coordenada fora do intervalo não grava e não vaza o ponto anterior na mensagem de erro.

## Fora de escopo

- Mapa do local do rolê.
- Rastro em tempo real, GPS contínuo e mapa com várias pessoas.
- App mobile, app desktop, pagamento e push.
- Outro provedor de mapa.

## Critério de pronto

- Com a chave configurada, a pessoa clica no minimapa, salva, reabre o perfil e vê o mapa no ponto escolhido.
- Quem pode ver esse perfil vê o mesmo ponto. Quem só vê o perfil privado reduzido não recebe as coordenadas.
- Se o marcador aceitar imagem, a foto da pessoa aparece no ponto. Se não aceitar, o ponto continua visível.
- Limpar a localização tira o ponto do mapa e da resposta do perfil.
- Sem a chave, a tela não conclui a escolha de um ponto.
- Outra sessão não altera o ponto. A resposta de perfil não contém a chave do Google Maps.
- Latitude 91 ou longitude 181 responde `400` e o ponto salvo não muda.
