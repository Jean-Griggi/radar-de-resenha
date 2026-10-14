# Kina — Relatório da Fase 2 (componentes base e vitrine)

> Branch `redesign/kina`. As três etapas passaram em `pnpm lint && pnpm typecheck && pnpm --filter @resenhometro/web build`. A e B falharam uma vez no `typecheck` (erro de tipo em `Corners` e em `Tabs`), corrigi e rodei de novo; a C passou de primeira. Nenhuma etapa foi desfeita.
> O `web` não tem testes automatizados, então a verificação foi: lint + typecheck + build, a vitrine renderizando em `next dev` (HTTP 200, todas as seções no HTML) e a rota respondendo como 404 em `next start`. **Nada foi visto num navegador de verdade**: a lista no fim é para isso.

## 1. O que foi feito

| Etapa | Commit | Conteúdo |
| --- | --- | --- |
| A | `c710d8a` | `Button`, `Field`/`Input`/`Textarea`/`Select`, `Avatar`, `AvatarStack` (novo), `Tag` (novo), `Corners` (novo) e a vitrine `/kina-vitrine` |
| B | `da95967` | `Card` e `.card`, `Tabs` (novo), `FichaRow`/`Ficha` (novo), `TrackRow`/`TrackList` (novo), `Skeleton`, `Spinner` (novo), `EmptyState`, `Toast` |
| C | `e01d84b` | `Modal` e `Sheet` (novos, em `Modal.tsx`), `Menu` (novo), `Reactions` (D6), `BrandMark` e `BrandWordmark` |

### Onde está cada coisa

- CSS novo: `apps/web/src/app/kina-components.css` (importado pelo `globals.css`, em `@layer components`). Os blocos antigos de `.button`, `.input`, `.avatar`, `.card`, `.skeleton`, `.chip-tab` e `.reaction-btn` foram **removidos** do `globals.css`.
- Componentes: `apps/web/src/components/`. Exports e props antigos mantidos; só entraram props opcionais.
- Vitrine: `apps/web/src/app/kina-vitrine/` (`page.tsx` chama `notFound()` em produção; `Vitrine.tsx` é o cliente, com botão "Alternar tema").

### Props e exports

- `Button`: mesmos `variant` (`primary`, `secondary`, `outline`, `danger`, `ghost`), `loading` e `skeleton`. Visual conforme T14. A versão cheia de perigo é a classe `button--danger-solid`, passada por `className`.
- `Field`: ganhou `error?` (mensagem com ícone, `aria-invalid` e `aria-describedby`). Sem `error` renderiza como antes.
- `Avatar`: mesmos `src`, `name`, `size` (`sm`/`md`/`lg`/`xl`), `glow` e `online`. Entraram `size="xs"` (24 px) e `seen` (anel de story visto).
- `Card`: ganhou `corners?`. `EmptyState` e `Skeleton` seguem exportados de `Card.tsx`; `Skeleton` ganhou `variant` (`block`, `line`, `dot`).
- `Toast`: `push(message, tone?)` igual; ganhou um 3º parâmetro opcional `action` (`{ label, onClick }`, o "Desfazer"). Exporta também `ToastView`.
- `BrandMark` / `BrandWordmark`: mesmos exports e props.
- `Tabs` entrou no `ProfileScreen` e no `SpotifyPicker` (eram `.chip-tab` com `onClick`; o `setTab` é o mesmo).

## 2. Decisões que tomei sozinho

1. **Altura do botão no desktop: 44 px, não 40.** A spec diz 40, mas o `CLAUDE.md` exige alvo ≥ 44 px. Celular segue 48 px.
2. **Tamanhos do `Avatar`**: `sm` 32 (igual), `md` 44 → 48, `lg` 56/64 → 58/72, `xl` 80/112 → 80/96, alinhados à spec. O anel permanente de 1 px que existia foi removido; só `glow` e `seen` têm anel. É a mudança de layout mais visível desta fase.
3. **`.chip-tab` não sumiu.** Continua em `RoutePanel` e `ChatListScreen`, onde é botão/link e não aba; virou um controle secundário (fio `--k-line-strong`, raio 2 px). Só as abas de verdade foram para o `Tabs`.
4. **Apaguei** as regras `.auth-screen .input` e `.auth-screen .button` (pílulas de raio total), que contrariavam o raio 0/2 px dos componentes. O login muda de forma, não de comportamento.
5. **Pontos redondos além de pessoas**: o ponto da `Tag`, os dois pontos do botão carregando, o marcador da `FichaRow` e a bolinha de presença do `Avatar` ficaram redondos. Entendi "ponto" como uma das quatro peças gráficas, mas é uma leitura minha de "só pessoas são redondas".
6. **Foco global**: a regra de foco do `globals.css` agora é só `outline` 2 px `--k-focus` (tirei o `box-shadow` de anel). Vale para todo o app, não só para os componentes novos.
7. **Texto de campos**: rótulo passou de 12 px cinza para 14 px/600 na cor do texto, e o texto digitado de 14 para 16 px. O 16 px é o que evita o zoom automático no iOS.
8. **`Toast`**: duração de 3,2 s para 4,5 s (6 s com ação); posição no desktop passou para o canto inferior. Tom indicado por ícone e por `role="alert"` no erro, não pela cor da borda.
9. **`EmptyState`** perdeu o `BrandBadge` redondo e o cartão tracejado. O `BrandBadge` (usado só pelo `ErrorBoundary`) virou quadrado.
10. **`BrandLoader`** agora usa o `Spinner` da Kina em vez da barra animada. Como o spinner só aparece após 300 ms (spec), as telas de carregamento ficam em branco nesse intervalo.
11. **Reações**: tirei o "pulo" do emoji ao reagir e o `scale` no hover. Em `Reactions.tsx` só mudou a classe da contagem (`k-meta`).
12. **Vitrine**: ficou em `apps/web/src/app/kina-vitrine/` (o app usa `src/app`). Pus `dynamic = 'force-dynamic'` para decidir em tempo de requisição. Em produção ela mostra o 404 padrão do Next com **status HTTP 200**, porque o `app/loading.tsx` faz o servidor mandar o status antes do `notFound()` rodar. O conteúdo da vitrine não vaza (conferido com `next start`), mas o status não é 404.
13. **Reações na vitrine** reproduzem o HTML do componente em vez de usá-lo, porque `Reactions` chama a API ao clicar.
14. **"Alternar tema" da vitrine** usa o `toggle` real, então grava `resenhometro_theme` no navegador.
15. **Modal, Sheet e Menu não foram ligados** a nenhuma tela. Os modais soltos de `StoriesBar`/`StoryViewer` e o menu da conta do `AppShell` ficam para a Fase 3, como o `NavRail`/`TabBar` (DECISOES §5).
16. **`TrackRow`** não coloca a atribuição do Spotify; isso fica para a Fase 4.3.
17. **Variação `display` do campo** (título de rolê): é a classe `.input--display` (Fraunces 34 px, borda inferior 2 px), aplicada por `className` em `Input`; não é uma prop nova.

## 3. O que ficou de fora ou pendente

- **`NavRail` e `TabBar`**: não feitos, por decisão do DECISOES §5. O plano marca esses dois itens como pendentes.
- **"Substituir os usos antigos" (último item da Fase 2)**: parcial. Os componentes adaptados atingem todas as telas pelo mesmo import. Ainda há usos fora do padrão que a Fase 3 deve atacar:
  - `rounded-full` e `rounded-*` do Tailwind em telas e componentes (a auditoria contou 15 arquivos);
  - `.icon-btn`, `.nav-create`, `.top-nav-link`, `.composer-chip`, `.chat-badge` e `.theme-toggle-corner` no `globals.css` ainda têm `border-radius: 999px` e alguns têm `box-shadow`;
  - `.story-ring-unseen` usa `box-shadow`;
  - os aliases `--shadow-*` e `--radius-*` continuam existindo (remoção na Fase 5, DECISOES T2).
- **Acessibilidade**: foco preso, `Esc` e retorno de foco foram implementados e lidos no código, **não testados com teclado/leitor de tela**. A auditoria com axe é da Fase 5.
- Os avisos `LF will be replaced by CRLF` do git vêm do `core.autocrlf` desta máquina; os arquivos novos estão em LF e os antigos mantiveram o que tinham.

## 4. O que olhar no navegador (em ordem de risco)

Suba com `pnpm dev` na raiz (web em `http://localhost:3000`). Olhe nos dois temas e em 390 px e 1280 px.

1. `http://localhost:3000/login` e `/cadastro`: era onde `.auth-screen` forçava pílulas. Conferir campos (borda inferior, foco, erro) e botão "Entrar" (altura, estado carregando com os dois pontos sem mudar a largura).
2. `http://localhost:3000/roles/new` e `/roles/<id>/editar`: formulário longo com `Field`/`Input`/`Select`/`Textarea`; ver alinhamento, campos de 46 px e o seletor do Spotify (agora com `Tabs`).
3. `http://localhost:3000/perfil/<username>`: as 7 abas viraram `Tabs` (rolagem horizontal no celular, aba ativa visível, setas do teclado) e o avatar `xl` mudou de tamanho.
4. `http://localhost:3000/` (feed): `Avatar` pequeno em todo lugar, `Card`s sem raio e sem sombra, reações (fio inferior na ativa) e o toast de erro ao reagir sem rede.
5. `http://localhost:3000/roles/<id>`: botões "Editar" (outline), "Excluir" (danger) e "Bora"/"Confirmado" nos novos estilos.
6. `http://localhost:3000/notifications`, `/photos` e `/chat`: `EmptyState` novo e `Skeleton` (agora contornos de 1 px, sem brilho) durante o carregamento.
7. Qualquer rota recarregando a página (ex.: `http://localhost:3000/`): o `BrandLoader` com o ponto percorrendo o L, que só aparece após 300 ms.
8. `http://localhost:3000/kina-vitrine`: percorrer todas as seções nos dois temas; abrir Modal, confirmação destrutiva, Sheet e Menu só com teclado (Tab, Shift+Tab, Esc, setas, foco voltando ao botão).
