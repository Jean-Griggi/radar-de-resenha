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
