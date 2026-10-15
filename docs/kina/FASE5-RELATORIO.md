# Kina — Relatório da Fase 5

> Branch `redesign/kina`. Portão na primeira tentativa: `pnpm lint` (6 tarefas), `pnpm typecheck` (7 tarefas) e `pnpm --filter @resenhometro/web build` (Next compilou e gerou 22 rotas). Nada foi desfeito.
> A conferência foi de código. Não rodei axe nem Lighthouse (G5: sem dependência nova) e não medi contraste no navegador.

## 1. O que a varredura achou e o que mudou

| Item | Achado | Correção |
| --- | --- | --- |
| Hex fora da exceção | `#000` na máscara do texto do post | Máscara com `var(--k-text)`. Paleta continua só em `kina-tokens.css`. `#1DB954` só em `--k-spotify`. `themeColor` em `layout.tsx` mantido. |
| `rounded-*` em não-pessoas | Bolinha `rounded-full` de não lidas no chat | Quadrado de 8 px, sem raio. |
| Pontos da marca | `border-radius: 50%` em Criar, no ponto da aba ativa e no “você” do mapa | **Mantidos.** São o ponto sódio (DECISOES §5) e o ponto “você” (§6). O halo do “você” deixou de ser `box-shadow` e virou `outline`. |
| Pontos que não são gente | Pontos do botão carregando e o marcador da ficha | Quadrado (raio 0) e raio de 2 px. Avatar, presença e esqueleto de pessoa continuam redondos. |
| `box-shadow` fora de overlay | `.glow-btn`, foco do compositor, halo do mapa | Sombra removida. Modal, Sheet e Menu continuam com `--k-shadow-overlay`. |
| Gradiente decorativo | Capa de estatísticas, retrospectiva e barras | Fundo liso `--k-bg-sunken` e barra `--k-brand`. Cantoneiras, grade e scrim de foto ficam: são desenho da linguagem, não lavagem de cor. |
| Vidro fora do login | `.k-glass` em cadastro, esqueci, redefinir e na prop `glass` do `Modal` | Classe e prop removidas. O painel de `/login` (e a folha no toque, o mesmo elemento) e o `.k-entry-scrim` ficam. |
| `text-[10px]` / `text-[11px]` | Nenhum | Nada a mudar. |
| Fraunces abaixo de 20 px | Avatares pequenos já caíam para a fonte de interface. O botão “Entrar” estava em 19 px na fonte de interface | Botão em `--k-fs-20`. Ajuda de campo (`.k-help`) e mensagem de campo (13 px) foram para 14 px. |
| Ícone fora do `lucide-react` | ✕ ▶ ⏸ ♪ em story, feed, rota, música e faixa | Trocados por `X`, `Play`, `Pause`, `Music`. Marca (logo, spinner, fios, filtro de vidro) não é biblioteca de ícone. |
| Aliases antigos | `:root` com `--bg`, `--card`, `--shadow-*`, `--radius-*`, `--primary`, `--accent`… | Bloco apagado. O `@theme` do Tailwind aponta direto para `--k-*`, então `text-muted` e `bg-surface` continuam. |
| Fontes antigas | Plus Jakarta, Inter, Bomb Font | Já não havia uso nem arquivo. Grep depois: zero. |
| Movimento solto | `0.55s` + `cubic-bezier` no tema, `0.18s ease` em links e chips, `1.2s` / `300ms` / `160ms` no CSS | Durações e curvas passaram a `--k-dur-*` e `--k-ease-*`. O laço do spinner usa `calc(var(--k-dur-scene) * 2)`. |
| Animar só `transform` e `opacity` | Transição de cor, `clip-path` do tema, `width` da barra do story, `inset` da cantoneira | Cor muda na hora. Tema entra em fade. Barra do story usa `scaleX`. Cantoneira fecha sem animar. `backdrop-filter` não entra em transição. |
| `prefers-reduced-motion` | Story não lia a preferência. Câmera do mapa animava sempre. O ponto do spinner ainda pulsava | Story sem varredura da barra. Mapa com duração 0. Spinner parado. Login, grade, parallax do perfil e o ícone de tema já respeitavam. |
| `prefers-reduced-transparency` | Já estava em `.k-glass` e `.k-entry-scrim` | Conferido: fundo sólido e `backdrop-filter: none`. |
| Alvo e nome | Botão do Spotify em 36 px; “adicionar story” em 28 px; nomes numa linha com reticências | Alvos em 44 px. Nomes de pessoa e rolê quebram em até duas linhas. Abas já rolam. Safe-area na barra de baixo, no player e no palco de entrada. |
| Vitrine `/kina-vitrine` | Seções já cobrem botão, campo, avatar, cantoneira, tag, card, abas, ficha, faixa, esqueleto, vazio, toast, modal, sheet, menu e marca, com o botão “Alternar tema” | Não criei estado novo: os estados (repouso, hover, press, foco, carregando, desabilitado, erro, vazio) já estavam na página. |

## 2. Grep dos aliases (depois)

Procura em `apps/web/src` por `var(--bg)`, `var(--card)`, `var(--shadow-`, `var(--radius-`, `var(--primary)`, `var(--accent)`, `var(--overlay)`, `var(--paper)`, `var(--muted)`, `var(--surface)` e `var(--background)`: **nenhuma ocorrência**.

Antes, o bloco em `globals.css` (linhas 11–72) definia esses nomes e dezenas de telas ainda liam `var(--primary)`, `var(--accent)`, `var(--overlay)` e `var(--paper)`.

## 3. Decisões conservadoras

1. **Vidro só no painel de login.** O D19 antigo também pintava cadastro, esqueci e redefinir. O pedido desta fase manda tirar `.k-glass` de qualquer outro lugar. Essas três telas ficaram com o painel opaco (`--k-surface-raised`).
2. **Barra do story em `linear` e com a duração da foto (5 s).** Um easing de “chegar” faria a barra mentir o tempo. Não é token de interface; é o relógio do story.
3. **`text-xs` (12 px do Tailwind) ficou** em chat, calendário, fotos, comentários e listas secundárias. Não havia `text-[10px]` nem `text-[11px]`. Trocar todo `text-xs` reflowaria telas que o G4 manda só receber token, sem redesenho.
4. **Sombra de overlay** (modal, folha, menu) ficou. A regra era “fora de overlays”.
5. **Contraste do vidro não foi medido.** A tinta de 35% (80% na folha do celular) continua a da Fase 4.

## 4. Pendente

- axe DevTools nas rotas, nos dois temas (extensão manual; sem `@axe-core/playwright`).
- Contraste 4,5:1 medido sobre o vidro e 3:1 nas bordas.
- Lighthouse mobile (acessibilidade e LCP).
- Olho humano no roteiro `docs/kina/TESTE-FINAL.md` (dois temas, 360 e 1280).
- `text-xs` restante, se o Gabriel quiser o piso de 14 px também nas telas fora do PDF.
