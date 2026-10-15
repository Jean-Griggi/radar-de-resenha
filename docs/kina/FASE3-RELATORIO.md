# Kina — Relatório da Fase 3 (telas prioritárias)

> Branch `redesign/kina`. Cada etapa passou em `pnpm lint && pnpm typecheck && pnpm --filter @resenhometro/web build`. A F falhou uma vez no lint (`Corners` importado e não usado); tirei o import e rodei de novo. Nenhuma etapa foi desfeita.
> O `web` não tem testes de tela. **Nada foi visto num navegador de verdade**: a lista no fim é para isso.

## 1. O que foi feito

| Etapa | Commit | Conteúdo |
| --- | --- | --- |
| A | `13efa8b` | Cabeçalho e barra do celular restilizados, menu da conta no `Menu`, coluna “Sua agenda” em ficha. Raios 999px e sombras tirados de `.nav-create`, `.theme-toggle-corner` e `.story-ring-unseen` |
| B | `68cdc96` | Login com grade, botão no cruzamento e painel; cadastro, esqueci e redefinir na mesma grade |
| C | `84884c5` | Perfil: capa, bloco de identidade, Seguir / amizade, 7 abas, cantoneiras em Fotos e Rolês |
| D | `2662240` | Criar e editar rolê na ordem capa → nome → ficha → descrição, com o motivo quando o nome falta |
| E | `f10facc` | Ver rolê: capa, ficha, `AvatarStack`, Bora / Talvez / Não vou, mapa e trilha na lateral |
| F | `3c498e6` | Feed em três tempos, post sem rolê vinculado, estados vazio / carregando / erro |

Rotas, chamadas de API, validação dos campos e a ordem Feed → Explorar → Criar → Rolês → Perfil continuam as de antes.

## 2. Decisões que tomei sozinho

1. **“Criar” continua um círculo** (`border-radius: 50%`), porque o DECISOES §5 pede o ponto sódio. Saíram o raio `9999px` e a sombra. O anel de 6 px da barra usa `outline`, não `box-shadow`.
2. **“Te vejo na Kina.”** ficou em 39 px no celular e 49 px no desktop, acima do painel. Os 96 px são da landing, que o D1 mandou não fazer.
3. **Só o login esconde o formulário** atrás do botão. Cadastro, esqueci e redefinir já são o destino: o painel aparece aberto, na mesma grade.
4. **Não criei “Receber link de acesso”.** O login segue e-mail e senha. “Esqueci a senha” e “Criar conta” ficam dentro do painel.
5. **Magnetismo** só com ponteiro fino (`mouse`/`pen`), sem `prefers-reduced-motion` e sem erro. Desloca no máximo 8 px via `transform`, num `requestAnimationFrame`, com transição de 240 ms. Toque (`pointer: coarse` ou `touch`) abre o `Sheet`.
6. **A agenda não apagou sugestões nem o chat.** A ficha “Sua agenda” é a lista de próximos; sugestões e mensagens continuam abaixo, com as mesmas chamadas.
7. **No perfil, Seguir é o único botão primário.** Amizade (incluindo Aceitar) e Mensagem ficaram `secondary`. Os textos e as chamadas são os de antes. A música do perfil não entrou (D5). As 7 abas continuam no `Tabs` da Fase 2.
8. **Parallax da capa** move a imagem a 40% do scroll (`transform`), desligado com movimento reduzido. Sem capa: fundo rebaixado, grade e iniciais a 6% de opacidade.
9. **Criar rolê não ganhou campo obrigatório novo.** O botão “Publicar” só trava quando o nome tem menos de 3 caracteres (a regra que o `minLength` já tinha) e escreve o motivo. Data, local, categoria, custo e tags seguem opcionais. Editar continua “Salvar” e só exige nome. Os seletores ficaram na própria linha, sem `Sheet`, para o teclado e a validação não mudarem.
10. **No detalhe, cantoneira só com `status === 'past'`.** A trilha da lateral segue o `MusicCard`, porque ele toca a faixa; o `TrackRow` não toca e a atribuição do Spotify é da Fase 4.3. Não fiz a animação “vira memória” (o plano marca como opcional).
11. **No feed, “futuro” é qualquer item cujo rolê está `upcoming`.** O resto vai para o passado. Post (`post_created`) não tem faixa, não tem “em …” e não tem imagem. Os outros eventos do passado ganham `.k-corners`. A faixa “Próximos” no celular usa o mesmo `/calendar` da agenda e some a partir de `xl`, onde a coluna direita já mostra a ficha.

## 3. O que ficou de fora ou pendente

- **`NavRail`**: não feito, por DECISOES §5. Mapa e Música continuam no menu da conta.
- **Landing pública** (plano 3.3): não feita (D1).
- **Telas fora desta fase** (chat, busca, mapa, música, configurações, 404): continuam com o layout antigo e os tokens novos. Fase 4.
- **Sombra** ainda existe em `.composer:focus-within` e `.glow-btn` no `globals.css`, e em Modal/Menu (`--k-shadow-overlay`, previsto na spec do modal). O compositor do feed deixou de usar a classe `.composer`.
- **Atalho “Marcar um rolê”** na agenda aponta para `/roles/new`, a mesma rota do Criar. Não é uma função nova.
- O portão não abre o navegador. Login magnético, `Sheet` no toque, parallax e a faixa “Próximos” precisam do roteiro abaixo.

## 4. O que olhar no navegador (em ordem de risco)

Suba com `pnpm dev` na raiz (web em `http://localhost:3000`). Olhe nos dois temas, em 390 px e em 1280 px.

1. `http://localhost:3000/login`: no repouso, só o botão “Entrar” no cruzamento, com foco. Com mouse, ele anda até 8 px e volta. Clique ou Enter abre o painel (e-mail e senha, “Esqueci a senha”, “Criar conta”). Senha errada mostra ícone e borda vermelha e o botão, se voltar, não segue o cursor. No celular, o mesmo toque abre a folha de baixo. Com “reduzir movimento” no sistema, o painel só aparece em fade.
2. `http://localhost:3000/cadastro`, `/esqueci-senha` e `/redefinir-senha`: mesma grade e o mesmo painel, com os campos de antes já visíveis. Criar conta, pedir link e salvar senha têm de funcionar como antes.
3. `http://localhost:3000/roles/new`: capa, nome em serifa, ficha (Quando, Onde, Categoria, Custo, Tags) e descrição. Sem 3 caracteres no nome, “Publicar” fica desabilitado e diz o motivo. Com o nome ok, publica mesmo sem data. Repita em `/roles/<id>/editar` (o botão continua “Salvar”).
4. `http://localhost:3000/roles/<id>`: rolê futuro sem moldura na capa; rolê passado (`status` past) com cantoneiras. Nome em serifa, ficha em duas colunas no desktop, Bora / Talvez / Não vou, mini mapa e trilha na lateral. Confirme que presença, editar, excluir, comentar e colocar música do Spotify seguem iguais.
5. `http://localhost:3000/`: rolês `upcoming` em cima, sem moldura, com o dia grande; stories no meio; o resto embaixo, com cantoneiras, exceto o post de texto. Vazio: “Ninguém marcou nada ainda.” e “Marcar um rolê”. Carregando: esqueletos. Sem rede: a frase de erro. No celular, a faixa “Próximos” aparece debaixo dos stories e some no desktop largo.
6. `http://localhost:3000/perfil/<username>`: capa alta, bloco de identidade no canto com cantoneiras, avatar saindo do bloco, nome em serifa. Seguir é o botão cheio; adicionar amigo / pedido / amigos é o contorno. As 7 abas rolam no celular. Fotos e Rolês têm cantoneiras. Sem capa, aparecem as iniciais fracas na grade.
7. Qualquer tela logada no desktop: cabeçalho com Feed, Explorar, Rolês (sublinhado na ativa), ponto “Criar”, busca, tema, sino e menu da conta (Perfil, Mensagens, Calendário, Música, Estatísticas, Amigos, Mapa, Fotos, Configurações, Sair). No celular, os cinco itens de baixo, com ponto sódio no ativo e “Criar” no centro.
8. Coluna direita no desktop (a partir de 1280 px): “Sua agenda” em ficha, com data em mono e o nome do rolê. Sugestões e o chat continuam abaixo. Seguir uma sugestão tem de sumir com a pessoa da lista, como antes.

## 5. Correção visual do login (desktop, tema escuro)

**Causa-raiz:** `.k-corners { position: relative }` (em `kina-tokens.css`, fora de `@layer`) vencia o `position: fixed` de `.auth-panel--quina` (em `@layer components`). O painel perdia o centro fixo e ficava colado no topo, com a parte de baixo fora da tela. As cantoneiras também ficavam 6 px para fora do painel.

**O que mudou:** `.auth-stage` virou flex centrado (`min-height: 100dvh`, padding de respiro, a página rola se a altura não couber) e `isolation: isolate`. Grade e fios ficam em `z-index: 0` e `pointer-events: none`, atrás do conteúdo (z 2). Painel no fluxo, com `--k-corner-offset: 0` para as cantoneiras encostarem nos cantos. Botão de tema com 44×44, raio 2 px, `aria-label="Alternar tema"` e borda em hover/foco. O botão “Entrar” não recebe mais foco programático na montagem (o anel só aparece por teclado). Respiro entre frase e botão agora usa `--k-space-8`.

**Para você decidir (item 8):** a tela de login com só o título “Te vejo na Kina.” e o botão “Entrar” **tem base** no mockup (`kina.html`, seção 6.2 “Chegar na quina”: grade, fios em cruz, botão no cruzamento) e no D1/AUDITORIA 3.2. Não removi nada. A mira (fios em cruz) é decoração de fundo no mockup, por isso foi mantida atrás do conteúdo. A frase grande sobre o botão vem da landing (6.1), que o D1 mandou não fazer; ela está no login por decisão registrada no item 2 da seção 2 acima.

## 6. Vidro líquido no card das telas de entrada (D19)

Decisão do dono do projeto, registrada em `DECISOES.md` (D19; o D18 já era Manifest/PWA). Implementado em `.k-glass` (`kina-components.css`) e `GlassFilter.tsx`, aplicado no card de login, cadastro, esqueci e redefinir senha, e na folha de login do celular (`Sheet glass`). O botão "Entrar" segue sódio sólido.

**Limitações e desvios (o que não foi verificado no navegador):**
- **Nada foi visto num navegador.** O portão (lint do `src`, typecheck, build) passou; a refração e o contraste precisam do olho humano nos dois temas, em 1280×720 e 360×640.
- **Tokens:** o pedido citava `--k-surface` e `--k-ink`, que não existem. Usei `--k-surface-raised` e `--k-text`.
- **Opacidade:** 12% no card (você pediu para baixar mais). Se algum texto perder contraste sobre a mira, suba `--k-glass-tint`.
- **Refração só no Chromium.** Firefox/Safari recebem o desfoque comum. A marca `data-glass-refract` vem de `navigator.userAgentData` (só Chromium) em vez de só `@supports`, porque o Firefox aceita a sintaxe `url()` no `backdrop-filter` mas não renderiza o filtro SVG.
- **Mapa de deslocamento:** versão com `feImage` + dois gradientes (vermelho em X, verde em Y, combinados com `screen`), sem fallback para `feTurbulence`. O sinal (puxa de dentro para fora ou o contrário) e o `scale` de 40 podem pedir ajuste fino olhando.
- **Folha do celular:** atrás dela fica o escurecimento do overlay, que derrubaria o contraste com 12%. Por isso `.k-sheet.k-glass` usa tinta de 80%: é vidro bem mais discreto.
- **Escopo ampliado:** o pedido falava em login e tela inicial. Apliquei também em cadastro/esqueci/redefinir (mesmo card), para as telas de entrada ficarem iguais; é só remover a classe se não quiser.
- A splash em si (só título e botão) não tem card, então não recebeu vidro.
