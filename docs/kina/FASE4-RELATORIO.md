# Kina — Relatório da Fase 4

> Branch `redesign/kina`. Este arquivo ainda não existia (as etapas A–E da Fase 4 foram commitadas sem relatório); aqui consta só o que se refere à **tela de entrada conforme o plano 6.2**. As demais etapas da Fase 4 ficam para quem as registrar.

## Entrada conforme o plano 6.2 (`/login`)

Portão: `pnpm lint && pnpm typecheck && pnpm --filter @resenhometro/web build` passou na primeira tentativa.

### O que mudou

| Arquivo | Mudança |
| --- | --- |
| `features/auth/AuthQuina.tsx` (novo) | **Um único SVG** atrás de tudo: grade de quarteirões a 7% (`<pattern>`) e dois fios de 2 px que se cruzam no centro. `pointer-events: none`, `z-index: 0`. |
| `features/auth/AuthGrid.tsx` (removido) | O canvas anterior (blocos que giram com o mouse e onda na troca de tema) saiu, porque o plano pede um único SVG. Está no histórico do git se quiserem de volta. A troca de tema nas telas de conta volta a usar o círculo padrão do `ThemeProvider`. |
| `features/auth/AuthStage.tsx` | Usa `AuthQuina`; título “Te vejo na Kina.” com saída pela esquerda quando o painel abre; rodapé mono “REDE PRIVADA · KINA”. |
| `features/auth/LoginScreen.tsx` | Reescrito: botão sódio no vértice, magnetismo com mola 300/30, painel que cresce do vértice, Esc/Cancelar, erro no campo. Mesma chamada `POST /auth/login`, mesma sessão e mesma navegação. |
| `app/kina-components.css`, `app/globals.css` | Estilos da quina, do painel (`.auth-entry`), do `.k-entry-scrim`, folha inferior no toque, movimento e transparência reduzidos. Saiu `.k-glass--soft` (o botão não é mais vidro). |
| `DECISOES.md` (D19), `CLAUDE.md` (raiz e `docs/kina/`) | Registram: botão “Entrar” da splash é sódio sólido; `.k-entry-scrim` é exceção de blur junto com `.k-glass`. |

Os tokens de movimento (`--k-dur-instant/quick/base/move/scene`, `--k-ease-arrive/leave`) **já existiam** em `kina-tokens.css`; nada foi criado. Nenhuma dependência nova, nenhum hex novo, nenhuma rota/API/validação alterada.

### Comportamento implementado

- **Repouso:** botão sódio “Entrar” (raio 2 px) com o símbolo, no vértice; foco nele ao carregar. Clique no fundo também abre.
- **Magnetismo** (só `(hover: hover) and (pointer: fine)`, sem `prefers-reduced-motion`, sem erro): a menos de 160 px o botão desliza até 8 px e os fios arqueiam na direção do cursor. A mola (rigidez 300, amortecimento 30) é integrada em `requestAnimationFrame`, sem biblioteca; o laço só roda enquanto algo se move e pausa com a aba oculta. O botão usa `translate3d`; os fios usam `scaleX/scaleY` sobre um arco pré-desenhado com `vector-effect: non-scaling-stroke` (o `d` nunca muda).
- **Abrir** (clique, Enter, Espaço): o painel, centrado no vértice, anima `transform: scale(tamanho do botão → 1)` em 520 ms (`--k-dur-scene`, `--k-ease-arrive`, lidos do CSS); o conteúdo entra em fade na segunda metade; o scrim (`.k-entry-scrim`) entra só em `opacity`; o título sai pela esquerda; o foco vai para o e-mail.
- **Painel:** `role="dialog"`, `aria-modal`, `aria-labelledby`, `.k-glass`, cantoneiras nos 4 cantos reais, “Chegou na quina.” e “Entre com seu e-mail.”, rótulos visíveis, foco preso, Esc e “Cancelar” devolvem o foco ao botão. Scroll interno quando a altura não couber, `min-height: 100dvh` no palco, safe-area.
- **Método de entrada real:** e-mail + senha. **Não existe “link de acesso” no código**, então não foi criado nem mostrado; ficam “Esqueci a senha” e “Criar conta”.
- **Erro:** resposta 401 → “Senha incorreta. Tente de novo.” no campo Senha (ícone + texto, `aria-invalid`, `aria-describedby`, borda de 2 px, foco no campo). Outros erros (rede, 429) aparecem como mensagem geral, com o texto da API quando existe. O magnetismo fica desligado enquanto há erro; fechar o painel limpa o erro e a senha.
- **Toque (`pointer: coarse`):** sem magnetismo; o botão afunda a 0,98 no `:active`; o painel abre como folha inferior (`k-sheet-in`, alça, safe-area).
- **Movimento reduzido:** sem magnetismo e sem crescimento; o painel aparece em fade de `--k-dur-base` (160 ms nesse modo). **Transparência reduzida:** painel em `--k-surface-raised` e scrim quase opaco, sem blur.

### Verificado (Chrome 155 headless via DevTools, contra `next start`)

Em 1280×720 e 360×640, tema claro e escuro, em cada combinação:

- foco inicial no botão “Entrar”; botão de tema 44×44; sem scroll horizontal nem vertical no repouso;
- desktop: com o cursor a ~80 px o botão foi para `translate3d(3.4px, 2px)` e os fios para `scaleY(0.25)`/`scaleX(0.43)`; ao sair, voltou a `0`;
- clique abre o painel (`role="dialog"`, foco no “E-mail”, título do repouso com `opacity: 0`); no celular o painel é a folha inferior (360×408, colada na base);
- 401 real da API local: `aria-invalid="true"`, mensagem ligada por `aria-describedby`, foco na senha, borda de 2 px;
- Esc fecha, o diálogo some e o foco volta ao “Entrar”;
- movimento + transparência reduzidos (desktop): `animation-name: k-fade-in`, `backdrop-filter: none`, fundo sólido.

### O que não foi possível confirmar

- **Contraste 4,5:1 sobre o vidro:** conferido só a olho nas capturas (texto escuro sobre painel claro e claro sobre escuro, com o scrim desfocando a grade e os fios). **Não medi razões de contraste.** Por segurança, a tinta do painel subiu de 12% para 35% (`.auth-panel--entry.k-glass`); na folha do celular segue 80%. Se quiserem mais transparência, desçam `--k-glass-tint` e meçam com o axe DevTools.
- **Animação de crescimento:** o capturador headless não pega quadros intermediários; confirmei o estado final e o código (`Element.animate` com `scale`), mas não a sensação dos 520 ms. Vale olhar num navegador de verdade.
- **Refração (filtro SVG) do vidro:** só Chromium, como antes; não avaliei visualmente o efeito em movimento.
- **Magnetismo com mouse real e aba oculta:** testei com eventos de mouse sintéticos; a pausa com a aba oculta está no código (`visibilitychange`), mas não a exercitei.
- **Dispositivo de toque real:** o celular foi emulado (`pointer: coarse`); o `:active` a 0,98 não foi pressionado de fato.
- O botão “Entrar” da splash deixou de ser vidro (D19 anterior) porque o pedido desta rodada manda “botão sódio”; está registrado em `DECISOES.md`.
- O botão de tema e o logo continuam sobre o desfoque do scrim (o logo fica embaçado com o painel aberto); o botão de tema fica acima do scrim de propósito.
