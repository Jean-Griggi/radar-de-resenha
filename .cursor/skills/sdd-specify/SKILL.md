---
name: sdd-specify
description: >-
  Escreve a spec SDD de um problema ou feature do Resenhômetro, sem código e
  sem fatias. Use quando a pessoa descrever um problema, pedir uma spec, um
  SDD, "especifica", "o que vamos fazer" ou a primeira etapa do fluxo
  specify → plan → execute.
---

# sdd-specify

Entende o problema e grava a spec. Não implementa. Não quebra em fatias — isso é a `sdd-plan`.

## Antes de escrever

1. Leia `docs/ai/plano-execucao.md`.
2. Leia `docs/README.md` só para escolher a pasta.
3. Se já existir spec aberta do mesmo assunto, atualize esse arquivo. Não crie outro.

## Pasta

Um assunto, um arquivo. Feature que mexe em front e back fica na pasta da feature.

| Sinais | Pasta |
| ------ | ----- |
| Tela, visual, CSS, componente | `docs/front/` |
| Rota, banco, auth, módulo da API | `docs/back/` |
| Stories | `docs/stories/` |
| Bug em produção, lentidão, regressão | `docs/correcao/` |
| Pastas, segurança transversal, estrutura do repo | `docs/implementacao/` |

Nome: `docs/<pasta>/<slug>.md`. Sem `-pronto`. Sem `-plano`.

## O que a spec contém

Comportamento e contrato. Sem passos de implementação, sem "abra o arquivo X e troque a função Y".

Se faltar quem usa, o que é proibido, como saber que acabou, ou o que a segurança recusa, pergunte só isso. Não invente regra de produto.

Toda spec tem a seção Segurança. Sem ela, a spec não fecha.

Fora de escopo fixo, a menos que a pessoa peça: mobile, desktop, mapa, chat em tempo real, pagamentos, push.

## Template

```markdown
# <título curto>

Status: aberto

## Problema

Quem sofre, o que acontece hoje, por que importa.

## Comportamento

- O que a pessoa vê ou consegue fazer.
- O que é proibido (quem não pode, o que não entra no feed, o que expira).

## Contrato

Rotas, status HTTP, limites e dados. Omita esta seção se não houver API.

## Segurança

O que não vaza, quem não autentica, o que expira e o que a resposta não confirma. Cada item dá para checar sem ler o diff.

## Fora de escopo

## Critério de pronto

Lista observável: tela, status, teste. Cada item dá para checar sem ler o diff.
```

Se houver meta de performance, acrescente:

```markdown
## Orçamento

- Rota ou tela, número (tempo, quantidade, tamanho) e o que não pode piorar.
```

## Encerrar

Diga o caminho do arquivo e que o próximo passo é a skill `sdd-plan` (leitor do SDD). Não chame `sdd-execute`.
