# Kina — Relatório dos extras (D20 e D21)

> Branch `redesign/kina`. Parte 1: etapas A a D. Cada etapa passou em `pnpm lint && pnpm typecheck && pnpm --filter @resenhometro/web build`.
> **Nada foi visto num navegador.** O `web` não tem teste de tela e este ambiente não abre o navegador. A conferência foi de código, tipos e build; o olho humano fica para a Parte 2 / `TESTE-FINAL.md`.

---

## Etapa A — Mesa do feed (D20)

**O que existia.** O feed era uma lista vertical (`FeedScreen`): rolês `upcoming` no topo, stories, faixa "Próximos", compositor, e depois um `Post` (variante sem rolê) ou um `article.card.feed-memory` por item. **Não havia rota nem modal de post:** o item já vinha inteiro, aberto, na lista (curtir, comentar, Bora e Salvar eram feitos ali). Não havia paginação (a API devolve tudo em `GET /feed`) nem resquício do seletor Lista|Mesa.

**O que mudou.**
- `components/Mesa.tsx` (novo, reaproveitado nas etapas C e D): `Mesa`, `MesaSkeleton`, `MesaViewer`, `useMesaViewer` e `mesaName`. Grade CSS de 12 colunas (4 no celular), `grid-auto-flow: dense`, padrão de spans e proporções repetido a cada 8 itens (`índice % 8`) exatamente como pedido. Sem JS de layout.
- Tile = só a imagem (`object-fit: cover`, cor natural, raio 0, sem sombra/gradiente/blur), `.k-corners`, faixa sólida `--k-bg` na base com avatar redondo (24 px) e data em `.k-meta`. Tile é um `<button>` real, `aria-label="Post de {nome}, em {rolê}"` (sem o "em …" quando não há rolê).
- Item sem imagem vira tile de texto (`--k-bg-sunken`, Fraunces 20 px). **Como os posts de hoje não têm foto (D3/D4), quase todo post é tile de texto.** Tile com foto: item `photo_added` ou rolê com capa.
- Como "abre": o mecanismo que existia era "tudo aberto na lista", então o item abre num painel por cima da página (`MesaViewer`, tela cheia em `--k-bg`), **sem trocar de rota**. O painel mostra o mesmo conteúdo da lista antiga (`Post` ou o card de memória, com reações, comentários, Bora e Salvar) e, quando o tile tem foto, a foto grande no topo. `Esc` e "Voltar" fecham; o resto da página fica `inert` (foco preso) e a rolagem fica travada por baixo, então a posição da Mesa é preservada. O foco volta ao tile de origem. Entrar no painel adiciona uma entrada no histórico (`pushState` com a mesma URL) para o "voltar" do navegador fechar o painel.
- Carregando: `MesaSkeleton` (contornos de 1 px e um ponto, na mesma grade).
- `FeedScreen`: o corpo do item virou o componente `FeedEntry` (mesmo JSX, mesmas chamadas de API). O resto do feed ficou como estava.

**Preservado:** stories, faixa "Próximos", compositor, cabeçalho, barra inferior e "Criar". Os rolês `upcoming` no topo (cartão com dia grande e Bora) continuam fora da Mesa: são "presente/futuro" (sem moldura, D3) e não têm o papel de foto.

**Limitações / decisões conservadoras.**
- A capa do Spotify de um post com música **não** vira foto de tile (capa de álbum não se recorta).
- Foto do tile no hover: as cantoneiras fecham 4 px **sem animar** (regra da Fase 5: só `transform` e `opacity`; `inset` não anima). O efeito existe, instantâneo.
- Sem "Ver mais"/scroll infinito: a API não pagina, então a Mesa mostra tudo o que o feed devolve.
- Ao abrir um item por link interno do painel (perfil, rolê), a rota troca e sobra uma entrada de histórico extra do painel: o primeiro "voltar" volta ao feed fechado.

**Ficou de fora:** nada desta etapa.

---

## Etapa B — transição tile ⇄ post (D20)

**O que existia.** Nada de transição. O item abria no painel da Etapa A, sem animação.

**O que mudou.**
- `lib/viewTransition.ts`: `withViewTransition(update)` (e `canViewTransition()`), sem dependência. Sem `startViewTransition` ou com `prefers-reduced-motion: reduce`, roda o `update` direto.
- `useMesaViewer` (em `components/Mesa.tsx`): abrir e fechar rodam dentro da View Transition. O `update` usa `flushSync`, então o painel já está no DOM quando a API tira a foto do estado novo. Como **não há rota** para esperar (o item abre num painel), não precisei do resolver "por `usePathname`" do plano.
- Nome único `mesa-{id}` (mais `view-transition-class: k-mesa`): o tile clicado recebe o nome por código, **no clique**, e o perde dentro do `update`, antes de o painel montar; só a foto grande do painel (ou o bloco do post, para tile de texto) o tem enquanto aberto. Ao fechar, o painel some e o tile volta a ter o nome; depois da animação o nome é removido. Nunca há dois elementos com o mesmo nome.
- Voltar (botão "Voltar", `Esc`, voltar do navegador): animação inversa até o tile; o foco volta ao tile de origem e a rolagem da Mesa não muda (o painel é uma camada, a página não navega).
- CSS: `::view-transition-group(*)` com `--k-dur-scene` e `--k-ease-arrive`; `old/new(*)` sem sombra e sem blur; para `*.k-mesa`, `object-fit: cover` (a foto do tile e a do painel têm proporções diferentes; sem isso a imagem esticaria).
- Sem suporte ou com movimento reduzido: o painel entra em fade (`--k-dur-base`, que já vale 160 ms com movimento reduzido, pelo token).

**Limitações.**
- **Não vi a animação rodar.** Quem precisa conferir: abrir e fechar um tile de foto e um de texto no Chrome/Edge (Firefox e Safari antigos caem no fade).
- Em tile de **texto** (a maioria hoje, pois post não tem foto), o que viaja é o instantâneo do tile até o bloco do post, com o mesmo `cover`; funciona como "zoom", mas não é a mesma imagem nos dois lados.
- Ao fechar, sem View Transition o painel some na hora (só a entrada tem fade).
- `view-transition-class` só existe em Chromium recente; onde falta, a transição ainda roda, mas sem o `cover` (a imagem pode esticar durante a animação).

---

## Etapa C — Mesa em perfil, fotos e álbuns (D20)

**O que existia.** `PhotosScreen` (`/photos`): álbuns como cartões (capa, nome, contagem, "Excluir") e galeria como grade 2×3 com um `×` para excluir. Perfil: aba **Fotos** com miniaturas e cantoneiras, sem abrir nada. **Não existe aba de publicações no perfil**, nem rota de álbum ou de foto.

**O que mudou** (reaproveitando o `Mesa`, `MesaViewer` e `useMesaViewer` da Etapa A, sem duplicar):
- `/photos`: álbuns e galeria viram Mesa. Álbum sem capa usa a primeira foto; sem nenhuma, vira tile de texto com o nome. Tocar abre o painel com a mesma transição da Etapa B.
- Aba **Fotos** do perfil: Mesa; tocar abre o painel.
- "Excluir" (álbum, com o mesmo `confirm`) e `×` (foto) continuam, com as mesmas chamadas de API, num botão irmão de 44 px no canto do tile (`.k-mesa__action`), porque não pode haver botão dentro do botão do tile.
- `features/media/PhotoViewer.tsx` (novo): conteúdo do painel. Nesta etapa mostra uma foto grande e a legenda; a Etapa D troca isso pelo carrossel.

**Limitações / o que ficou de fora.**
- **Publicações do perfil:** não há aba nem lista de posts no perfil, então não há o que converter. Não criei (G3).
- **Aba Rolês do perfil:** continua como estava. Tile de rolê é navegação para a rota `/roles/{id}`, e a transição de tile para rota não foi pedida (e exigiria mexer em rota).
- Tiles de foto sem autor na resposta (perfil só devolve `id` e `url`) mostram o avatar do dono do perfil e nenhuma data.

---

## Etapa D — visualizador de álbum em carrossel (D21)

**O que existia.** Nenhuma tela de álbum nem visualizador: álbum era um cartão sem ação e a foto, uma miniatura. Dados de cada foto no cliente: `url`, `caption`, `createdAt`, `author` (opcional), `albumId`, `roleId`. **Não há título do rolê na foto** (só `roleId`), então a linha "rolê de origem" não aparece (o componente aceita `roleTitle`, mas nada o preenche; não busquei dado novo).

**O que mudou.**
- `components/PhotoCarousel.tsx` (novo) e `features/media/PhotoViewer.tsx` (agora só o adaptador que escolhe a foto inicial e dá o nome da transição). O carrossel abre dentro do painel da Mesa, nos três lugares: álbum e galeria em `/photos` e aba Fotos do perfil.
- Desktop (≥ 768 px): foto em 10/12 (colunas 3 a 12), 60 vh, `.k-corners` de 16 px; título do álbum em Fraunces 39 px numa caixa `--k-bg` que ocupa as colunas 1 a 4 (metade fora, metade sobre a foto), centrada na vertical para não cobrir as cantoneiras; legenda (só se existir) e `.k-meta` com autor, data e rolê abaixo; dois botões 56×56 colados, raio 0, borda `--k-line-strong`, no canto inferior direito, com contador `03 / 12` (numerais tabulares, `aria-live="polite"`). Celular: título acima, foto em largura total (4/5), controles embaixo.
- Todas as fotos no DOM, só a atual visível (`visibility`/`opacity`, nunca `display: none`), circular. Revelação: painel `--k-bg` em `scaleX` (`transform-origin: right`, `--k-dur-scene`); legenda e meta entram com `opacity` + `translateX(16px)`, `--k-dur-base`, com atraso de `--k-dur-quick`.
- Teclado: setas, `Home`, `End`; `Esc` fecha o painel (volta ao índice, foco no tile). Toque: arrastar na horizontal, limite de 40 px; mouse não arrasta. Pré-carga: a próxima e a anterior `eager`, as demais `lazy`; proporção reservada pelo palco (sem layout shift).
- A11y: `aria-roledescription="carrossel"` e `aria-label` com o nome do álbum; cada foto `role="group"` `aria-label="3 de 12"`; alt = legenda, ou "Foto de {autor}"; fora de vista com `aria-hidden` e `inert`.
- Estados: álbum vazio ("Nenhuma foto por aqui."), carregando (contorno de 1 px pulsando por foto até o `load`) e foto que falhou (ícone + "Não foi possível carregar a foto."). Movimento reduzido: sem painel e sem deslocamento, só fade.

**Decisão de implementação:** o painel de revelação só passa a existir **depois da primeira troca**. Na abertura a foto aparece inteira; senão a View Transition da Etapa B fotografaria o painel cobrindo a foto.

**Limitações.**
- Não vi o carrossel num navegador: o título sobreposto, a revelação e o toque precisam do roteiro (dois temas, 360 e 1280 px, nomes longos).
- O título tem `overflow: hidden` com altura máxima (palco − 96 px) para nunca cobrir uma cantoneira; um nome enorme (mais de ~4 linhas em 39 px) seria cortado.
- Em `/photos` o carrossel da **galeria** reúne todas as fotos do usuário (não só as de um álbum), na ordem da lista.
- Sem "arrastar com mouse", por decisão sua.

---

## Fechamento da Parte 1

- Portão final (`pnpm lint && pnpm typecheck && pnpm --filter @resenhometro/web build`): passou em todas as quatro etapas, na primeira tentativa. Nenhuma etapa foi desfeita.
- **Nada foi visto em navegador.** Pendentes de olho humano: transição tile ⇄ painel (foto e texto), caimento em fade sem View Transition, carrossel (swipe, teclado, revelação), nomes longos, 360/390/768/1024/1280 px, claro e escuro, safe-area.
- Itens que dependem de decisão futura: paginação do feed (a API não pagina); aba de publicações no perfil (não existe); título do rolê na foto (a API só dá `roleId`); entrada extra no histórico quando um link interno do painel troca de rota.
- Arquivo `apps/api/tmp-open-pglite.mjs` (script solto, não é meu) ficou sem commit.

---

# Parte 2: etapas E a H

## Etapa E — perfil com capa que vira barra (D22)

**O que existia.** `ProfileScreen` já tinha capa de 40vh (70vh no desktop), bloco de identidade com cantoneiras sobrepondo a capa, avatar saindo do bloco e abas. O parallax era JS (`scroll` + `requestAnimationFrame`) e deslocava a mídia para baixo deixando uma fresta no topo. Campos reais: capa, avatar, nome, `@username`, cidade, bio, cinco contagens (rolês, resenhas, amigos, seguidores, seguindo), ações (editar perfil; mensagem, amizade e seguir quando é outra pessoa) e sete abas. **Não há trilha no perfil nem aba "Publicações"** (ver Etapa C). Não há menu "...".

**O que mudou.**
- `.k-profile` (wrapper) com: barra fina sticky de 56 px (`aria-hidden`, fio + nome em Fraunces 20 px), capa `clamp(280px, 40vh, 420px)`, bloco de identidade (nome 34 px no celular, 52 px a partir de 768 px, até duas linhas), avatar (80 px / 96 px) e abas sticky sob a barra.
- Animação **só em CSS**, dentro de `@supports (animation-timeline: scroll())` e `prefers-reduced-motion: no-preference`: capa sobe a 60% da velocidade (`translateY` a 0,4 × a faixa), camada sólida `--k-stage-bg` de 0 a 0,6 de opacidade, avatar com `translate + scale` até a posição da barra, e nome, fundo e fio da barra com `opacity` no último 40% da faixa. A faixa (`--k-profile-range: 240px`) está declarada uma vez no `:root`. O JS de parallax foi removido.
- Sem suporte ou com movimento reduzido: barra fina fixa já visível (só fio e nome), avatar grande estático por cima do bloco.
- Avatar é um elemento irmão do bloco (não filho) para ficar **acima** da barra enquanto o bloco passa **por baixo** dela.
- Carregando: esqueleto de contorno e fios na altura da capa. Erro: `CircleAlert` + texto.
- "Voltar" sobre a capa (44 px, fundo sólido): usa `router.back()` e cai para `/` sem histórico. **Menu "..." não criado**: não há ação para pôr nele (G3).

**Limitações / decisões conservadoras.**
- A barra encosta embaixo do cabeçalho do app (que é sticky) usando `--k-profile-header` (62 px celular, 70 px ≥ 640 px), valor estimado da altura do cabeçalho. Se o cabeçalho mudar de altura, ajustar essa variável.
- O destino do avatar na barra é calculado por variáveis CSS (capa, sobreposição, faixa), sem JS. Se alguém mudar a altura da capa ou a sobreposição do bloco, atualizar `--k-profile-cover` / `--k-profile-overlap`.
- O cartão "Localização" continua entre o bloco e as abas (já existia); a ordem do DOM pedida (capa, nome, ações, abas, conteúdo) vale com essa exceção.
- Nada visto no navegador.

## Etapa F — ficha de faixa (D23)

**O que existia.** A música toca por **embed (iframe) do Spotify** (`open.spotify.com/embed/...`) dentro do `MiniPlayer` (`components/Player.tsx`), montado no layout raiz. Não há Web Playback SDK, `preview_url` próprio nem estado de reprodução no app: **não existe posição, duração, play/pause, anterior, próxima, shuffle nem "adicionar ao rolê"**. O embed não é personalizável. O `TrackRow` (encarte) continua como está.

**Decisão: só a ficha de faixa.** Como não há progresso real, **a barra ondulada e os controles (SkipBack, Play/Pause, SkipForward) não foram feitos**: criar um player novo está fora do escopo e o embed não expõe o tempo. Ficou de fora também o `role="slider"`, pointer events e teclado da barra.

**O que mudou** (`MiniPlayer`, painel aberto):
- Ficha: capa quadrada nítida (96 px no celular, 112 px a partir de 1024 px, `object-fit: contain`, sem recorte, filtro ou raio), cantoneiras de 8 px **por fora**, num wrapper com folga de 6 px que não toca a capa. Sem capa: quadrado `--k-bg-sunken` com ícone de música.
- Título em Fraunces 20 px (quebra, sem reticências), artista em Schibsted 14 px, e "Ouvir no Spotify" (link sublinhado de 44 px de alto, com um quadrado `--k-spotify` de 8 px como marca; o texto fica em `--k-text` para manter o contraste). Não imita o player verde e não usa o logo do Spotify (o repositório não tem o asset).
- Carregando: o `Spinner` da Kina (ponto percorrendo o L, só aparece após 300 ms, rótulo "Carregando") fica sobre a área do embed até o `onLoad` do iframe.
- Celular: painel em largura total, acima da barra inferior, com safe-area; desktop: painel de 24 rem no canto. "Recolher" e "Fechar" mantidos.
- Mantidos como estavam: iframe sempre montado, letra (LRCLIB), rotas e estado do `PlayerProvider`. Escopos do Spotify não mudaram.

**Limitações.** Atribuição conforme as diretrizes de marca do Spotify **não foi conferida online** (sem acesso a rede nesta tarefa): conferir se o link com o quadrado verde atende ao guia vigente. O botão "Recolher" ainda não é uma folha arrastável. Nada visto no navegador.

## Etapa G — chat em acordeão (D24)

**O que existia.** `ChatListScreen` (`/chat`): busca de pessoa, lista de conversas em cartão (`<Link>` por linha, 1 conversa por pessoa) e atalhos "Começar uma conversa". A resposta de `GET /chat/conversations` traz, por conversa, **`user`, `last` (só a última mensagem) e `unread`**. **Não há grupo** (só 1 a 1) e **não há mais de uma mensagem na lista**. A conversa (`ConversationScreen`, `/chat/{username}`) faz polling de 4 s (não há WebSocket; a API é serverless). Nada disso foi alterado.

**O que mudou.**
- Lista: `<details name="chat-lista" class="k-chat-row">` por conversa, sem JS. `<summary>` sempre visível, mín. 64 px, avatar 40 px redondo, nome em Fraunces 20 px, última mensagem (uma linha, reticências, só no texto da mensagem), hora em `.k-meta` (hoje `18:30`, `ONTEM`, `SEG`, `12 OUT`; função nova `formatChatTime` em `lib/format.ts`) e `Plus` à direita. Fio de 1 px entre linhas, raio 0, sem sombra.
- Não lida: quadrado sódio de 8 px antes do nome, contagem em `.k-meta`, nome em peso 600. Nome acessível do summary: "Conversa com {nome}, {n} não lidas, última mensagem {hora}".
- Aberto: remetente em `.k-meta`, **a última mensagem** (única disponível, sem requisição nova) em 16 px e **uma** ação sódio "Abrir conversa" (link para `/chat/{username}`, 44 px). O `Plus` gira 45° (`transform`, `--k-dur-quick`, `--k-ease-arrive`); o corpo entra só com `opacity`; sem animar altura. Movimento reduzido: sem rotação.
- Nenhuma linha vem aberta: a lista fica em `/chat`, que não é a rota de nenhuma conversa.
- Estados: vazio "Ninguém chegou ainda." (com a mesma explicação e os atalhos de começar conversa que já existiam), carregando com fios e pontos, erro com `CircleAlert` + texto. O emoji de câmera virou ícone `Camera` (lucide) + "Foto".
- Tela da conversa, mesmo layout: mensagens com raio 0; recebidas em `--k-bg-sunken`, enviadas com borda de 1 px `--k-line-strong` (antes: fundo sódio); remetente identificado por **alinhamento e rótulo "Você"/nome** em `.k-meta`, hora em `.k-meta`; `aria-live="polite"` mantido; seta de voltar virou `ArrowLeft`; erro com ícone. Sem `rounded-*`, sombra, gradiente ou hex nessa tela. Campo e botão de envio já eram `Input`/`Button` da Kina.

**Limitações.**
- A prévia aberta mostra **1 mensagem**, não 3: a lista só recebe a última. Mostrar mais exigiria uma requisição por conversa, proibida nesta etapa.
- Sem suporte a `<details name>` (Firefox antigo, Safari < 17.2), cada linha abre e fecha de forma independente.
- `ChatPreview` (atalho do feed e da agenda) não foi redesenhado; só entra na varredura da Etapa H.
- Nada visto no navegador.

## Etapa H — re-varredura e documentação

**O que foi feito.** Varredura de todo o código tocado nas etapas A a G (e conferência do restante) por hex, `rounded-*`, sombras, gradientes, `backdrop-filter`/`filter`, `text-[10px]/[11px]`, Fraunces < 20 px, ícones fora do `lucide-react`, `keyCode`, `console.log`, unpkg/Open Props, `localStorage` novo, durações e easings soltos. Achados e correções: tabela em `FASE5-RELATORIO.md` (seção "Pós-Fase 5: etapas A a H"). Em resumo: Fraunces de 12 px no carrossel, `★`/`🎙️`/`📷`/`←`/`→` trocados por ícones lucide (novo `components/Stars.tsx`). A vitrine ganhou as seções novas. `TESTE-FINAL.md` ganhou os itens 21 a 24 (total de 24).

**Limitações por navegador.**
- View Transitions (Mesa): sem `startViewTransition` ou com movimento reduzido, entra em fade de `--k-dur-base`. Sem `view-transition-class`, a imagem pode esticar durante a animação.
- `animation-timeline: scroll()` (perfil): sem suporte ou com movimento reduzido, o perfil fica estático com a barra fina só com fio e nome (suporte varia por navegador; não verifiquei a tabela atual, conferir em caniuse).
- `<details name>` (chat): sem suporte, cada linha abre e fecha de forma independente.
- `:has()` e `color-mix()` já eram usados antes.

**Pendências.**
- Nada foi visto em navegador nas Partes 1 e 2. Roteiro: `TESTE-FINAL.md` (itens 21 a 24 são os novos).
- Barra ondulada (D23): só se um dia houver player com progresso real (Web Playback SDK ou `<audio>` próprio). Hoje é embed do Spotify.
- Atribuição ao Spotify: conferir contra o guia de marca vigente.
- `--k-profile-header` (62/70 px) é a altura estimada do cabeçalho do app: validar em 360, 768 e 1280 px.
- Prévia do chat com até 3 mensagens: exigiria dado novo na lista (hoje só a última).
- Menu "..." no perfil, aba de publicações no perfil e título do rolê na foto: não existem nos dados.
- `apps/api/tmp-open-pglite.mjs` continua solto e sem commit (não é meu).

**Telas que ficaram de fora.** `ChatPreview` (atalho no feed e na agenda) segue no estilo anterior, só com o emoji trocado por ícone; `text-xs` restante em telas fora do PDF (G4); aba Rolês do perfil e rotas de rolê sem transição de tile.

---

# Parte 3: etapas I a O (correções do teste, navegação D25, layout D26, formulário de rolê)

> Branch `redesign/kina`. Cada etapa passou em `pnpm lint && pnpm typecheck && pnpm --filter @resenhometro/web build` (na primeira tentativa; nenhuma foi desfeita). **Nada foi visto num navegador**: este ambiente só roda lint, tipos e build. Quem precisa conferir com os olhos: `TESTE-FINAL.md` (itens 8, 10, 16, 19, 24 reescritos e 25 a 30 novos).
> Antes de começar: branch `redesign/kina` confirmada; árvore limpa, exceto `apps/api/tmp-open-pglite.mjs` (script solto de antes, não é desta parte) que **não** entrou em nenhum commit.
> Não li o PDF do plano (sem leitor de PDF neste ambiente); segui `DECISOES.md`, `components-spec.md`, as Partes 1 e 2 e o texto do pedido.

## Etapa I — detalhe de post, stories e rolagem

**Achado de contexto.** Não existe rota de "detalhe de post": o detalhe é o painel da Mesa (`MesaViewer` + `FeedEntry`). Os itens de "detalhe" foram aplicados ali.

- **Foto.** Cantoneiras só em volta da foto (invólucro `.k-corners` com a proporção 4:3 reservada, `max-height: min(70dvh, 720px)`, `object-fit: contain` sobre `--k-bg-sunken`). O nome da View Transition passou do invólucro para a própria `<img>` (`MediaImage` ganhou a prop `style`). O bloco de texto (`Post` com `bare`, e o card de memória sem `.card`) fica sem moldura e sem fundo.
- **Texto.** Detalhe mostra o texto completo: `Caption`, `line-clamp` do detalhe e o `mask-image` por gradiente foram removidos (era a única máscara do app).
- **Reações.** Novo `.k-reactions`: alinhadas à esquerda (margem de −12 px para o emoji cair no recuo do nome). Já eram 44x44, com `aria-pressed` e fio de 2 px; o `aria-label` agora é "Reagir com coração/risada/choro/fogo/olhos" (antes era o emoji).
- **"Seu story".** Item inteiro é um botão (avatar de 58 px + rótulo, 8 px de respiro), "+" virou selo de 20x20 (raio 2 px) no canto do avatar, sem cobrir iniciais. Sem story: fio de 1 px `--k-line-strong`. Quando a pessoa já tem story, o "+" é um botão à parte (a área de 44 px vem de um pseudo-elemento), porque o item inteiro passa a abrir o visualizador.
- **Rolagem.** Causa: `html, body { overflow-x: hidden }` — com os dois, o `overflow-y` do body vira `auto` e ele vira um segundo contêiner de rolagem. Agora só `html` corta (`overflow-x: hidden`) e o `body` usa `overflow-x: clip` (não cria contêiner, não quebra o sticky).
- **Botões.** Comentário: sódio só com texto (no detalhe), vazio = secundário e desabilitado com "Escreva um comentário." (`aria-describedby`). No feed o "Enviar" é sempre secundário (prop `accent` em `Comments`/`FeedComments`). Composer: "Compartilhar" sempre secundário, com "Escreva algo para compartilhar." quando vazio. A validação não mudou (o submit já ignorava vazio): só estilo.
- **Pulado/anotado.** O token `--k-ink` pedido para o selo "+" **não existe**: usei `--k-text` (é a tinta).

## Etapa J — perfil e "Fotos e áudios"

**Perfil.**
- Nome sem `line-clamp`/reticências, `clamp(28px, 4vw, 52px)`, `overflow-wrap: anywhere`. Ações saíram do lado do nome: ordem nome, @ e cidade, bio, ações, contadores. "Seguir" (sódio) primeiro, depois as secundárias, todas com 44 px e `flex-wrap` com 8 px; no celular a principal ocupa a linha. Quando já se segue, o botão vira "Seguindo" secundário (com `aria-pressed`), para não haver duas ações sódio. "Editar perfil" (próprio perfil) passou a secundário.
- Contadores: sem caixa e sem fundo, ficha com fio de 1 px acima, valor em Plex Mono 20 px, rótulo `.k-meta`, fios verticais (3 colunas em 360 px, flex com quebra a partir de 640 px). O `.profile-stat` antigo (fundo preenchido) foi removido do `globals.css`.
- Abas: o `.k-tabs` rolava na horizontal mas aparecia barra vertical (`overflow-y` virava `auto`). Agora `overflow-y: hidden`, 4 px de respiro, `scroll-snap-type: x proximity`, sem gradiente. O fio do contêiner passou para um invólucro (`.k-tabs-wrap`) para o respiro não afastar o sublinhado do fio; foco da aba com `outline-offset: -2px` (para o `overflow` não cortar). `role=tablist/tab`, `aria-selected` e setas já existiam.
- Avatar: recuo interno do bloco de identidade passou de 1,25 rem para 2 rem (`--k-profile-pad`), então o avatar fica a 32 px da cantoneira superior esquerda (pedido: ≥ 24 px).
- Animação da Etapa E: conferida por leitura do CSS (`@supports (animation-timeline: scroll())` + `no-preference`, estática sem suporte). Sem defeito encontrado; só ajustei as variáveis que dependem do recuo e da sangria.

**Fotos e áudios.**
- Cada `<input type="file">` real, com `<label for>`, sem `display: none`; `::file-selector-button` no visual da Kina (44 px, borda 1 px, raio 2 px, Schibsted 600); o nome do arquivo escolhido herda o estilo mono. Painel sem fundo: grupos separados por fio de 1 px e 24 px, mesma ordem e grade de 2 colunas. "Gravar história" alinhado ao campo de áudio; "Criar álbum" ao lado do campo "Nome do álbum" (`flex 1`, até 320 px). Ajuda "JPEG, PNG…" em 14 px ligada ao campo por `aria-describedby`.
- Títulos "Álbuns/Galeria/Áudios" em Fraunces 25 px; vazios unificados (`EmptyState line`: sem fundo, à esquerda, Fraunces 20 px, fio acima), mesmos textos.
- **Item 13:** "Criar álbum" **não** desabilita com o campo vazio (usa o `required` nativo): não mudei a lógica, então não há texto de motivo. **Item 14:** a Etapa C está ativa (álbuns e fotos aparecem em Mesa e abrem no carrossel); nada a aplicar.
- Sugestão (não feita): trocar o campo "uuid do rolê" por um seletor de rolê é funcionalidade nova.

## Etapa K — feed "Hoje na Kina"

Onde está cada coisa: página do feed `features/social/FeedScreen.tsx`; card de rolê (agora `InviteCard`, no mesmo arquivo); `StoriesBar`; composer (no `FeedScreen`); Mesa (`components/Mesa.tsx`); coluna direita `DefaultRail` em `components/AppShell.tsx`.

- Título `h1` "Hoje na Kina" (Fraunces 39 px) com a data de hoje em `.k-meta`, calculada só no cliente depois de montar (sem diferença entre servidor e navegador). Ordem: título, stories, convites, composer, Mesa, separados por 48 + 48 px com fio de 1 px (`.feed > * + *`). Os atalhos "Próximos" (celular) e "Mensagens" (celular) continuam entre os convites e o composer, onde já estavam; não criei rótulos de seção.
- `InviteCard`: linha do autor com avatar de 24 px, data à esquerda (dia em Plex Mono 49 px, dia da semana ao lado, uma linha "OUT · 20H" **sem repetir o dia**, mais "em N dias" calculado da data), título em Fraunces 31 px, local em 16 px, "Bora" e "Salvar" (44 px), reações, **comentários recolhidos** (`<details class="k-comments">`, resumo de 44 px, contagem em `.k-meta` depois de carregar, "Seja o primeiro a comentar." só aberto). Cards separados por fio e 32 px, sem fundo. Os convites passaram a ser ordenados do rolê mais próximo para o mais distante (a API não garante isso); só o primeiro tem "Bora" em sódio.
- **Pulado:** estado "confirmado" do "Bora" (Check + texto): **não existe** no feed (hoje só aparece o aviso "Presença confirmada"); criar o estado seria mudar lógica.
- Stories: faixa horizontal sem barra visível, `scroll-snap`, rótulo mono de uma linha com reticências, "Seu story" sempre primeiro, anel sódio de 2 px no não visto.
- Composer: campo com `--k-bg-sunken`, textarea de no mínimo 64 px com `<label>` oculto, fio de 1 px acima da barra, ações com ícones de 20 px e 44 px de alvo.
- Coluna direita: 5 sugestões + `<details>` "Ver mais (N)", "Seguir" secundário de 44 px, nome sem reticências; agenda com linhas de 56 px; sem `position: sticky`.
- Testar com 0, 1 e 5 rolês: a estrutura trata os três casos (lista vazia não renderiza o bloco), mas não rodei.

## Etapa L — conversa

- `ConversationScreen` reescrita só na camada visual: cabeçalho (Voltar de 44 px, avatar de 40 px, nome em Fraunces 25 px que quebra, @ em `.k-meta`), lista com `role="log"` e `aria-live="polite"`, mensagens ancoradas embaixo (`margin-top: auto` no primeiro filho em vez de `justify-content: flex-end`, que cortaria o topo da rolagem), altura fluida (100dvh menos cabeçalho, barra de áreas e respiros do shell) com uma só rolagem; rola ao fim ao abrir e a cada mensagem (sem `smooth` com movimento reduzido); foco inicial no campo.
- Mensagem: raio 0, `fit-content`, mín. 96 px, máx. 72%, "VOCÊ · 11:12" nas enviadas e só a hora nas recebidas, `sr-only` "Você:"/"{nome}:", 4 px entre mensagens do mesmo remetente e 16 px na troca.
- Envio: `Anexar foto` (44x44), campo de 44 px com label oculto "Mensagem", "Enviar" sódio só com algo a enviar (texto ou foto), senão secundário e desabilitado com "Escreva uma mensagem.". Enter continua enviando (o campo segue sendo um `<input>`), sem mudança.
- Estados: vazio "Mande a primeira mensagem."; falha de envio agora mostra sempre "Não enviou. Tente de novo." (antes mostrava a mensagem da API); carregando com ponto e fios.
- **Item 7 (coluna "Mensagens" da lateral dizendo "Nenhuma conversa ainda").** Causa: a lateral (`ChatPreview`) busca as conversas ao montar e a cada 20 s; ao mandar a primeira mensagem ela ficava até 20 s com a lista antiga (vazia). Correção de poucas linhas: a conversa dispara um evento (`kina:chat-changed`, em `features/chat/events.ts`) e a lateral refaz a **mesma** consulta que já tinha. Nenhuma lógica de estado mudou.
- Pendente: o campo fixo na base usa a altura do viewport menos o cabeçalho; num teclado virtual de celular a altura em `dvh` muda e a lista pode precisar de ajuste fino — conferir em aparelho.

## Etapa M — navegação em barra de áreas e painel (D25)

- Registrada em `DECISOES.md`, `CLAUDE.md` (raiz e `docs/kina`) e `kina-design.mdc` (raiz e `docs/kina`), como **ampliação** da regra de navegação.
- `components/AreasNav.tsx` (novo): `AreasBar` e `AccountPanel`. Barra de áreas dentro do cabeçalho sticky (≥ 1024 px, 48 px, mesmo contêiner), links irmãos diretos (os seletores `+`/`:has` do "marcador de página" exigem isso), ponto sódio + peso 600 + `aria-current` no ativo, ícones lucide de 20 px. O hover usa exatamente o CSS pedido (`--k-drop`, `--k-lerp-*` com `sin()`), só `transform`, só ponteiro fino e sem movimento reduzido; o foco por teclado tem o mesmo efeito. Não precisei cair no hover padrão.
- Painel (< 1024 px): o avatar vira `<button aria-label="Menu" aria-haspopup aria-expanded aria-controls>` (sem checkbox), painel de largura total sob o cabeçalho, ÁREAS e CONTA em linhas de 56 px com `ArrowRight` (opacidade 0 em repouso; opacidade + 4 px no hover/foco; sempre visível no ativo), "Sair" em `--k-danger` com `LogOut` e texto. Entrada: −8 px + opacidade (240 ms); saída só opacidade (160 ms). Esc devolve o foco ao botão; clique fora, escolha de linha e mudança de rota fecham; sem trava de foco e sem travar a rolagem. Rolável quando a altura não couber (limitado acima da barra inferior).
- Menu de conta (≥ 1024 px): o `Menu` existente agora mostra só Perfil, Configurações e Sair, com ícone, `current` (ponto sódio + `aria-current`), entrada 8 px + opacidade (240 ms) e saída só opacidade (160 ms, o painel fica montado até o fade acabar).
- Cabeçalho: altura explícita (`--k-header-h` 62/70 px) e `--k-areas-h` (0/48 px); o perfil e a conversa usam essas variáveis (antes eram valores estimados).
- Contador de não lidas em Mensagens: **não feito**, o dado não existe no cabeçalho (o total do chat só é calculado na lateral).
- Entre 1024 e 1099 px as abas inativas escondem o rótulo (ficam só com ícone, `title` e nome acessível), como rede de segurança; pela conta, as 7 abas cabem com rótulo em 1024 px.
- A vitrine ganhou a seção "Navegação (D25)" (barra de áreas, painel e menu de conta).

## Etapa N — layout largo e alinhado (D26)

- Registrada em `DECISOES.md`, `CLAUDE.md` e `kina-design.mdc` (e `D20 a D26` na lista das exceções que varreduras não podem desfazer). Tokens `--k-gutter`, `--k-container`, `--k-rail`, `--k-measure` e `.k-container` no `kina-tokens.css` e no `docs/kina/design/tokens.css`.
- Achado: o corpo do shell tinha duas famílias de larguras (`680px + 22.5rem` só em `/` e `max-w-7xl` nas demais, mais um `px-3/px-4`). Foram substituídas por `.k-container .k-layout` (feed fluido + `--k-rail`), no **mesmo** `.k-container` do cabeçalho e da barra de áreas.
- A coluna direita passou a aparecer a partir de **1024 px** (antes 1280 px). Abaixo de 1024 px ela continua escondida; nesse caso os atalhos "Próximos" e "Mensagens" (que o `ChatPreview` mostrava só abaixo de `xl`) agora aparecem abaixo de `lg`. Sem sticky na coluna direita.
- Busca centralizada (`max-width: 560px`) e ações coladas na borda direita. Texto de leitura (post, descrição do rolê, comentários, bio) com `max-width: var(--k-measure)`; mídia na largura da coluna. Mesa: tile com teto de 520 px. Capa de convite 3:2 até 420 px (sem placeholder). A sangria lateral da capa do perfil passou a usar `--k-gutter`.
- Telas com largura própria (conversa, lista de conversas, painel da Mesa, carrossel) não mudaram de comportamento. O mapa e a entrada não dependiam do padding antigo do shell.

## Etapa O — "Marcar um rolê"

- "Editar rolê" **não** usava o mesmo componente (eram duas cópias do JSX). Criei `features/roles/RoleFormView.tsx` (só apresentação) e as duas telas passaram a usá-lo; estado, validação, envio e rotas ficaram nas telas. O `minLength` do nome continua só na criação.
- Casca: nas rotas de formulário (`/roles/new` e `/roles/<id>/editar`) o shell não renderiza a coluna direita (decidido pela rota no `AppShell`, `data-page="form"`); coluna única de até 1100 px alinhada ao contêiner.
- Título `h1` ("Marcar um rolê"/"Editar rolê"), grade 5/12 + 7/12 a partir de 768 px com a capa sticky; capa é UM controle (o `<label>` da área 3:2 envolve o `<input type="file">`, `sr-only`, foco por `:focus-within`, cantoneiras 6 px por fora, nome do arquivo em mono). O botão duplicado "Escolher imagem"/"Trocar imagem" saiu (não tinha função extra); "Remover" ficou.
- Nome em Fraunces `clamp(28px, 4vw, 39px)`, `textarea` de 1 linha que cresce (CSS `field-sizing` + ajuste de altura por JS onde não há), Enter não insere quebra de linha nem envia (antes o Enter no input enviava o formulário). Ficha: rótulo mono de 120 px, linhas de 56 px, fios, sem cartão; no celular o rótulo fica acima do valor. "Local", "Descrição" e "Banner" no mesmo estilo mono.
- **Caixinhas à esquerda: caso (a)** — eram só indicadores derivados do valor (nem eram `<input>`). Viraram ponto de 10 px redondo (cheio sódio = preenchido, anel de 1,5 px = vazio) com texto `sr-only` "preenchido"/"vazio". Grupos "Quando" e "Onde" em `<fieldset>` com `<legend>` `sr-only` (o rótulo visível continua o mono).
- Campos: 44 px, raio 2 px, fundo rebaixado, fio inferior (2 px no foco); `date`/`time` nativos com área de 44 px no seletor; `<select>` nativo com `appearance: none` e `ChevronDown` (`pointer-events: none`). Placeholders: Tags já tinha ("sexta, festa, bar"); **Custo** ganhou "Ex.: 20 (em reais)" em vez de "Ex.: R$ 20 ou grátis", porque o campo é numérico e não aceita "grátis"; **Local** "Praça, bairro ou CEP" (mudou). Ajuda do local em 14 px com `aria-describedby`; "Pesquisar" na mesma linha (desce abaixo de 480 px).
- Mapa: mesmos tiles OSM, raio 0, fio `--k-line-strong`, altura `clamp(240px, 36vh, 360px)`, controles retangulares de 44 px com fundo `--k-bg`, atribuição visível; **gestos cooperativos ligados só neste mapa** (nova opção `guardScroll` em `mountLocationMap`/`LocationMap`), para a rolagem da página não ficar presa; o teclado continua pelo campo de busca. Marcador `pin="role"` (como na Fase 4D).
- Descrição dentro de `<details>` fechado, que abre sozinho uma vez quando já há conteúdo (edição). Barra de ação sticky com fio no topo, safe-area, "Publicar"/"Salvar" sódio (única ação principal) e, desabilitado, o motivo derivado da condição que já existia ("O nome precisa de pelo menos 3 caracteres", "Falta o nome"). "Cancelar" não existia e não foi criado. Erro do envio: continua o toast e ganhou um `role="alert"` no topo da barra (guarda a mensagem num estado local novo).
- Pulado: "foco vai para o campo com erro" (não há erros por campo; a validação é a nativa do navegador, que já foca o campo).

## Fechamento

- `TESTE-FINAL.md`: 30 itens (limite). Itens 8, 10, 16, 19 e 24 reescritos; 25 a 30 novos (barra de áreas e menu de conta, painel, detalhe de post, conversa, fotos e áudios, layout largo).
- Re-varredura dos 30 arquivos tocados na Parte 3 (hex, `rounded-*`, sombras, gradientes, `backdrop-filter`/`filter`, `keyCode`, `console.log`, durações/easings soltos, `localStorage`, larguras fixas, `sticky` na coluna direita, rótulos de seção no feed): nada novo fora das exceções (`.k-glass`/`.k-entry-scrim` e os tokens de gradiente de foto que já existiam). Corrigi um `text-xs` que passei a tocar (`LocationMap`, agora `k-help`). Os únicos tempos escritos em JS são os temporizadores de segurança de 240 ms do fade de saída do menu e do painel; as durações visuais vêm dos tokens.

## Limitações por navegador

- `animation-timeline: scroll()` (perfil), View Transitions (Mesa) e `<details name>` (chat): como nas Partes 1 e 2.
- `sin()` em `calc()` e `:has()` (marcador de página da barra de áreas): navegadores sem suporte mostram a barra sem o efeito (os links continuam funcionando, sem `transform`).
- `field-sizing: content` (nome do rolê): sem suporte, a altura é ajustada pelo JS.
- `::file-selector-button` e `::-webkit-calendar-picker-indicator`: o seletor do calendário só existe em navegadores baseados em Chromium/WebKit; no Firefox o campo de data usa o controle nativo, sem o ajuste de 44 px.
- Gestos cooperativos do MapLibre (mapa do formulário): o texto de aviso é o padrão do MapLibre.
- Nada disto foi visto em navegador. Pendências para o olho humano: hover/foco da barra de áreas em 1024 px, painel em 360 px com a tela baixa, nome comprido no perfil e no formulário, mapa do formulário no teclado, teclado virtual na conversa, 1920 e 2560 px (alinhamento do cabeçalho com o conteúdo).
