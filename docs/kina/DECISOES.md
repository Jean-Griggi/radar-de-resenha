# Kina — Decisões da revisão da auditoria (Fase 0)

> Local: `docs/kina/DECISOES.md`. Revisão humana da seção *Divergências* de `AUDITORIA.md`.
> **Este arquivo tem prioridade sobre `PLANO-IMPLEMENTACAO.md` e `components-spec.md` quando houver conflito.**
> Com ele, a Fase 0 está concluída.

---

## 1. Escopo geral

| # | Decisão |
| --- | --- |
| G1 | **Renomear só o que o usuário vê.** “Redesinha”, “Resenhômetro” e “Redesenha” viram “Kina” em textos de interface, títulos, metadados, SVGs da marca e e-mails. **Não renomear** identificadores técnicos: cookie `resenhometro_session`, chaves `resenhometro_*` do `localStorage`, bucket, escopo `@resenhometro/*`, nomes de banco. |
| G2 | `APP_NAME` em `packages/shared/src/constants.ts` passa a `'Kina'` **somente se** todos os usos forem de exibição. Se algum uso for identificador técnico, criar `APP_DISPLAY_NAME = 'Kina'` e trocar só os usos de exibição. |
| G3 | **Não criar funcionalidades.** Nada de vínculo publicação↔rolê, foto em post, música do perfil, rascunho, convites, estado “conectando/expirado” do Spotify ou landing pública. |
| G4 | Telas fora do PDF (chat, resenhas, fotos, álbuns, áudios, estatísticas, calendário, retrospectiva, conquistas, amigos, mapa de pessoas) recebem **tokens e componentes novos, sem mudar o layout**. Redesenho delas fica para uma rodada futura. |
| G5 | **Sem dependências novas nesta rodada.** Ícones: `lucide-react` (não instalar Phosphor). Acessibilidade na Fase 5: extensão axe DevTools manual, sem `@axe-core/playwright`. |

## 2. Ajustes técnicos ao plano (substituem o que o plano diz)

| # | Onde o plano erra | Fazer assim |
| --- | --- | --- |
| T1 | Preset Tailwind v3 | Ignorar `tailwind-preset.js`. Usar **Tailwind v4 `@theme inline`** no `globals.css`, apontando para `var(--k-*)`. |
| T2 | Aliases de token | Importar `tokens.css` no `globals.css` e fazer os nomes atuais (`--background`, `--surface`, `--primary`, `--bg`, `--card`, `--line`, `--accent`…) **apontarem para `--k-*`**. Remover os antigos só na Fase 5. |
| T3 | Fontes via `<link rel="preload">` | Usar **`next/font/local`** com os woff2 de `docs/kina/assets/fonts/` copiados para `apps/web/public/fonts/` (ou `src/fonts/`), expondo as variáveis `--k-font-display`, `--k-font-ui`, `--k-font-mono`. Remover Plus Jakarta Sans, Inter e Bomb Font no fim da Fase 1, depois de varrer `font-display` e `font-sans`. |
| T4 | Vitrine `/__kina` com `import.meta.env.DEV` | Rota **`app/kina-vitrine/page.tsx`**, chamando `notFound()` quando `process.env.NODE_ENV === 'production'`. |
| T5 | Tema | Remover o `data-theme="dark"` fixo do `layout.tsx`. Sem valor salvo, **não setar** o atributo (o CSS segue o sistema). O `ThemeProvider` **não grava** na montagem, só quando a pessoa escolhe. Chave `resenhometro_theme` mantida, valores `light`/`dark`; “Sistema” = chave ausente. |
| T6 | Textura | Criar `apps/web/public/textures/grain.png`. Remover `WaveBackground` e `.grain-overlay`. |
| T7 | Tamanho mínimo de texto | Mínimo **12 px**, e 12 px só em `.k-meta` (mono, caixa alta). Eliminar `text-[10px]`; texto corrido ≥ 14 px. |
| T8 | `CLAUDE.md` da raiz com codificação quebrada | Regravar a parte da Kina em **UTF-8** a partir de `docs/kina/CLAUDE.md`. Conferir também `.cursor/rules/kina-design.mdc`. |
| T9 | Checklist de PR | Acrescentar: `pnpm lint && pnpm typecheck && pnpm --filter @resenhometro/web build` (o CI não roda build). |

## 3. Exceções aprovadas ao “nenhum hexadecimal”

Só estas. Qualquer outra precisa de justificativa no PR.

| Onde | Valor | Motivo |
| --- | --- | --- |
| Botões “tocar” do Spotify (`Player`, `MusicCard`, `MusicScreen`) | `#1DB954` | Cor oficial do Spotify. Centralizar em `--k-spotify: #1DB954` no `tokens.css` e usar a variável. |
| MapLibre (`mapPoint.ts`: paint, `style.cssText`) | valores de `--k-*` | MapLibre não lê `var()`. Ler com `getComputedStyle(document.documentElement)` e reler ao trocar de tema. **Nenhum hex escrito à mão.** |
| E-mail (`apps/api/src/lib/mail.ts`) | hex da paleta Kina | Clientes de e-mail não leem variáveis. Usar exatamente os valores do `tokens.css`. |
| `themeColor` em `layout.tsx` | `#F3EEE4` (claro) / `#14120F` (escuro) | Metadado do navegador. |

## 4. Decisões de produto e design

| # | Divergência | Decisão |
| --- | --- | --- |
| D1 | Landing pública | **Não fazer.** A frase “Te vejo na Kina.” entra no login, acima do painel. |
| D2 | Rascunho de rolê | Fora de escopo. |
| D3/D4 | Post sem rolê e sem foto | `Post` só na variante **“sem rolê vinculado”**: sem faixa de fundo, sem “em …”, sem imagem. A grade com `.k-corners` no perfil vale para **Fotos** e **Rolês**. |
| D5 | Música do perfil | Omitir. |
| D6 | Reações com emoji | Manter os 5 emojis do componente `Reactions`. Visual: botão sem fundo, emoji + contagem em `.k-meta`; reação ativa ganha fio inferior 2 px `--k-brand` (não só cor). |
| D7 | Seguir e amizade | Manter os dois. **Seguir** = `Button primary`; **Adicionar amigo / Pedido enviado / Amigos** = `Button secondary`. |
| D8/D9 | Convites e agenda | “Futuro” do feed = rolês `upcoming`. “Sua agenda” = dados do `DefaultRail` atual. Sem seção de convites. |
| D11 | Seletor de tema | **Fazer** em Configurações: Sistema / Claro / Escuro, como ficha com três opções. Compatível com T5. O `ThemeToggle` do cabeçalho continua alternando claro ↔ escuro. |
| D12 | “Cola?” × “Bora” | **Manter “Bora”** (já é a voz do produto e os usuários conhecem). Estados: “Bora” → “Confirmado”; manter “Talvez” e “Não vou”. Atualizar os exemplos do kit mentalmente: onde o plano diz “Cola?”, ler “Bora”. |
| D13 | Ficha de criação do rolê | Usar os campos reais, nesta ordem: Capa (`BannerField`) → Nome (Fraunces) → ficha com **Quando** (data + hora), **Onde** (local + mapa), **Categoria**, **Custo**, **Tags** → Descrição. Sem “Quem” e sem “Trilha” na criação; “Trilha” aparece no detalhe e na edição, onde já existe. |
| D15 | 7 abas no perfil | Manter as 7. No celular, a barra de abas rola na horizontal, com a aba ativa sempre visível. |
| D16 | Busca | Manter todos os grupos atuais. Ordem: Pessoas, Rolês, Lugares, Resenhas, Música, Tags. |
| D17 | Página 404 | **Fazer** `app/not-found.tsx`: “Essa rua não existe.” + botão “Voltar para o início”. Fazer também `app/error.tsx` com o mesmo estilo (“Algo deu errado.” + “Tentar de novo”). |
| D18 | Manifest/PWA | **Não criar** agora. Atualizar favicon, `apple-icon`, `icon.svg`, metadados e `themeColor`. |
| T14 | Variante `danger` do `Button` | **Manter.** Visual: igual ao `secondary`, com texto e borda `--k-danger`. Em diálogo de confirmação destrutiva, versão cheia: fundo `--k-danger`, texto `--k-on-brand`. `ghost` e `outline` passam a se comportar como `text` e `secondary`, sem mudar a API do componente. |

### D19 — Vidro líquido nas telas de entrada (decisão do dono do projeto)

> Nota: o D18 já é Manifest/PWA; esta decisão entra como **D19**.

**Sobrepõe a regra "sem vidro/blur" e "sem sombras" SÓ nesta exceção.** Escopo exato: **vidro permitido apenas no card das telas de entrada (`.k-glass`). Proibido em qualquer outro lugar.**

- "Telas de entrada" = o card de login (e a folha de login do celular, `Sheet`) e, por serem o mesmo card, cadastro, esqueci a senha e redefinir senha. **Atualização:** o botão "Entrar" da splash "Te vejo na Kina." também é vidro (`.k-glass.k-glass--soft`): bem transparente, com tinta de fundo e desfoque fortes que apagam quase por completo a grade e a mira atrás dele, sem refração. Isso abre mão do "botão sódio sólido" nessa tela por decisão do dono; o botão "Entrar" de dentro do card (enviar o formulário) continua sódio sólido.
- Efeito: refração do fundo (mais forte nas bordas), desfoque leve, borda fina e brilho interno na borda de cima. Não é só blur.
- Implementação: classe `.k-glass` em `kina-components.css` (só tokens `--k-*`, raio 2 px) + `GlassFilter` (filtro SVG `#k-glass`, só Chromium; Firefox/Safari caem no desfoque comum).
- **Revisão (Fase 4, login conforme plano 6.2):** o botão "Entrar" da splash volta a ser **sódio sólido** (`.k-glass--soft` removido); o vidro fica só no painel. `.k-entry-scrim` (desfoque + escurecimento do fundo atrás do painel, animado só em `opacity`) é a segunda exceção de blur nesta tela. A varredura da Fase 5 ignora `.k-glass` e `.k-entry-scrim`.
- Acessibilidade: contraste do texto ≥ 4,5:1 nos dois temas (se faltar, subir `--k-glass-tint`); `prefers-reduced-transparency: reduce` → fundo sólido `--k-surface-raised`, sem `backdrop-filter`; o filtro não anima.
- **Fase 5:** `.k-glass` é exceção permitida. A varredura de `backdrop-filter` e `box-shadow` deve ignorá-la (e o `Sheet` com `k-glass`).

### D20 — A Mesa do feed (decisão do dono do projeto)

**Revoga a regra "navegação não muda" SÓ para a lista de posts do feed.**

- O feed deixa de ser lista vertical e vira a **"Mesa"**: fotos espalhadas, estilo exposé. Tocar numa foto a faz crescer até o post; sair do post volta a foto ao lugar com a animação inversa.
- A Mesa é a **única** visão do feed. Sem seletor Lista|Mesa; qualquer resquício de tentativa anterior deve ser removido.
- A mesma Mesa vale para publicações do perfil, fotos e álbuns (índices), sem mudar rotas nem API.
- Stories, faixa "Próximos", cabeçalho, barra inferior e botão "Criar" não mudam.
- Implementação: grade CSS (12 colunas no desktop, 4 no celular, `grid-auto-flow: dense`) com padrão determinístico por índice; transição com View Transitions API, com queda para fade de 160 ms.

### D21 — Álbum e visualizador em carrossel (decisão do dono do projeto)

- Álbum e visualizador de fotos viram **carrossel de UMA foto por vez**. A grade/Mesa continua como índice.

### D22 — Perfil com capa que vira barra (decisão do dono do projeto)

- Perfil com capa que sobe devagar e escurece, e avatar que encolhe para dentro de uma barra fina. Animação guiada pela rolagem, **CSS puro** (`animation-timeline: scroll()`), só `transform` e `opacity`. Sem suporte ou com movimento reduzido: perfil estático e legível.

### D23 — Ficha de faixa e barra de progresso ondulada (decisão do dono do projeto)

- Ficha de faixa / "tocando agora" com barra de progresso **ondulada**, **somente se houver player com progresso real**. Sem isso, só a ficha de faixa com "Ouvir no Spotify".

### D24 — Lista de conversas em acordeão exclusivo (decisão do dono do projeto)

- A lista de conversas do chat é um acordeão exclusivo (`<details name="chat-lista">`): abrir uma linha fecha a outra. Sem requisição nova, sem mudar tempo real.

### D25 — Navegação em barra de áreas e painel (decisão do dono do projeto)

**AMPLIA** a regra de navegação (cabeçalho no desktop, barra inferior no celular) **sem removê-las**.

- O menu do avatar é descentralizado: as áreas do app (Mensagens, Calendário, Música, Estatísticas, Amigos, Mapa, Fotos) saem dele.
- **≥ 1024 px:** barra de áreas sticky logo abaixo do cabeçalho (`<nav aria-label="Áreas">`, 48 px, no mesmo contêiner do cabeçalho). Item ativo = ponto sódio + peso 600 + `aria-current="page"`. Hover "marcador de página" (só ponteiro fino e sem movimento reduzido, só `transform`). O avatar abre o menu de conta: **Perfil, Configurações e Sair**.
- **< 1024 px:** o avatar do cabeçalho é um `<button aria-expanded aria-controls aria-haspopup="true" aria-label="Menu">` que abre um painel em linhas, com dois grupos (ÁREAS e CONTA). Fecha com Esc, clique fora, escolha de linha e mudança de rota; sem trava de foco e sem travar a rolagem.
- A barra inferior do celular (Feed, Explorar, Criar, Rolês, Perfil) continua igual. O "+" continua sendo só o botão "Criar".
- Contador de não lidas em Mensagens só se o dado já existir (hoje o cabeçalho não busca o total de mensagens do chat, então não há contador).

### D26 — Layout largo e alinhado (decisão do dono do projeto)

Hoje o conteúdo ocupa ~45% da largura num monitor largo e o cabeçalho não alinha com ele. **Revoga "grade de 1200 px" e "coluna central de 620 px" do PDF SÓ para telas ≥ 1024 px**; celular e tablet não mudam.

- Tokens de layout (`--k-gutter`, `--k-container`, `--k-rail`, `--k-measure`) e o utilitário `.k-container`: 1440 px (1600 px a partir de 1920 px), coluna direita de 380 px (420 px a partir de 1920 px).
- Cabeçalho, barra de áreas (D25) e conteúdo usam o **mesmo** `.k-container` (mesmas bordas). O logo alinha com a borda esquerda do feed e o avatar com a borda direita da coluna direita.
- Grade ≥ 1024 px: feed fluido + coluna direita fixa (`.k-layout`). Sem barra lateral esquerda e sem colunas novas.
- Blocos de leitura (texto do post, descrição do rolê, comentários, bio) têm `max-width: var(--k-measure)`; mídia (Mesa, capas, fotos, stories) ocupa a largura toda da coluna do feed.
- A coluna direita usa rolagem normal: **sem `position: sticky`**, sem overflow e sem `max-height` próprios.
- D18, D19 e D25 continuam valendo.

### Exceções anteriores que continuam valendo (não remover)

- D20 a D26 não podem ser removidas por varreduras futuras.
- D18 (`.k-glass`) e D19 (`.k-entry-scrim`), apenas na tela de entrada.
- Hex permitidos: `--k-spotify`, valores do MapLibre lidos dos tokens, e-mail HTML e `themeColor`.

---

## 5. Navegação (Fase 3.1)

- **Manter a estrutura atual** em vez de trocar por `NavRail`, porque toda tela depende dela (risco R11).
- **Desktop:** cabeçalho superior mantido, restilizado: logo Kina, abas em texto com sublinhado 2 px (Feed, Explorar, Rolês), “Criar” como ponto sódio, busca como campo da Kina, sino, tema e menu da conta como `Menu`. Coluna direita vira “Sua agenda” no estilo de ficha.
- **Celular:** manter os 5 itens (**Feed, Explorar, Criar, Rolês, Perfil**). Visual da `TabBar` da spec: rótulos sempre visíveis, ativo com ponto sódio + peso 600, “Criar” como ponto central.
- Mapa e Música continuam no menu da conta.

## 6. Mapa (Fase 4.4)

- **Manter os tiles atuais do OpenStreetMap** nesta rodada. Estilizar só marcadores, controles, popups e painéis.
- Rota e halo “você” passam a `--k-accent`; marcador de rolê vira o quadrado sódio com o símbolo; pessoas continuam como foto redonda (pessoas são pontos).
- **Fora do redesign, mas registrar como issue:** o uso de `tile.openstreetmap.org` em produção pode violar a política de uso do OSM. Avaliar provedor vetorial (OpenFreeMap, MapTiler, Protomaps). Quando houver, aplicar o estilo “cidade em papel” do PDF.

## 7. Pré-requisitos antes da Fase 1

- [ ] Commitar ou descartar a alteração pendente em `apps/web/src/features/users/mapPoint.ts`.
- [ ] Corrigir a codificação do `CLAUDE.md` da raiz (T8).
- [ ] Acrescentar `--k-spotify` ao `tokens.css` (seção 3).
- [ ] Marcar a Fase 0 como concluída no `PLANO-IMPLEMENTACAO.md`, com link para este arquivo.
