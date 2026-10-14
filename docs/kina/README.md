# Kina Design Kit

Tudo que a IDE (Claude Code e Cursor) precisa para aplicar a identidade visual da Kina ao projeto antes chamado Redesinha.

## 1. Onde colocar cada coisa

| Do kit | Para o repositório | Por quê |
| --- | --- | --- |
| a pasta inteira | `docs/kina/` | Plano, specs, tokens e referências ficam versionados junto do código |
| `CLAUDE.md` | mesclar no `CLAUDE.md` da **raiz** | O Claude Code lê automaticamente em toda sessão |
| `.cursor/rules/kina-design.mdc` | `.cursor/rules/kina-design.mdc` na **raiz** | O Cursor aplica a regra em todo pedido |
| `assets/fonts/*.woff2` | pasta pública (ex.: `public/fonts/`) | Feito pelo agente na Fase 1 |
| `assets/brand/*` | pasta pública / ícones do app | Feito pelo agente na Fase 1 |
| `assets/textures/grain.png` | `public/textures/` | Feito pelo agente na Fase 1 |

Para o Cursor ler as referências, mantenha `docs/kina/` **fora** do `.cursorignore`.

## 2. Ordem de trabalho

1. `git checkout -b redesign/kina`
2. Copiar o kit (passo 1) e fazer um commit só com ele.
3. Abrir `PROMPTS.md` e rodar a **Fase 0** (auditoria). Ler e corrigir o `AUDITORIA.md` gerado.
4. Seguir as fases 1 → 5, um PR por fase (ou por tela na Fase 3), revisando cada diff.

## 3. Referências visuais

- `design/reference/Kina - Plano de design.pdf` — o plano completo com mockups.
- `design/reference/mockups/kina.html` — as mesmas telas em HTML (abrir no navegador).
- `design/reference/componentes.html` — vitrine com o CSS real dos componentes, incluindo a publicação em camadas; tem botão para alternar o tema.

As fotos, pessoas, músicas e capas de álbum das referências são fictícias e ilustrativas. Não usar em produção.

## 4. Licenças

- Fraunces, Schibsted Grotesk e IBM Plex Mono: SIL Open Font License 1.1 (arquivos `LICENSE-*.txt` em `assets/fonts/`). Podem ser auto-hospedadas e distribuídas com o app.
- Símbolo, logotipo e ícones da Kina: criados para este projeto. O wordmark usa a Fraunces como texto vivo; converta em curvas antes de usar fora do app.
- O nome “Kina” ainda precisa de busca de anterioridade (INPI, domínios, lojas de apps) antes do lançamento.
