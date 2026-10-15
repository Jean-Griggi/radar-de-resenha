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
