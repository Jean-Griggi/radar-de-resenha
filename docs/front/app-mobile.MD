# App mobile (Expo)

Status: aberto

## Problema

Quem usa o Redesinha pelo celular hoje precisa abrir o navegador e entrar toda vez. Ao criar um rolê, precisa marcar o local na mão, mesmo o celular já sabendo onde a pessoa está. Além disso, ninguém recebe aviso quando um rolê é criado ou confirmado, e a pessoa pode esquecer o compromisso. Um app fica na tela inicial, abre mais rápido e pode avisar a pessoa.
## Comportamento

- A pessoa entra com e-mail e senha e continua logada ao reabrir o app.
- A pessoa vê a lista de rolês e abre um para ver data, local e descrição.
- A pessoa pode vê os feed da comunidade.
- A pessoa pode personalizar o seu perfil.
- A pessoa pode criar rolê definindo data e hora, local e descrição.
- A pessoa pode comentar no rolê e receber respostas do comentario
- A pessoa pode confirmar a presença ou deixar na dúvida ou desconfirmar em um rolê (vou, Talvez, Não vou).
- A pessoa que crio o rolê recebe notificação de uma confirmação de alguem.
- O app envia notificação de criação de rolê quando o rolê é criado os amigos da pessoa que crio.
- O app envia lembretes 1 dia antes e 5 horas antes do rolê para pessoas que marcaram "Vou" no rolê.
- A pessoa  na escolha da localização do rolê se aceita, o mapa começara no ponto onde ela estiver e se a pessoa negar o compartilhamento da localização, ela pode escrever manualmente a localidade.
- A pessoa pode desligar notificações caso queira

## Segurança

- A identificação do aparelho (usada para enviar avisos) fica guardada só no servidor, ligada à conta da pessoa. Nenhuma outra pessoa vê essa identificação.
- Ao sair da conta, o servidor para de enviar avisos para aquele aparelho.
- A pessoa que desliga os avisos para de receber qualquer aviso. O servidor respeita isso, não só o app.
- O aviso na tela bloqueada não mostra o nome do rolê nem o texto de comentários. Ele diz só algo genérico, como "Você tem novidade no Redesinha". (decisão: a confirmar com a equipe)
- Aviso de rolê novo vai só para amigos aceitos de quem criou. Nunca para estranhos.
- Aviso de confirmação vai só para a pessoa que criou o rolê.
- Lembrete vai só para quem marcou "Vou". (decisão: quem marcou "Talvez" não recebe)
- O app pede permissão de localização só quando a pessoa vai escolher o local de um rolê. A posição do aparelho nunca é guardada no perfil, só entra no rolê se a pessoa confirmar.
- Se a pessoa negar a localização, o app continua funcionando e ela escreve o local à mão.
- A senha nunca fica salva no aparelho. A sessão fica guardada em área protegida do aparelho, não em armazenamento comum.
- Perfil privado continua privado no app: estranho não vê rolês, fotos nem localização, igual ao site.
- O e-mail de outras pessoas nunca aparece no app.
- Sessão que expirou leva a pessoa de volta para a tela de entrar, sem mostrar dados antigos.

## Fora de escopo

- App para computador (desktop).
- Chat, stories, fotos e áudios, resenhas, estatísticas e retrospectiva no app (continuam só no site por enquanto).
- Spotify e player de música no app.
- Mapa de pessoas e rota até o rolê.
- Pagamentos.
- Publicar nas lojas (Play Store e App Store). Esta spec cobre só construir o app, não publicar.
- Chat em tempo real.

## Critério de pronto
- A pessoa instala o app em um celular Android de teste, entra com e-mail e senha, fecha o app, abre de novo e continua logada.
- A lista de rolês mostra os mesmos rolês que o site mostra para a mesma conta.
- Abrir um rolê mostra data, local e descrição corretos.
- O feed mostra as mesmas publicações do site.
- Editar nome, bio, foto e capa no app aparece também no site.
- Criar um rolê no app faz ele aparecer no site, com data, hora, local e descrição.
- Com a localização permitida, o mapa abre no ponto onde a pessoa está. Com a localização negada, ela consegue escrever o local e criar o rolê.
- Marcar "Vou", "Talvez" e "Não vou" muda a contagem do rolê no site.
- Quando alguém confirma presença, a pessoa que criou o rolê recebe aviso no celular com o app fechado.
- Quando um rolê é criado, os amigos de quem criou recebem aviso, e um estranho não recebe.
- Quem marcou "Vou" recebe lembrete 1 dia antes e 5 horas antes. Quem marcou "Não vou" não recebe.
- Desligar os avisos faz o celular parar de receber, mesmo com o app fechado.
- Sair da conta faz o celular parar de receber avisos daquela conta.
- Nenhum aviso na tela bloqueada mostra e-mail, senha ou texto de comentário.
- Os testes da API continuam passando.