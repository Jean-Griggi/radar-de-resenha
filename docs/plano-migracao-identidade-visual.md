# Plano de execução — identidade visual Redesenha

Documento para executar a migração. Não altera regras de negócio. Escopo: **somente `apps/web`**.

**Fonte da verdade:** [Redesenha_Design_System_v1.pdf](Redesenha_Design_System_v1.pdf) (v1.0, 22 páginas). Em conflito com briefing anterior ou com este plano, **vale o PDF**.

Ordem obrigatória: 1 → 14. Não pular ondas (3) nem tokens (2). Não começar pelo `AppShell`.

## Protocolo de encerramento (obrigatório em toda etapa)

Quem executar (humano ou IA) **não fecha a etapa só no código**. Ao cumprir o critério de conclusão:

1. **Falar a próxima** — na resposta, uma linha no formato: `Próxima: Etapa N — <nome>.` Se for a 14: `Próxima: nenhuma. Migração encerrada.`
2. **Commitar e mandar para produção já** — um commit Conventional Commits só dessa etapa, depois `git push` na branch que publica (hoje: `main` → remoto). Não acumular etapas num commit. Não esperar o fim do plano para subir.

```bash
git add -A
git status
git commit -m "$(cat <<'EOF'
<mensagem da etapa>

EOF
)"
git push origin HEAD
```

Não usar `--no-verify`. Se o hook recusar, corrigir e fazer **outro** commit. Se a etapa não tiver diff, não criar commit vazio — ainda assim anunciar a próxima.

A mensagem de cada etapa está no bloco **Ship** dela e na tabela no final deste arquivo.

---

## Decisões travadas (DS v1.0)

| Item | Decisão |
| --- | --- |
| Logo | Wordmark REDESENHA (Bomb Font) funciona **com ou sem** mascote. Área de proteção = altura do R. Não esticar, não suavizar, não recolorir. |
| Mascote | Gato: no máximo **1 aparição expressiva por viewport**. Usa: vazio, erro, espera, celebração. Não compete com o conteúdo. UI **não** simula HUD de jogo. |
| Nav desktop | **Barra superior fixa** + criar como ação primária (DS p.16). Sidebar tipo Instagram **não** é a spec oficial. |
| Nav mobile | Bottom nav 5: Feed, Explorar, Criar `+`, Rolês, Perfil. Nunca esconder Criar. |
| Feed | Contexto e estado do rolê primeiro; like nunca é protagonista. |
| Fundo | Grain/textura como acento, nunca mural. Ondas em tela cheia (briefing + correção do bug atual). |
| Temas | Dark estrutural (70% neutros) + paper `#F2F0EC` para leitura. Os dois entram. |
| Apps nativos | Fora |

## Tokens oficiais (DS p.8 e p.21)

Não usar mais `#FF6347`, `#660000`, `#0A0A0F`, Inter como fonte principal, nem lima na UI.

```
RED 500     #E53935   ação
RED 800     #9E1B1B   ação escura
GRAPHITE    #2B2B2B
INK 800     #191919   surface
GRAY 500    #5A5A5A
GRAY 200    #D6D6D6   muted em dark
PAPER 50    #F2F0EC   leitura / light
BLACK 950   #0D0D0D   ink / fundo dark
```

Distribuição: 70% neutros · 20% off-white/texto · 10% vermelho.

**Verde dos assets:** referência **legada**. Fora da paleta. Se existir, só `--accent-special` e só feedback comemorativo (DS p.8 e p.21). Anel de story = vermelho, não lima.

**Tipo:** Plus Jakarta Sans na UI (fallback Inter, system-ui). Bomb Font só logo, campanha, números gigantes, títulos muito curtos.

**Espaço:** base 4px; 8/12/16/24/32/48/64. Grid 4 / 8 / 12 col.

**Forma:** radius 8 / 12 / 16 / 20. Sticker: contorno 2px ink + offset 4px. Ícone: traço 2px, caixa 24px, toque 44px.

**Não usar:** violeta/ciano atual · mock amarelo/azul · lima em botão · Bazarus (o DS chama Bomb Font).

## Asset recebido

`ChatGPT_Image_28_de_ago._de_2026__11_14_22-….png` — na prática **JPEG 1024×1024 RGB, fundo preto, sem alpha**.

- Dark: ok (login, header largo).
- Light / favicon / 32px: **não usar cru** (quadrado preto).

## Bloqueios

- [ ] Wordmark bomb REDESENHA em vetor (PDF pede vetorizar; não esticar o raster da prancha)
- [ ] Mascote com fundo transparente (ou versão fundo claro)
- [ ] Arquivo da **Bomb Font** — sem ela, display = Plus Jakarta Sans 700; não inventar Bazarus
- [x] Paleta — resolvida pelo DS (`#E53935` … `#0D0D0D`)

---

## Etapa 1 — Assets no repo

**Objetivo:** marca versionada, sem mudar UI.

**Fazer**
1. Copiar o JPEG do gato para `apps/web/public/brand/mascote.jpg`
2. Se chegar bomb / PNG com alpha: `apps/web/public/brand/wordmark-bomb.png` e `mascote.png`
3. **Plus Jakarta Sans** via `next/font/google` em `apps/web/src/app/layout.tsx` (fallback Inter). Não usar Inter como fonte principal.
4. Bomb Font só se o arquivo existir em `apps/web/public/fonts/` + `@font-face`

**Não fazer:** trocar o texto RESENHÔMETRO ainda.

**Validação:** arquivos abrem no browser; Plus Jakarta Sans carrega no DevTools → Fonts.

**Conclusão:** `public/brand/` existe; Plus Jakarta Sans no projeto.

**Ship:** `chore(web): add brand mascot asset` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 2 — Design tokens.`

---

## Etapa 2 — Design tokens

**Objetivo:** paleta nova nos dois temas. Telas ainda misturam violeta hardcoded — ok nesta etapa.

**Arquivo:** `apps/web/src/app/globals.css`

**Substituir** `:root` / `html[data-theme="dark"]` e `html[data-theme="light"]`.

Usar os nomes do DS e mapear para o que o app já consome (`--bg`, `--accent`, …):

```css
--brand-red: #E53935;
--brand-red-dark: #9E1B1B;
--ink: #0D0D0D;
--surface: #191919;
--graphite: #2B2B2B;
--paper: #F2F0EC;
--gray-500: #5A5A5A;
--gray-200: #D6D6D6;
--space-1: 4px;
--space-2: 8px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--radius-sm: 8px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--focus: 0 0 0 3px #F2F0EC;
```

### Dark
```css
--bg: #0D0D0D;
--bg-elevated: #191919;
--card: color-mix(in srgb, #191919 72%, transparent);
--card-2: #2B2B2B;
--line: rgba(242, 240, 236, 0.12);
--text: #F2F0EC;
--muted: #D6D6D6;
--accent: #E53935;
--accent-2: #9E1B1B;
--header: color-mix(in srgb, #0D0D0D 55%, transparent);
--input: #191919;
--wave-sky-start: #191919;
--wave-sky-end: #0D0D0D;
--wave-1: #0D0D0D;
--wave-2: #191919;
--wave-3: #2B2B2B;
--wave-4: #9E1B1B;
--wave-5: #E53935;
--wave-line: color-mix(in srgb, #E53935 18%, transparent);
--wave-shine: color-mix(in srgb, #E53935 22%, transparent);
--grain-opacity: 0.06;
```

### Light
```css
--bg: #F2F0EC;
--bg-elevated: #FFFFFF;
--card: color-mix(in srgb, #FFFFFF 86%, transparent);
--card-2: #F2F0EC;
--line: rgba(13, 13, 13, 0.10);
--text: #0D0D0D;
--muted: #5A5A5A;
--accent: #E53935;
--accent-2: #9E1B1B;
--header: color-mix(in srgb, #F2F0EC 72%, transparent);
--input: #FFFFFF;
--wave-sky-start: #D6D6D6;
--wave-sky-end: #F2F0EC;
--wave-1: #F2F0EC;
--wave-2: #D6D6D6;
--wave-3: #5A5A5A;
--wave-4: #9E1B1B;
--wave-5: #E53935;
--wave-line: color-mix(in srgb, #9E1B1B 12%, transparent);
--wave-shine: rgba(255, 255, 255, 0.45);
--grain-opacity: 0.04;
```

Não criar `--pin` lima. Sem `--accent-special` até haver aprovação explícita.

**Também:** remover `--pink`. `@theme inline`: `--font-sans` = Plus Jakarta Sans. `.button:focus-visible` conforme DS p.21.

**Validação:** toggle claro/escuro; `globals.css` sem `#8b5cf6` / `#38bdf8`. Páginas ainda violeta = esperado.

**Conclusão:** tokens novos nos dois temas.

**Ship:** `feat(web): replace visual tokens for dark and light` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 3 — Ondas + grain.`

---

## Etapa 3 — Ondas + grain (obrigatória)

**Objetivo:** fundo visível. Hoje o SVG está `fixed -z-10` e o `body` pinta `--bg` sólido por cima.

**Arquivos:** `WaveBackground.tsx`, `globals.css`, `layout.tsx`

**Fazer**
1. `html, body { background: transparent; }` (a cor de fundo passa a ser as ondas)
2. Wrapper das ondas: `fixed inset-0 z-0` (não `-z-10`)
3. `ThemeProvider` / children: `relative z-10`
4. Recolorar via tokens da etapa 2 (já ligado se o SVG usa `var(--wave-*)`)
5. Subir as ondas no `viewBox` (hoje começam em y≈430 — ficam só no rodapé)
6. Grain: overlay CSS `position: fixed; inset: 0; z-[1]; pointer-events: none; opacity: var(--grain-opacity)` com SVG noise ou `filter: url(#noise)` — **sem letras de grafite**
7. Manter `lite` no mobile / `prefers-reduced-motion` (sem filtro pesado)

**Validação**
- Login (tela vazia): ondas óbvias
- Feed: ondas vazam nas laterais e atrás de cards translúcidos
- Mobile e light
- Texto continua legível

**Conclusão:** fundo novo visível nos dois temas.

**Ship:** `fix(web): show wave background above body fill` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 4 — Tipografia.`

---

## Etapa 4 — Tipografia

**Arquivos:** `layout.tsx`, `globals.css`

**Fazer:** `body` = Plus Jakarta Sans. Escala DS: Display 48/52 · H1 36/44 · H2 28/36 · H3 22/30 · Body 16/24 · Small 14/20 · Label 12/16 (pesos 700 / 400). `.font-display` = Bomb Font **só** se o arquivo existir; senão Jakarta 700. Nunca Bomb/display em nav, form, tabela.

**Validação:** Fonts no DevTools; nav continua Jakarta Sans.

**Conclusão:** hierarquia aplicada.

**Ship:** `feat(web): switch interface to Plus Jakarta Sans` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 5 — Primitives.`

---

## Etapa 5 — Primitives

**Arquivos:** `Button.tsx`, `Card.tsx`, `Avatar.tsx`, `MediaImage.tsx`, `globals.css` (`.card`, `.glow-btn`, `input`)

**Fazer**
- Primário / secundário / outline / perigo (DS p.13). Hover + contorno; focus anel 3px; disabled 40%
- `.card`: sticker 2px ink + offset 4px; translúcido para as ondas
- Avatar: sem glow violeta
- `MediaImage` fallback: grain + `--brand-red-dark`
- Radius: `--radius-md` 12px / `--radius-lg` 16px / `--radius-xl` 20px
- Toque mínimo 44px; ícones 24px traço 2px
- Focus: `outline: 2px solid #E53935` + `box-shadow: var(--focus)`

**Validação:** hover / focus / disabled / loading num botão e num input.

**Conclusão:** primitives no visual novo.

**Ship:** `feat(web): restyle primitive components with brand tokens` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 6 — Logo no chrome.`

---

## Etapa 6 — Logo no chrome

**Arquivos:** `AppShell.tsx`, `login/page.tsx`, `cadastro/page.tsx`, `layout.tsx` (favicon)

**Fazer agora (com o que existe)**
- Chrome: wordmark textual “Redesenha” (Jakarta 700 até o bomb vetorizado). **Não** cravar o gato em todo header — DS: no máximo 1 gato expressivo por viewport.
- Login: pode usar o mascote **ou** o wordmark, não os dois gritados. JPEG preto só em fundo dark. Não esticar. `alt="Redesenha"`
- Light: sem JPEG preto; texto + `--brand-red`

**Esperar arquivo**
- Wordmark bomb ao lado ou abaixo do gato
- Light: PNG com alpha; até lá **não** colocar o JPEG preto no header claro (texto “Redesenha” + acento)

**Validação:** nitidez; light sem quadrado preto.

**Conclusão:** marca no chrome dark; light com fallback consciente.

**Ship:** `feat(web): add mascot to chrome` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 7 — AppShell.`

---

## Etapa 7 — AppShell (maior risco) — 1 commit só desta etapa

**Arquivo principal:** `apps/web/src/components/AppShell.tsx`  
**Secundário:** `Player.tsx`

**Desktop (DS p.16 — barra superior, não sidebar Instagram)**
- Barra superior fixa: wordmark, Feed / Explorar / Rolês / Mensagens (se existir) / **Criar +** primário, busca, sino, avatar
- Item atual: cor + indicador
- Centro: feed. Rail direita pode permanecer para sugestões
- Tirar “RESENHÔMETRO”. Nav sem card opaco

**Mobile (DS p.16)**
- Bottom nav 5: Feed · Explorar · Criar `+` · Rolês · Perfil. Nunca esconder Criar
- Demais rotas (música, stats, fotos, amigos, calendário) em Perfil / Mais
- `MiniPlayer` acima da bottom nav
- Drawer hamburger pode sair se a bottom nav cobrir o essencial

**Não mudar:** rotas, auth, cache, player (só posição).

**Validação:** clicar todos os itens de `NAV`; player não cobre CTA; teclado não esconde input atrás da nav; `lg` vs mobile.

**Conclusão:** chrome novo, mesmas URLs.

**Ship:** `feat(web): restructure AppShell to feed layout` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 8 — Feed e stories.`

---

## Etapa 8 — Feed e stories

**Arquivos:** `apps/web/src/app/page.tsx`, `StoriesBar.tsx`, `StoryViewer.tsx`, `Reactions.tsx`

**Fazer**
- Remover o hero `linear-gradient(120deg,#4c1d95,…)`
- Composer + stories + lista, chrome mínimo
- Anel de story não visto: `--brand-red` (não lima). Não depender só de cor
- Ações: Bora / Comentar / Salvar; like não é protagonista (DS p.18)
- Reactions: classes `violet` → tokens

**Validação:** publicar, reagir, abrir story. Features iguais.

**Conclusão:** home no clima novo.

**Ship:** `feat(web): restyle feed and stories` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 9 — Rolês com foto.`

---

## Etapa 9 — Rolês com foto

**Arquivos:** `roles/page.tsx`, `roles/[id]/page.tsx`, `roles/new` (e `novo` se ainda existir)

**Fazer**
- Card: capa + contexto. Ordem DS: 1 data/hora · 2 local · 3 título+capa · 4 quem vai · 5 ações. CTA **Bora**
- Sem foto: fallback `--brand-red-dark` + grain, não violeta
- Badges: Confirmado / Pendente / Lotado / Privado / Hoje (DS p.13)
- Detalhe: fora `#6d28d9` / `#10182c`

**Validação:** com foto, sem foto, cada filtro da lista.

**Conclusão:** rolês visuais, mesma API (`coverPhoto` já existe).

**Ship:** `feat(web): make role cards image-first` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 10 — Resto das telas.`

---

## Etapa 10 — Resto das telas (caçar violeta)

Rodar no repo:

```bash
rg -n "violet|fuchsia|#4c1d95|#6d28d9|#0ea5e9|#10182c|#151d2e|#8b5cf6" apps/web --glob '*.{tsx,css}'
```

**Arquivos típicos:** `perfil/[username]/page.tsx`, `stats/page.tsx`, `calendar/page.tsx`, `year-review/page.tsx`, `Theme.tsx`, `ErrorBoundary.tsx`, `Toast.tsx`, `login`, `cadastro`, `esqueci-senha`, `redefinir-senha`.

**Exceção:** verde Spotify `#1DB954` permanece.

**Validação:** cada rota do grep em dark e light; empty / erro / loading.

**Conclusão:** grep sem violeta de marca.

**Ship:** `fix(web): remove leftover violet hardcodes` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 11 — Responsividade.`

---

## Etapa 11 — Responsividade

**Breakpoints:** 360, 768, 1280, 1536.

**Checar:** ondas, bottom nav, player, stories, cards de rolê, rail some abaixo de `xl`.

**Conclusão:** layout estável nos quatro.

**Ship:** `fix(web): verify identity across breakpoints` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 12 — Acessibilidade.`

---

## Etapa 12 — Acessibilidade

- Texto pequeno **não** vai em `#FF6347` sobre `#0A0A0F` sem peso/tamanho extra — preferir branco + acento só em controle
- `focus-visible` em todos os controles novos
- `prefers-reduced-motion` nas ondas (já há `lite`)
- Grain não pode baixar contraste de parágrafo abaixo de AA
- Anel de story: não depender só de cor (já combinado pin + accent)

**Conclusão:** foco visível; contrastes checados.

**Ship:** `feat(web): tighten identity accessibility` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 13 — Limpeza.`

---

## Etapa 13 — Limpeza

- Remover `--pink`, glow violeta, `from-violet-500`
- `.nav-active` só com `--accent`
- Não expandir `packages/ui` nesta migração (opcional depois)

**Conclusão:** `rg violet` vazio em `apps/web` (exceto comentário, se houver).

**Ship:** `chore(web): remove leftover violet styles` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: Etapa 14 — Documentação.`

---

## Etapa 14 — Documentação (opcional)

Atualizar `docs/README.md` (este plano) e a linha de identidade em `docs/ai/plano-execucao.md` quando o visual estiver no ar.

**Conclusão:** docs apontam para a identidade nova.

**Ship:** `docs: record new visual identity` → `git push origin HEAD`  
**Ao terminar, falar:** `Próxima: nenhuma. Migração encerrada.`

---

## Matriz rápida

| Peça | Visual | Risco | Quando |
| --- | --- | --- | --- |
| Tokens | alto | baixo | etapa 2 |
| Ondas | alto | médio | etapa 3 |
| AppShell | alto | alto | etapa 7 |
| Feed / stories | alto | médio | etapa 8 |
| Cards rolê | alto | médio | etapa 9 |
| Logo | alto | baixo | etapa 6 (parcial) |
| Light | alto | médio | 2 + 3 + 6 |
| Player + bottom nav | médio | alto | etapa 7 |
| Bazarus / bomb | médio | baixo | bloqueado |

## Checklist final

- [ ] Desktop / tablet / mobile
- [ ] Dark e light
- [ ] Ondas visíveis, grain sutil, texto legível
- [ ] Hover, foco, disabled, erro, sucesso, loading
- [ ] Gato no dark; light sem JPEG preto
- [ ] Feed, stories, rolês com/sem capa
- [ ] Nav + player sem overlap
- [ ] Zero violeta de marca
- [ ] Features iguais às de antes

## Commits + produção

Cada etapa = 1 commit + 1 push. Produção sobe no push para `main` (Vercel). Não empilhar etapas.

| Etapa | Mensagem | Depois falar |
| --- | --- | --- |
| 1 | `chore(web): add brand mascot asset` | Próxima: Etapa 2 — Design tokens. |
| 2 | `feat(web): replace visual tokens for dark and light` | Próxima: Etapa 3 — Ondas + grain. |
| 3 | `fix(web): show wave background above body fill` | Próxima: Etapa 4 — Tipografia. |
| 4 | `feat(web): switch interface to Plus Jakarta Sans` | Próxima: Etapa 5 — Primitives. |
| 5 | `feat(web): restyle primitive components with brand tokens` | Próxima: Etapa 6 — Logo no chrome. |
| 6 | `feat(web): add mascot to chrome` | Próxima: Etapa 7 — AppShell. |
| 7 | `feat(web): restructure AppShell to feed layout` | Próxima: Etapa 8 — Feed e stories. |
| 8 | `feat(web): restyle feed and stories` | Próxima: Etapa 9 — Rolês com foto. |
| 9 | `feat(web): make role cards image-first` | Próxima: Etapa 10 — Resto das telas. |
| 10 | `fix(web): remove leftover violet hardcodes` | Próxima: Etapa 11 — Responsividade. |
| 11 | `fix(web): verify identity across breakpoints` | Próxima: Etapa 12 — Acessibilidade. |
| 12 | `feat(web): tighten identity accessibility` | Próxima: Etapa 13 — Limpeza. |
| 13 | `chore(web): remove leftover violet styles` | Próxima: Etapa 14 — Documentação. |
| 14 | `docs: record new visual identity` | Próxima: nenhuma. Migração encerrada. |

Se uma etapa quebrar em produção, reverter **só** aquele commit.
