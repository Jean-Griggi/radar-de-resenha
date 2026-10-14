# Kina — Especificação de componentes

Todos os valores vêm de `tokens.css`. Referência viva: `reference/componentes.html` (abra no navegador e alterne o tema).
Convenção: “fio” = borda de 1 px `--k-line`. “Mono” = `.k-meta` (Plex Mono 12 px, caixa alta, +5% de espaçamento).

---

## Logo — `KinaLogo`

| Variante | Conteúdo | Uso |
| --- | --- | --- |
| `full` | Símbolo + wordmark “kina” | Login, landing, topo do app no celular |
| `symbol` | Só o símbolo | `NavRail`, favicon, marcador do mapa, carregamento |
| `compact` | Símbolo + “k” | `NavRail` expandido estreito |

- **Use os SVGs em curvas** de `assets/brand/svg/`: `kina-logo-currentcolor.svg` (full), `kina-simbolo-currentcolor.svg` (symbol) e `kina-wordmark-currentcolor.svg`. Os traços herdam `currentColor` (defina `color: var(--k-text)`) e o ponto usa `var(--k-brand)`, então o logo troca de tema sozinho. Inserir inline (como componente SVG) para o `var()` funcionar; em `<img>`, usar as versões `-claro`/`-escuro`.
- O wordmark já está convertido em curvas (Fraunces 500, SOFT 100, opsz 144): não depende da fonte carregada.
- Espaço entre símbolo e wordmark: `0.28 × font-size`. Altura do símbolo: `1.05 × font-size`.
- Acessível: o container tem `aria-label="Kina"`; partes internas `aria-hidden="true"`.
- Mínimo: `full` ≥ 96 px de largura; abaixo, usar `symbol`.

---

## Button

| Variante | Visual | Uso |
| --- | --- | --- |
| `primary` | Fundo `--k-brand`, texto `--k-on-brand`, Schibsted 600 | **Uma por tela**: a ação principal |
| `secondary` | Fundo transparente, borda 1 px `--k-line-strong`, texto `--k-text` | Ação alternativa |
| `text` | Sem fundo nem borda, sublinhado 1 px que vira 2 px no hover | Ações terciárias, links de ação |
| `create` | Círculo 56 px `--k-brand`, ícone “+” `--k-on-brand` | Só na navegação (“Marcar um rolê”) |

- Altura: 48 px (celular) / 40 px (desktop); `min-width: 44px`; padding horizontal 20 px; raio `--k-radius-control`.
- Ícone opcional à esquerda, 18–20 px, gap 8 px.
- Estados:

| Estado | primary | secondary |
| --- | --- | --- |
| hover | `--k-brand-hover` | fundo `--k-bg-sunken` |
| foco | outline 2 px `--k-focus`, offset 2 px | idem |
| pressionado | `--k-brand-press` + `transform: scale(.98)` (100 ms) | `scale(.98)` |
| carregando | rótulo mantido + 2 pontos animados à direita; largura não muda; `aria-busy="true"` | idem |
| desabilitado | fundo `--k-bg-sunken`, texto `--k-text-subtle`, `cursor: not-allowed`; se houver motivo, texto de ajuda abaixo | borda `--k-line` |

---

## TextField / TextArea / Select

- Rótulo **sempre visível** acima (Schibsted 600, 13–14 px). Placeholder só como exemplo.
- Campo: fundo `--k-bg-sunken`, sem borda lateral, **borda inferior** 1 px `--k-line-strong`; altura 46 px; padding 0 12 px; raio 0.
- Foco: borda inferior 2 px `--k-text` + outline de foco do sistema apenas em `:focus-visible`.
- Erro: borda inferior 2 px `--k-danger` + linha abaixo com ícone “!” em círculo + texto `--k-danger` 13 px, ligada por `aria-describedby`; `aria-invalid="true"`.
- Sucesso (quando houver validação positiva): borda `--k-success` + ícone ✓ + texto.
- Desabilitado: texto `--k-text-subtle`, borda `--k-line`.
- Campo de título de rolê (variação `display`): Fraunces 34 px, sem fundo, borda inferior 2 px `--k-text`, contador `.k-meta` abaixo.

---

## Avatar e AvatarStack

- Círculo (`--k-radius-person`), `object-fit: cover`. Tamanhos: 24, 32, 48, 58 (stories), 72, 80, 96.
- Sem foto: fundo `--k-bg-sunken`, iniciais em Fraunces (40% do tamanho), cor `--k-text`.
- Story não visto: anel 2 px `--k-brand` com 2–3 px de folga; visto: anel `--k-line`.
- `AvatarStack`: sobreposição de 30%, contorno 2 px na cor do fundo, máximo 5 + contador mono (“+7”).
- `alt` com o nome da pessoa; em stacks, o grupo tem `aria-label="12 pessoas confirmadas"`.

---

## Corners (cantoneiras)

- Classe `.k-corners` em qualquer elemento com imagem/memória. Tamanho padrão 12 px, offset 6 px para fora, traço 1,5 px, cor `--k-corner`.
- Variáveis locais para ajuste: `--k-corner-size` (16–22 px em blocos grandes), `--k-corner-offset`.
- Interativo (link/botão ou `data-interactive`): no hover/foco os cantos avançam 4 px (160 ms, `--k-ease-arrive`).
- **Nunca** sobre capas de álbum do Spotify: nesse caso, a moldura fica em um wrapper com folga de 6 px.
- O elemento precisa de espaço ao redor (≥ 8 px) para os cantos não colidirem com vizinhos.

---

## FichaRow / Ficha

- Grade: `[marcador opcional 18px] [rótulo .k-meta 70–90px] [valor 1fr] [chevron opcional]`, padding vertical 14–16 px, fio inferior.
- Valor em Schibsted 15–16 px; datas no valor em Plex Mono.
- Marcador (só na criação de rolê): círculo 12 px — preenchido `--k-brand` quando completo, contorno 1,5 px `--k-line-strong` quando vazio. Transição 160 ms.
- Quando a linha é clicável, toda a linha é o alvo (≥ 44 px de altura) e tem `role="button"` ou é um `<button>`.
- Usada em: ficha do rolê, agenda, configurações, resultados de busca de rolês.

---

## TrackRow (linha de encarte)

- Grade: `[nº mono 22px] [capa 40px] [título + artista 1fr] [duração mono]`, fio inferior; a lista começa com fio superior 1 px `--k-text`.
- Título Schibsted 15 px 500 (faixa tocando/selecionada: 600 + cor `--k-brand-text`); artista 12–13 px `--k-text-muted`.
- Capa: quadrada, raio 0, **sem filtro**. Atribuição Spotify conforme diretrizes.
- Variação `compact` (dentro de Post/Perfil): sem número, capa 40 px, rótulo `.k-meta` “Trilha do rolê” à direita.

---

## Tag

- Ponto 8 px na cor semântica + texto `.k-meta`. **Sem fundo, sem pílula.**
- Cores: `--k-brand` (vai rolar), `--k-text` (já rolou), `--k-success` (confirmado), `--k-warning` (pendente), `--k-danger` (cancelado).

---

## Tabs

- Texto Schibsted 14–15 px; ativa: peso 600 + sublinhado 2 px `--k-text`; inativas: `--k-text-muted`. Fio inferior no container.
- `role="tablist"`, setas esquerda/direita navegam.

---

## Modal / Sheet / Menu

- **Modal (desktop):** `--k-surface-raised`, `.k-corners` (16 px), sem raio, `--k-shadow-overlay` (claro) / sem sombra (escuro); overlay `--k-overlay`. Entrada: opacidade + `translateY(8px)` 240 ms; saída: opacidade 160 ms. Foco preso, `Esc` fecha, foco volta ao gatilho.
- **Sheet (celular):** encosta embaixo, largura total, alça 40×4 px `--k-line-strong`, título em Fraunces 26 px. Arrastar para fechar é opcional.
- **Menu:** `--k-surface-raised`, fio `--k-line`, itens de 44 px, separadores por fio.

---

## Toast

- Inverso: fundo `--k-text`, texto `--k-bg`. Ícone + mensagem + ação opcional (“Desfazer”, sublinhado). Canto inferior (desktop) / acima da `TabBar` (celular). `role="status"`, 4–6 s.

---

## Skeleton, Spinner, EmptyState

- **Skeleton:** fios (1 px `--k-line`) e pontos (`--k-line`) imitando o layout real; pulso de opacidade 1,2 s (estático com movimento reduzido).
- **Spinner:** símbolo da Kina em que o ponto percorre o L (sobe pelo traço vertical, volta) — ciclo 1,2 s; com movimento reduzido, o ponto só pulsa em opacidade. Exibir só após 300 ms de espera.
- **EmptyState:** frase em Fraunces 20–25 px + ação `text` ou `primary`. Exemplos: “Ninguém marcou nada ainda.” · “Nenhuma música por aqui.” · “Essa rua não existe.”

---

## NavRail e TabBar

- **NavRail (≥ 1024 px):** 76 px, fio direito; topo: símbolo 30 px; ícones 24 px com gap 26 px; ativo: ponto 6 px `--k-brand` acima do ícone + opacidade 1 (inativos 0,62); base: `Button create` 48 px. Rótulos em tooltip no hover/foco; expansível a 240 px com rótulos.
- **TabBar (< 768 px):** 84 px + safe area; 5 itens com rótulo 11 px; ativo: ponto 5 px acima + peso 600; centro: `create` 56 px elevado 26 px com anel 6 px da cor do fundo.

---

## Post (publicação) — inclui a versão em camadas

Inspirada na referência enviada (cartão de servidor com avatar vazando e painéis deslocados), traduzida para a linguagem da Kina.

### Anatomia — versão feed (completa)

```
┌──────────────── faixa de fundo: capa do rolê de origem ───────────────┐
│     (deslocada: começa 48px à direita do bloco e passa 24px abaixo)   │
│  ┌─ bloco --k-bg + .k-corners (16px) ─────────────────────────┐      │
│ (●) Nome da pessoa (Fraunces 25–31px)          · HÁ 2 H (mono) │      │
│ avatar  em Nome do rolê (Fraunces itálico 15px, --k-brand-text)│      │
│ vazando                                                         │      │
│     [imagem da publicação, 4:5, raio 0 — se houver]            │      │
│     Legenda em 16px… esmaece após 3 linhas  ver mais            │      │
│     ●●●●● Caio, Bia, Duda e +4 estavam lá (mono)               │      │
│     ─────────────────────────────────────── fio                │      │
│     ♫ Trilha: Laranja Elétrica · Os Postes      ♡ 24  💬 6  ↗   │      │
│  └─────────────────────────────────────────────────────────────┘      │
└───────────────────────────────────────────────────────────────────────┘
```

- **Faixa de fundo:** `background-image` da capa do rolê, `background-size: cover`, raio 0, opacidade 1 (sem filtro), posicionada atrás do bloco: o contêiner do post reserva `padding: 0 96px 32px 0`, e a faixa ocupa de 40% da largura até a borda direita, começando 40 px abaixo do topo e indo até a base (aparece 96 px à direita e 32 px abaixo do bloco). É a camada de profundidade da referência — feita do lugar onde o post aconteceu, não de uma cor decorativa.
- **Bloco:** `--k-bg` (no feed sobre `--k-bg`, usar `--k-surface-raised` para separar), padding 24–32 px, `.k-corners` com 16 px.
- **Avatar:** 72 px (desktop), metade para fora da borda esquerda do bloco (`left: -36px`, alinhado ao nome), contorno 4 px da cor do fundo da página.
- **Cabeçalho:** nome em Fraunces; tempo em `.k-meta` à direita; linha “em *Nome do rolê*” em Fraunces itálico, link para o rolê.
- **Legenda:** máscara de esmaecimento após 3 linhas: `-webkit-mask-image: linear-gradient(#000 60%, transparent)` sobre `max-height: calc(3 * 1.5em)`; botão `text` “ver mais” expande (`aria-expanded`). Contraste da parte legível sempre AA — o esmaecimento só atinge a última linha.
- **Quem estava:** `AvatarStack` 24 px + texto mono. **Substitui as pílulas** da referência; nada de chips coloridos.
- **Rodapé:** fio acima; à esquerda `TrackRow compact` (se o rolê tiver trilha); à direita ações existentes (curtir, comentar, abrir rolê) com ícones de traço 24 px + contagem mono; alvos ≥ 44 px; rótulos acessíveis.

### Variações

| Variação | Diferença |
| --- | --- |
| `feed` | Completa, como acima |
| `compact` | Sem faixa de fundo, sem “quem estava”, legenda 2 linhas — para listas e perfil |
| `sem rolê` | Sem faixa de fundo e sem linha “em …” |
| `celular` | Avatar 56 px sai pela **borda superior** esquerda (`top: -28px; left: 20px`), não pela lateral; faixa de fundo aparece só 16 px abaixo e 8 px à direita do bloco |

### Comportamento
- Hover no bloco (desktop, quando o post inteiro é clicável): cantos fecham 4 px.
- Imagem da publicação com `loading="lazy"`, `width`/`height` declarados, cor de fundo `--k-bg-sunken` enquanto carrega.
- Tudo que a referência tem e o produto não tem (ex.: lista de “features”) **não** é criado: a área de texto mostra só a legenda real.

---

## Ícones

- Traço 1,5 px, cantos retos (`stroke-linecap: square`, `stroke-linejoin: miter`), grade 24 px; tamanhos 16, 20, 24.
- Base sugerida: Phosphor (peso *light*). Ícones próprios: rolê (o símbolo), música e mapa.
- Ícone sozinho sempre tem `aria-label`; ícone com texto tem `aria-hidden="true"`.
