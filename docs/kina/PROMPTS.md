# Kina — Prompts prontos para a IDE

Cole um prompt por vez. Espere a fase terminar, revise o diff, faça o commit e só então siga para a próxima.
Sugestão de divisão: **Claude Code** para tarefas amplas (auditoria, fundação, refatorações em vários arquivos);
**Cursor** para ajustes tela a tela com o arquivo aberto e revisão visual rápida.

Antes do primeiro prompt: crie uma branch (`git checkout -b redesign/kina`) e confirme que o projeto roda.

---

## Fase 0 — Auditoria

### Claude Code (use o modo de planejamento: Shift+Tab até "plan mode")
```
Leia docs/kina/PLANO-IMPLEMENTACAO.md (seções 0, 1 e "Fase 0").
Faça a auditoria completa do repositório descrita na Fase 0 SEM alterar nenhum arquivo de código.
Crie apenas docs/kina/AUDITORIA.md seguindo o modelo indicado no plano.
Na seção "Divergências", liste tudo que o plano de design supõe e que não existe no código
(ex.: rascunho de rolê, vínculo publicação↔rolê, música no perfil, landing pública, "Seguir").
Termine com uma lista de ajustes recomendados para as Fases 1 a 4.
```

### Cursor (alternativa, no modo Agent)
```
@docs/kina/PLANO-IMPLEMENTACAO.md
Execute somente a Fase 0. Não edite código. Gere docs/kina/AUDITORIA.md com o inventário pedido.
```

---

## Fase 1 — Fundação

```
Leia docs/kina/PLANO-IMPLEMENTACAO.md (Fase 1), docs/kina/AUDITORIA.md e docs/kina/design/tokens.css.
Implemente a Fase 1:
- fontes de docs/kina/assets/fonts na pasta pública e preload das duas críticas;
- importar tokens.css no estilo global (ou integrar ao Tailwind conforme a auditoria);
- data-theme no <html> sem flash, reaproveitando a persistência de tema que já existe;
- trocar "Redesinha" por "Kina" em títulos, meta tags, manifest e textos;
- favicon e ícones a partir de docs/kina/assets/brand;
- componente KinaLogo conforme components-spec.md.
Não mude componentes de tela ainda. Mostre o plano e a lista de arquivos antes de editar.
Ao final, rode o projeto e liste o que verificar manualmente.
```

---

## Fase 2 — Componentes e vitrine

```
Leia docs/kina/design/components-spec.md e abra docs/kina/design/reference/componentes.html como referência de CSS.
Implemente a Fase 2 do plano: crie/adapte Button, TextField, Avatar, AvatarStack, Corners, FichaRow, TrackRow,
Tag, Tabs, Modal, Sheet, Menu, Toast, Skeleton, Spinner, EmptyState, NavRail, TabBar e KinaLogo.
Crie a rota de vitrine /__kina só em desenvolvimento, mostrando cada componente em todos os estados, nos dois temas.
Ao substituir componentes antigos, mantenha exatamente as mesmas props de comportamento.
Faça em etapas: primeiro Button, TextField e Avatar; pare e me mostre a vitrine antes de continuar.
```

---

## Fase 3 — Telas prioritárias (um prompt por tela)

### Shell de navegação
```
Implemente a seção 3.1 do plano (NavRail no desktop, TabBar no celular). Mantenha todas as rotas.
Referência: páginas 15 e 16 do PDF e as telas de início em docs/kina/design/reference/mockups/kina.html.
```

### Login
```
Implemente a seção 3.2 do plano (Login "Chegar na quina") usando o método de login real registrado em AUDITORIA.md.
Não altere a lógica de autenticação, só a apresentação. O magnetismo deve usar requestAnimationFrame e transform,
ficar desligado em toque, em prefers-reduced-motion e enquanto houver erro.
Referência: página 12 do PDF. Teste o fluxo completo só com teclado.
```

### Perfil
```
Implemente a seção 3.4 do plano (perfil de outra pessoa) no arquivo de perfil indicado na auditoria.
Mostre só abas e informações que já existem. Referência: páginas 13 e 14 do PDF.
```

### Criar rolê
```
Implemente a seção 3.5 do plano. A criação vira uma "ficha" com as linhas Quando, Onde, Quem e Trilha
(só as que existirem). Mantenha os mesmos campos, nomes e validação. No celular, cada linha abre um Sheet
com o seletor que já existe. Referência: página 17 do PDF.
```

### Ver rolê
```
Implemente a seção 3.6 do plano (página do rolê), diferenciando rolê futuro (sem moldura) e passado (com .k-corners).
Referência: página 18 do PDF.
```

### Início
```
Implemente a seção 3.7 do plano (feed em três tempos: futuro, agora, passado) com a agenda à direita no desktop
e a faixa "Próximos" no celular. Inclua estados vazio, carregando e erro. Referência: páginas 15 e 16 do PDF.
```

### Landing (só se existir rota pública)
```
Implemente a seção 3.3 do plano. Use imagens placeholder em public/kina/landing/ e deixe um TODO
para as fotos licenciadas. As faixas param com prefers-reduced-motion e com a aba oculta.
```

---

## Fase 4 — Complementares

```
Implemente a seção 4.1 do plano: componente Post com as variações feed (em camadas), compact, sem rolê e celular,
exatamente como em components-spec.md § Post. Use a capa do rolê de origem como faixa de fundo apenas se o vínculo
publicação↔rolê existir (ver AUDITORIA.md). Não crie dados que não existem.
```
```
Implemente as seções 4.2 (stories), 4.3 (música e Spotify) e 4.5 (busca, notificações, configurações com seletor
de tema, 404). Capas de álbum nunca recebem filtro ou recorte.
```
```
Implemente a seção 4.4 (mapa) de acordo com o que a biblioteca atual permite (ver AUDITORIA.md).
Se não aceitar estilo customizado, aplique a identidade só em marcadores, controles e painéis.
```

---

## Fase 5 — Refinamento

```
Execute a Fase 5 do plano: rode axe em todas as rotas nos dois temas, corrija violações sérias e críticas,
verifique prefers-reduced-motion, contraste de texto sobre fotos, larguras 360/390/768/1024/1280/1440 e
texto ampliado a 200%. Gere um relatório em docs/kina/QA.md com o que foi corrigido e o que ficou pendente.
```

---

## Prompts de manutenção (para usar a qualquer momento)

**Revisão de conformidade de um arquivo**
```
Revise @<arquivo> contra .cursor/rules/kina-design.mdc e docs/kina/design/components-spec.md.
Liste violações (hexadecimais, raios, sombras, pílulas, fontes, estados sem foco) e corrija só essas.
```

**Caçar resíduos da identidade antiga**
```
Procure no projeto hexadecimais fora de tokens.css, box-shadow, backdrop-filter, gradientes,
border-radius maiores que 2px em elementos que não são pessoas, e a palavra "Redesinha".
Liste por arquivo e proponha as substituições do "Mapa de substituições" do plano.
```
