# CLAUDE.md — trecho da identidade Kina

> Copie este conteúdo para o `CLAUDE.md` na raiz do repositório (ou acrescente ao existente).
> O Claude Code lê esse arquivo automaticamente em toda sessão.

## Contexto
Este produto (antes “Redesinha”) está sendo rebatizado como **Kina** e ganhando uma nova identidade visual.
O plano completo está em `docs/kina/PLANO-IMPLEMENTACAO.md`; os componentes em `docs/kina/design/components-spec.md`;
os tokens em `docs/kina/design/tokens.css`; a referência visual em `docs/kina/design/reference/`.

## Antes de qualquer mudança visual
1. Leia a seção da fase atual em `docs/kina/PLANO-IMPLEMENTACAO.md` e a spec dos componentes envolvidos.
2. Confira `docs/kina/AUDITORIA.md` (criado na Fase 0) para saber o que existe de verdade no código.
3. Proponha um plano curto com a lista de arquivos antes de editar.

## Regras invioláveis
- Redesign é **visual**: não alterar rotas, APIs, contratos de dados, autenticação, validação, estado global ou nomes de campos.
- Não inventar funcionalidades descritas no design que não existem no código. Registrar em `docs/kina/AUDITORIA.md` → “Divergências”.
- Cores, fontes, espaços, raios e durações **somente** via tokens `--k-*` (ou classes `k-*` do preset Tailwind). Nenhum hexadecimal em componentes.
- Nenhuma dependência nova sem justificativa no PR.
- Animar só `transform` e `opacity`; respeitar `prefers-reduced-motion`.
- Acessibilidade: rótulos visíveis, foco visível (`:focus-visible`), contraste AA, alvos ≥ 44 px, estado nunca indicado só por cor.

## Linguagem visual (resumo)
- **Pessoas são pontos:** só avatares, presença e o botão “Criar” são redondos. Todo o resto: raio 0 (superfícies, imagens) ou 2 px (controles).
- **Memória tem moldura, presente não tem:** publicações e rolês passados usam `.k-corners`; stories, convites e rolês futuros não.
- Quatro peças: canto (`.k-corners`), ponto, fio (1 px `--k-line`), ficha (rótulo mono / valor / fio).
- Sem cartões com sombra, sem gradientes decorativos, sem vidro, sem pílulas coloridas.
- Tipografia: Fraunces para nomes de pessoas e rolês e títulos ≥ 20 px (`.k-display`); Schibsted Grotesk para interface; IBM Plex Mono em caixa alta para datas, horas e contagens (`.k-meta`, ex.: `SÁB 18 OUT · 18H`).
- Uma cor de marca: `--k-brand` (sódio), uma ação principal por tela. `--k-accent` (anil) só para links e “você” no mapa.
- Tema escuro não é inversão: use os tokens; nunca escreva `dark:` com valores próprios.
- Fotos de usuários nunca recebem filtro. Capas de álbum do Spotify nunca são recortadas, filtradas ou cobertas.

## Textos de interface
“Cola?” = confirmar presença · “Marcar um rolê” = criar evento · “Ninguém chegou ainda.” = vazio · “Essa rua não existe.” = 404. Erros: diretos, sem piada.

## Ao terminar uma tarefa
- Rodar o projeto, lint e testes existentes.
- Verificar claro e escuro, 390 px e 1280 px, e o fluxo só com teclado.
- Marcar a caixa correspondente em `docs/kina/PLANO-IMPLEMENTACAO.md`.
- Preencher o checklist de PR do plano.

## Decisões revisadas
Decisões revisadas: docs/kina/DECISOES.md (prioridade sobre o plano).
