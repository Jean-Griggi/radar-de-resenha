# Kina — Roteiro de teste manual

Suba com `pnpm dev` na raiz. O web fica em `http://localhost:3000`.
Em cada item, olhe **tema claro e escuro** quando o passo não disser o contrário. Larguras: **360 px** (celular) e **1280 px** (desktop).

1. **`/login` — repouso.** Só o botão sódio “Entrar” no cruzamento dos fios, com a frase “Te vejo na Kina.”. Sem scroll horizontal. O foco começa no botão. O botão de tema tem 44×44.
2. **`/login` — magnetismo (desktop, mouse).** Com o cursor a menos de 160 px, o botão anda no máximo 8 px e os fios arqueiam. Ao sair, volta ao centro. No celular (toque) o botão não segue o dedo.
3. **`/login` — painel.** Clique, Enter ou Espaço abre o painel (`role="dialog"`) com “Chegou na Kina.”, rótulos E-mail e Senha, e o foco vai para o e-mail. No celular o painel é a folha de baixo, colada na base, com respiro da safe-area.
4. **`/login` — senha errada.** Com uma conta existente e senha inválida, o campo Senha mostra ícone e o texto “Senha incorreta. Tente de novo.”, borda vermelha, e o foco volta para a senha. O botão deixa de seguir o cursor enquanto o erro está na tela.
5. **`/login` — Cancelar e Esc.** Cada um fecha o painel, devolve o foco ao botão “Entrar” e limpa a senha. O título de repouso volta.
6. **`/login` — movimento e transparência reduzidos.** No sistema, “reduzir movimento”: o painel aparece em fade, sem crescer do botão e sem magnetismo. “Reduzir transparência”: painel e fundo sem desfoque, superfície opaca.
7. **`/cadastro`, `/esqueci-senha`, `/redefinir-senha`.** Mesma grade do login, mas o painel já está aberto e **opaco** (sem vidro). Criar conta, pedir o link e salvar a senha seguem como antes.
8. **`/` — feed (desktop e celular).** Rolês futuros em cima, stories no meio, o resto abaixo. Post de texto sem faixa e sem imagem. Vazio: “Ninguém marcou nada ainda.” Nome longo quebra em até duas linhas, sem estourar a largura.
9. **`/` — stories.** Abrir um story: tela cheia, barra que avança só em escala (não em largura). Pausar, fechar e trocar de story funcionam. Com “reduzir movimento”, a barra não varre. Ícones são traço (lucide), não caractere solto.
10. **`/roles` e um rolê aberto (`/roles/<id>`).** Lista filtra como antes. No detalhe: nome em serifa (até duas linhas), ficha, Bora / Talvez / Não vou. Rolê passado mostra cantoneiras; futuro, não. Presença, editar e excluir não mudam de rota.
11. **`/mapa`.** Tiles do OpenStreetMap iguais aos de antes. Marcador de rolê quadrado na cor da marca; “você” é um ponto anil com anel (sem sombra). Controles do mapa têm 44 px. No celular, tocar um ponto abre a folha; no desktop, o painel.
12. **`/music`.** Desconectado: texto e “Conectar Spotify”. Conectado: listas com número, capa quadrada de 40 px, título e duração. O botão verde de tocar tem 44 px e a cor oficial do Spotify. A capa não leva filtro.
13. **`/explore` — busca.** Campo com rótulo. Resultados na ordem Pessoas, Rolês, Lugares, Resenhas, Música, Tags. Em 360 px a página não ganha scroll horizontal.
14. **`/settings` — tema.** A ficha oferece Sistema, Claro e Escuro. Sistema apaga a escolha salva e acompanha o aparelho. Claro e Escuro gravam e pintam a tela na hora. O botão do cabeçalho continua só alternando claro e escuro.
15. **`/uma-rota-que-nao-existe` — 404.** Título “Essa rua não existe.” e o botão “Voltar para o início”, que leva a `/`.
16. **Cabeçalho e barra (qualquer tela logada).** Desktop: Feed, Explorar, Rolês com sublinhado na ativa, ponto “Criar”, busca, tema, sino e menu da conta. Celular: cinco itens, rótulos visíveis, ponto sódio no ativo, “Criar” no centro, safe-area na base. Nada corta em 360, 390, 768, 1024 ou 1280 px.
17. **Teclado.** Do login ao feed: Tab mostra anel `--k-focus` de 2 px. Esc fecha menu, modal e o painel de login. O foco volta ao botão que abriu.
18. **`/kina-vitrine` (só em dev).** Percorrer botão, campo, avatar, tag, card, abas, ficha, faixa, esqueleto, vazio, toast, modal, sheet e menu. “Alternar tema” troca claro/escuro. Em produção a rota não mostra a vitrine.
19. **Abas do perfil (`/perfil/<username>`).** As sete abas rolam na horizontal no celular e a aba ativa permanece visível. Nome longo quebra em duas linhas.
20. **Player de música.** Com uma faixa tocando, o player no canto não passa da largura da tela (360 px) e fica acima da barra inferior, respeitando a safe-area. Recolher e fechar têm nome acessível.
