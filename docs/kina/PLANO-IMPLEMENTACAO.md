# Kina — Plano de implementação da nova identidade visual

> Documento para agentes de código (Claude Code, Cursor) e para quem os supervisiona.
> Local esperado no repositório: `docs/kina/PLANO-IMPLEMENTACAO.md`.
> Referência visual completa: `docs/kina/design/reference/Kina - Plano de design.pdf`
> e os mockups em HTML em `docs/kina/design/reference/mockups/kina.html` (abra no navegador).

---

## 0. Como usar este plano (leia antes de qualquer alteração)

1. **Uma fase por vez, um PR por fase** (ou por tela na Fase 3). Não pule a Fase 0.
2. Antes de editar, **leia** nesta ordem: este arquivo → `design/components-spec.md` → `design/tokens.css` → o trecho do PDF/mockup da tela em questão.
3. Para cada tarefa: proponha um plano curto, liste os arquivos que vai tocar, faça a mudança, rode o projeto e os testes, e marque a caixa `- [x]` neste arquivo.
4. Se algo deste plano **não existir no código** (ex.: rascunho de rolê, “Seguir”, curtidas), **não invente a funcionalidade**. Registre em `docs/kina/AUDITORIA.md` na seção “Divergências” e siga só com a parte visual.
5. Em caso de dúvida entre “bonito” e “funcional”, o funcional ganha. Este redesign **não altera regras de negócio**.

### Regras invioláveis

- **Não alterar**: rotas, chamadas de API, contratos de dados, autenticação, regras de permissão, stores/estado global, nomes de campos de formulário enviados ao backend.
- **Não trocar** framework, roteador, biblioteca de estado ou de mapa sem aprovação explícita.
- **Nenhum hexadecimal** em componentes: só `var(--k-*)` (ou as classes `k-*` do preset Tailwind). Exceções aprovadas: ver a tabela abaixo.
- **Nenhuma dependência nova** sem justificar no PR. Permitidas sem discussão: as fontes do kit e, se o projeto não tiver ícones, `@phosphor-icons/*` (MIT).
- **Acessibilidade não regride**: foco visível, rótulos, contraste AA, `prefers-reduced-motion`.
- Animar **apenas `transform` e `opacity`**.
- Fotos de usuários **nunca** recebem filtro. Capas de álbum do Spotify **nunca** são recortadas, filtradas ou cobertas.

### Exceções aprovadas ao "nenhum hexadecimal" (`DECISOES.md` §3)

Só estas. Qualquer outra precisa de justificativa no PR.

| Onde | Valor | Motivo |
| --- | --- | --- |
| Botões "tocar" do Spotify (`Player`, `MusicCard`, `MusicScreen`) | `#1DB954` | Cor oficial do Spotify. Centralizada em `--k-spotify` no `tokens.css`; usar a variável. |
| MapLibre (`mapPoint.ts`: paint, `style.cssText`) | valores de `--k-*` | MapLibre não lê `var()`. Ler com `getComputedStyle(document.documentElement)` e reler ao trocar de tema. Nenhum hex escrito à mão. |
| E-mail (`apps/api/src/lib/mail.ts`) | hex da paleta Kina | Clientes de e-mail não leem variáveis. Usar exatamente os valores do `tokens.css`. |
| `themeColor` em `layout.tsx` | `#F3EEE4` (claro) / `#14120F` (escuro) | Metadado do navegador. |

---

## 1. Resumo da identidade (o que o código precisa expressar)

**Nome:** Kina (de *quina*, a esquina). Substitui “Redesinha”. Frase: *Te vejo na Kina.*

**Conceito:** um álbum de memórias da turma. Três regras geram todo o resto:

| Regra | No código |
| --- | --- |
| **Pessoas são pontos** | Só avatares, indicadores de presença e o botão “Criar” são redondos (`--k-radius-person`). Todo o resto tem raio 0 ou 2 px. |
| **Lugares são cantos** | O símbolo é um L com um ponto. Cantoneiras (`.k-corners`) emolduram memórias e indicam hover/foco. |
| **Memória tem moldura, presente não tem** | Publicações e rolês que já aconteceram usam cantoneiras. Stories, convites e rolês futuros ocupam o espaço sem moldura. |

**Quatro peças gráficas** (as únicas permitidas): canto, ponto, fio (1 px), ficha (rótulo mono à esquerda, valor à direita, fio abaixo).

**O que sai:** cartões brancos arredondados com sombra, gradientes roxos/azuis, glassmorphism, pílulas coloridas, sombras em tudo, branco e preto puros.

**Cor:** uma cor de marca — **sódio** (`--k-brand`). Papel e tinta de dia, asfalto e luz à noite. Anil (`--k-accent`) é raro: links e “você” no mapa.

**Tipografia:** Fraunces (nomes de pessoas e rolês, títulos ≥ 20 px) · Schibsted Grotesk (interface e texto) · IBM Plex Mono (datas, horas, contagens, durações, sempre em caixa alta com `.k-meta`).

**Tom de voz:** “Cola?” (confirmar presença) · “Marcar um rolê” (criar evento) · “Ninguém chegou ainda.” (vazio) · “Essa rua não existe.” (404). Erros são diretos e sem piada.

---

## 2. Conteúdo deste kit

```
docs/kina/
├─ PLANO-IMPLEMENTACAO.md        ← este arquivo
├─ PROMPTS.md                    ← prompts prontos por fase (Claude Code e Cursor)
├─ design/
│  ├─ tokens.css                 ← fonte única de tokens (claro + escuro + movimento)
│  ├─ tailwind-preset.js         ← opcional, só se o projeto usa Tailwind
│  ├─ components-spec.md         ← especificação de cada componente e estado
│  └─ reference/
│     ├─ Kina - Plano de design.pdf
│     ├─ componentes.html        ← vitrine de referência com CSS funcionando
│     └─ mockups/kina.html       ← todas as telas do PDF em HTML
├─ assets/
│  ├─ brand/                     ← símbolo, logo, ícone do app, favicon (SVG)
│  ├─ fonts/                     ← woff2 + licenças OFL
│  └─ textures/grain.png
├─ CLAUDE.md                     ← copiar/mesclar na raiz do repositório
└─ .cursor/rules/kina-design.mdc ← copiar para .cursor/rules/ na raiz
```

---

## Fase 0 — Auditoria (sem alterar código) — ✅ CONCLUÍDA

> Concluída em 2026-10-14. Resultado: [`AUDITORIA.md`](AUDITORIA.md); decisões da revisão: [`DECISOES.md`](DECISOES.md), que **tem prioridade sobre este plano** quando houver conflito.

**Objetivo:** entender o projeto real e responder tudo que o design deixou “a confirmar”.
**Entregável:** `docs/kina/AUDITORIA.md`. **Nenhum arquivo de código alterado.**

- [x] Stack: framework, versão, roteador, bundler, linguagem (TS/JS), gerenciador de pacotes.
- [x] Estilos: Tailwind (v3 ou v4)? CSS Modules? styled-components? CSS global? Biblioteca de UI (shadcn, MUI, Chakra…)?
- [x] Temas atuais: como claro/escuro é implementado e onde a preferência é salva.
- [x] Inventário de rotas/telas com caminho do arquivo de cada uma.
- [x] Inventário de componentes reutilizáveis (botão, input, avatar, card, modal, nav, toast…), com caminho e quantas telas usam cada um.
- [x] Onde estão cores, fontes e ícones hoje (listar hexadecimais soltos com `grep -rE "#[0-9a-fA-F]{3,8}\b" src`).
- [x] Ocorrências do nome antigo: `grep -rni "redesinha" .` (código, `index.html`, manifest, meta tags, e-mails, textos).
- [x] Login: método real (e-mail e senha, link mágico, OAuth? quais provedores?).
- [x] Mapa: biblioteca, provedor de tiles e se aceita estilo customizado.
- [x] Spotify: escopos, fluxo OAuth, onde capas e faixas aparecem, tratamento de token expirado.
- [x] Modelo de dados: rolê (campos), publicação (tem vínculo com rolê?), story (expira?), perfil (capa? bio? música do perfil?), presença (“vou/talvez”?), curtidas/comentários, seguir/amizade.
- [x] Existe rascunho de rolê? Existe landing pública separada da área logada?
- [x] Testes existentes (unitários, e2e) e como rodar.

**Modelo do `AUDITORIA.md`:** seções *Stack*, *Estilos e temas*, *Rotas*, *Componentes*, *Funcionalidades confirmadas*, *Divergências do plano de design* (o que o PDF supõe e não existe), *Riscos*, *Ajustes sugeridos nas fases seguintes*.

**Concluída quando:** todas as caixas acima estão respondidas e a seção *Divergências* foi revisada por uma pessoa.

---

## Fase 1 — Fundação: tokens, fontes, marca e temas

**Objetivo:** a aplicação inteira passa a ter as cores, fontes e marca da Kina, mesmo que os componentes ainda sejam os antigos.

- [x] Copiar `assets/fonts/*.woff2` para a pasta pública do projeto (ex.: `public/fonts/`). Ajustar `url()` em `tokens.css` se o caminho for outro.
- [x] Copiar `assets/textures/grain.png` para `public/textures/`.
- [x] Importar `design/tokens.css` uma vez, no ponto de entrada global de estilos.
  - Se usa **Tailwind v3**: adicionar `presets: [require('./docs/kina/design/tailwind-preset.js')]`.
  - Se usa **Tailwind v4**: declarar as mesmas variáveis em `@theme` apontando para `var(--k-*)`.
  - Se usa **CSS-in-JS/biblioteca de UI**: mapear o tema da biblioteca para as variáveis `--k-*` (não duplicar valores).
- [ ] Pré-carregar as duas fontes críticas no `<head>`: `fraunces-latin-full-normal.woff2` e `schibsted-grotesk-latin-400-normal.woff2` (`<link rel="preload" as="font" type="font/woff2" crossorigin>`). *(feito via `next/font/local`, DECISOES T3; os `<link rel="preload">` não apareceram no HTML de `/login` no build — verificar na aba Network.)*
- [x] Temas: aplicar `data-theme="light|dark"` no `<html>`. Sem escolha salva, não setar o atributo (o CSS segue o sistema). Reaproveitar o mecanismo atual de persistência, se houver. Evitar flash: setar o atributo num script inline antes da renderização.
- [ ] Remover/neutralizar as variáveis e classes de tema antigas **apenas depois** que tudo estiver mapeado para `--k-*`.
- [x] Marca: substituir “Redesinha” por “Kina” em título da página, meta tags, `manifest.json` (name, short_name, theme_color `#C8461A`, background_color `#F3EEE4`), textos de interface e e-mails transacionais, se houver no repositório.
- [x] Favicon: `assets/brand/svg/favicon.svg` + `assets/brand/png/favicon/favicon.ico` + `assets/brand/png/app-icon/apple-touch-icon-180.png` (ver `assets/brand/COMO-USAR.md`).
- [x] Criar um componente `<KinaLogo variant="full|symbol|compact" />` que use o SVG do símbolo + o wordmark em texto (Fraunces, pingo do “i” como círculo `--k-brand`, usando o caractere “ı” sem pingo). Ver `components-spec.md` § Logo.
- [x] Fundo da página: `--k-bg` com `.k-grain` no `body` (claro) — o grão some sozinho no escuro.

**Concluída quando:**
- `grep -rni "redesinha"` não retorna nada em código de produção.
- As três fontes carregam (verificar na aba Network) e não há texto em fonte do sistema.
- Alternar tema muda todas as telas sem recarregar e sem flash.
- Nenhum hexadecimal novo foi adicionado fora de `tokens.css`.

---

## Fase 2 — Componentes base e vitrine

**Objetivo:** construir/adaptar os componentes de `components-spec.md` e uma página de vitrine que os mostre nos dois temas e em todos os estados.

- [ ] Rota de vitrine **só em desenvolvimento** (ex.: `/__kina`), protegida por `import.meta.env.DEV` / `process.env.NODE_ENV !== 'production'`.
- [ ] Componentes (adaptar os existentes quando houver; criar quando não houver):
  - [ ] `Button` (primary, secondary, text, create) — todos os estados.
  - [ ] `TextField` / `TextArea` / `Select` — rótulo visível sempre, erro com ícone + texto + `aria-describedby`.
  - [ ] `Avatar` (24/32/48/72/96, iniciais em Fraunces) e `AvatarStack`.
  - [ ] `Corners` (wrapper de cantoneiras) — ou a classe `.k-corners`.
  - [ ] `FichaRow` / `Ficha` (linha de dados).
  - [ ] `TrackRow` (linha de encarte de música).
  - [ ] `Tag` (ponto colorido + texto mono, **sem pílula**).
  - [ ] `Tabs` (texto + sublinhado de 2 px).
  - [ ] `Modal` (desktop) e `Sheet` (folha inferior, celular).
  - [ ] `Menu`, `Toast`, `Skeleton` (fios e pontos), `EmptyState`, `Spinner` (ponto percorrendo o L).
  - [ ] `NavRail` (desktop, 76 px) e `TabBar` (celular, 5 itens com “Criar” central).
  - [ ] `KinaLogo`.
- [ ] Substituir os usos antigos de botão/input/avatar pelos novos **sem alterar props de comportamento** (onClick, onSubmit, name, value, disabled…).

**Concluída quando:**
- A vitrine mostra 100% dos componentes nos dois temas e em todos os estados da spec.
- Navegação por teclado funciona em todos (Tab, Shift+Tab, Enter, Espaço, Esc nos overlays) com foco visível.
- Nenhum componente usa sombra, gradiente ou raio fora dos tokens.

---

## Fase 3 — Telas prioritárias

Um PR por tela. Referência visual de cada uma no PDF (páginas indicadas) e em `mockups/kina.html`.

### 3.1 Shell de navegação (PDF p. 15–16)
- [ ] Desktop ≥ 1024 px: `NavRail` à esquerda (ícones + rótulo no hover/foco; item ativo com ponto `--k-brand` acima do ícone; “Criar” como ponto sódio na base).
- [ ] Celular < 768 px: `TabBar` inferior — Início, Mapa, Criar (ponto central 56 px), Música, Perfil — rótulos sempre visíveis; respeitar `env(safe-area-inset-bottom)`.
- [ ] Tablet: `NavRail` recolhido.
- **Aceite:** mesmas rotas de antes; item ativo indicado por forma (ponto) e peso, não só por cor.

### 3.2 Login (PDF p. 12)
- [ ] Fundo `--k-bg` + `.k-street-grid`; dois fios mais grossos (2 px, `--k-text` a 55%) cruzando no centro.
- [ ] Repouso: **um único** botão primário “Entrar” com o símbolo, no vértice do cruzamento, com foco automático.
- [ ] Clique/Enter/Espaço: o botão se transforma no painel (`--k-surface-raised` + `.k-corners` com 22 px) contendo **o método real de login identificado na Fase 0**. Foco vai ao primeiro campo.
- [ ] Magnetismo (só `pointer: fine` e sem `prefers-reduced-motion`): com o cursor a < 160 px, o botão se desloca até 8 px na direção dele (`transform`, mola ou `transition` de 240 ms com `--k-ease-arrive`); volta ao sair. Usar `requestAnimationFrame`; nada de setState a cada `mousemove` se causar re-render.
- [ ] Erros: ícone + texto + borda 2 px `--k-danger`; magnetismo desligado enquanto houver erro.
- [ ] Toque: sem magnetismo; painel abre como `Sheet`.
- **Aceite:** login funciona exatamente como antes (mesmos campos, mesmas chamadas); fluxo completo só com teclado; com `prefers-reduced-motion` o painel aparece em fade de 160 ms.

### 3.3 Landing pública (PDF p. 11) — *só se existir rota pública; senão, registrar na auditoria*
- [ ] Frase “Te vejo na Kina.” em Fraunces 96 px (49–58 px no celular).
- [ ] Duas faixas de fotos institucionais (horizontal e vertical) que se cruzam; no cruzamento, botão circular “Entrar” `--k-brand` (exceção permitida ao “só pessoas são redondas”: é o ponto de chegada).
- [ ] Faixas deslizam em sentidos opostos (CSS `@keyframes` com `transform`, ~1 foto/8 s), pausadas com `prefers-reduced-motion` e quando a aba está oculta.
- [ ] Três frases curtas separadas por fio: “Combina o rolê.” / “Chega junto.” / “Guarda o que rolou.”
- [ ] Fotos: placeholders até chegarem fotos licenciadas; **nunca** usar fotos de usuários reais.

### 3.4 Perfil de outra pessoa (PDF p. 13–14)
- [ ] Capa de borda a borda (70% da viewport no desktop, 40% no celular), sem moldura. Sem capa: `--k-bg-sunken` + `.k-street-grid` + iniciais em Fraunces gigante a 6% de opacidade.
- [ ] Bloco de identidade em `--k-bg` com `.k-corners` (18 px), **ancorado no canto inferior esquerdo** da capa no desktop; largura total sobrepondo a capa no celular.
- [ ] Avatar (96 desktop / 80 celular) “saindo” pela borda superior do bloco, com contorno de 4–5 px na cor `--k-bg`.
- [ ] Nome em Fraunces (`--k-fs-49` desktop, `--k-fs-31`/34 px celular), quebra em até 2 linhas, sem reticências; `@usuário · cidade` em `.k-meta`.
- [ ] Música do perfil (se existir) como `TrackRow`. Ação principal (a que existir hoje) como `Button primary`.
- [ ] Abas: Publicações / Rolês / Músicas — **só as que existirem**. Grade de publicações com `.k-corners`.
- [ ] Rolagem: capa com parallax de uma camada (60% da velocidade) via `transform` + `IntersectionObserver`/scroll-timeline; desligado em `prefers-reduced-motion`.

### 3.5 Rolê — criar/editar (PDF p. 17)
- [ ] A tela de criação tem a forma do rolê publicado: área de capa (`--k-bg-sunken`, ícone de câmera, “Escolher capa”) → campo de nome em Fraunces 34 px com borda inferior 2 px → **ficha** com as linhas que existirem: Quando, Onde, Quem, Trilha.
- [ ] Cada linha preenchida acende um ponto `--k-brand` (12 px) à esquerda; vazia mostra círculo contornado.
- [ ] Celular: cada linha abre um `Sheet` com o seletor existente (data, local, amigos, música).
- [ ] Desktop: duas colunas (capa à esquerda, ficha à direita); seletores em painel lateral ou popover.
- [ ] Botão “Publicar” fixo embaixo; quando desabilitado, mostra o motivo em texto (“Falta escolher quando”).
- **Aceite:** mesmos campos e mesma validação de antes; criação completa só com teclado; nada de wizard novo.

### 3.6 Rolê — ver (PDF p. 18)
- [ ] Capa de borda a borda; degradê `--k-scrim-photo` só na base para o título encostar.
- [ ] Rótulo de estado em `.k-meta` `--k-brand-text` (“Vai rolar · em 4 dias” / “Já rolou”).
- [ ] Nome em Fraunces `--k-fs-61` (`--k-fs-39` no celular), descrição, ficha em 2 colunas (desktop).
- [ ] Participantes como `AvatarStack` + contagem mono; botão “Cola?” (ação de presença existente).
- [ ] Lateral (desktop): mini mapa no estilo Kina + trilha do rolê como `TrackRow`.
- [ ] **Rolê passado:** capa ganha `.k-corners`. Animação “vira memória” (cantos deslizam até a capa, 520 ms) apenas na primeira visita após a data — guardar flag em `localStorage`; opcional.

### 3.7 Início / feed (PDF p. 15–16)
- [ ] Hierarquia em três tempos: **futuro** (convites/rolês — capa larga sem moldura, data gigante em Plex Mono à esquerda no desktop, “Cola?”), **agora** (stories em pontos de 58 px; não visto = anel `--k-brand` 2 px), **passado** (publicações com `.k-corners`).
- [ ] Desktop: coluna central ~620 px + coluna “Sua agenda” (lista de `FichaRow`) à direita.
- [ ] Celular: agenda vira faixa horizontal “Próximos” abaixo dos stories.
- [ ] Estados: vazio (“Ninguém marcou nada ainda.” + “Marcar um rolê”), carregando (`Skeleton`), erro.

---

## Fase 4 — Experiências complementares

### 4.1 Publicação (componente `Post`) — inclui a nova versão “em camadas”
Ver `components-spec.md` § Post. Resumo:
- [ ] Versão **feed (completa)**: faixa da capa do rolê de origem por trás, deslocada para a direita; bloco `--k-bg` com `.k-corners` por cima; avatar vazando pela borda esquerda (desktop) ou superior (celular); nome em Fraunces + “em *Nome do rolê*” em itálico; legenda que esmaece após 3 linhas com “ver mais”; fila de pontos de quem estava no rolê; rodapé com trilha (`TrackRow` compacto) à esquerda e ações à direita.
- [ ] Versão **compacta**: sem a faixa de fundo e sem a lista de presentes.
- [ ] Sem rolê vinculado: sem faixa de fundo; o resto igual.

### 4.2 Stories
- [ ] Tela cheia, **sem moldura**, fundo `--k-stage-bg` e texto `--k-stage-text` nos dois temas; barras de progresso de 2 px; nome + hora em `.k-meta`; ações existentes embaixo.

### 4.3 Música e Spotify (PDF p. 19)
- [ ] Listas de música como `TrackRow` (nº mono, capa 40 px, título, artista, duração mono à direita).
- [ ] Capas de álbum **intactas**, com atribuição/link ao Spotify conforme as Spotify Design Guidelines vigentes (conferir antes de implementar). Cantoneiras só por fora, sem sobrepor a capa.
- [ ] Estados de conexão: desconectado (texto + botão “Conectar Spotify” com logo oficial), conectando, conectado (conta em `.k-meta`), expirado (“Conectar de novo”).
- [ ] Não imitar o player do Spotify.

### 4.4 Mapa (PDF p. 20)
- [ ] Se a biblioteca aceitar estilo (Mapbox/MapLibre/Google Cloud styling): base `--k-bg`, ruas em `--k-text` 30% (principais 50%), água anil 13%, parques verde 10%, rótulos em Schibsted. Versão escura equivalente.
- [ ] Se **não** aceitar (ex.: Leaflet com tiles prontos): manter os tiles, aplicar a identidade só nos marcadores, controles e painéis; registrar a limitação.
- [ ] Marcadores: rolê futuro = quadrado `--k-brand` com o símbolo em `--k-bg`; rolê passado = símbolo em `--k-line-strong`; cluster = ponto `--k-text` com número mono; “você” = ponto `--k-accent` com halo. Área de toque ≥ 44 px.
- [ ] Ao tocar: `Sheet` (celular) / painel lateral (desktop) com ficha resumida.

### 4.5 Demais
- [ ] Busca (resultados agrupados: pessoas, rolês, lugares), notificações, configurações (inclui seletor de tema: Sistema / Claro / Escuro), 404 (“Essa rua não existe.”), páginas de erro, e-mails.

**Concluída quando:** todas as telas existentes usam os componentes novos e nenhuma regressão funcional foi encontrada no roteiro de teste manual (ver § Checklist de PR).

---

## Fase 5 — Refinamento

- [ ] Auditoria de acessibilidade (axe DevTools ou `@axe-core/playwright`) em todas as rotas, nos dois temas: zero violações sérias/críticas.
- [ ] Contraste: conferir texto sobre foto (sempre com `--k-scrim-photo` ou faixa sólida) e bordas no limite de 3:1.
- [ ] `prefers-reduced-motion`: magnetismo, parallax e faixas desligados; transições em fade.
- [ ] Desempenho: Lighthouse mobile — Acessibilidade ≥ 95, LCP < 2,5 s na landing/login; fontes com subset latin e `font-display: swap`; imagens com `loading="lazy"` e dimensões declaradas.
- [ ] Responsividade: 360, 390, 768, 1024, 1280, 1440 px; texto ampliado a 200%; nomes longos; listas vazias e muito cheias.
- [ ] Regressão visual (recomendado): screenshots Playwright por rota e tema, antes/depois.

---

## Mapa de substituições (antes → depois)

| Padrão antigo | Substituir por |
| --- | --- |
| Card branco com `border-radius` + `box-shadow` | Espaço + fio `--k-line`; se for memória, `.k-corners` |
| Gradiente roxo/azul de fundo ou botão | `--k-bg` liso; botão `--k-brand` liso |
| Vidro (`backdrop-filter`) | `--k-surface-raised` opaco |
| Pílula colorida (chip/badge) | `Tag`: ponto 8 px + texto `.k-meta` |
| Botão totalmente arredondado | Raio `--k-radius-control` (2 px) |
| Imagem com cantos arredondados | Raio 0; cantoneiras se for memória |
| Sombra em hover | Cantos que fecham (`.k-corners`) ou `--k-brand-hover` |
| Datas em texto corrido (“18 de outubro às 18h”) | `.k-meta`: `SÁB 18 OUT · 18H` |
| Títulos de pessoas/rolês em sans | Fraunces (`.k-display`) |
| Spinner circular genérico | `Spinner` Kina (ponto percorrendo o L) |
| `#fff` / `#000` | `--k-bg` / `--k-text` |

---

## Checklist de PR (copiar na descrição de cada PR)

```
- [ ] Fase/tela: ___
- [ ] Nenhuma alteração em rotas, APIs, estado ou validação
- [ ] Só tokens --k-* (nenhum hexadecimal novo fora de tokens.css)
- [ ] Testado nos temas claro e escuro
- [ ] Testado em 390 px e 1280 px
- [ ] Fluxo completo só com teclado, foco visível
- [ ] prefers-reduced-motion verificado
- [ ] Sem dependência nova (ou justificada abaixo)
- [ ] Screenshots antes/depois anexados
- [ ] Divergências registradas em docs/kina/AUDITORIA.md
```

---

## Decisões pendentes (responder na Fase 0)

| Pergunta | Padrão se ninguém decidir |
| --- | --- |
| Método de login | Manter o atual dentro do painel |
| Biblioteca de mapa aceita estilo? | Se não, só marcadores e controles |
| Existe vínculo publicação ↔ rolê? | Se não, `Post` sem faixa de fundo e sem “em …” |
| Existe landing pública? | Se não, pular 3.3 |
| Rascunho de rolê | Não implementar (fora de escopo visual) |
| Nome “Kina” aprovado juridicamente? | Usar como nome de trabalho; strings centralizadas para troca fácil |
