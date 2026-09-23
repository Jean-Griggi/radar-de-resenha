---
name: sdd-plan
description: >-
  Lê a spec SDD já escrita, confere se está fechada e gera o plano de fatias
  para execução. Use quando a pessoa disser Leito, leitor, "lê o SDD",
  "monta o plano", "quebra em fatias" ou a etapa do meio do fluxo
  specify → plan → execute. Não implementa código.
---

# sdd-plan

Lê a spec que a `sdd-specify` gravou e produz o plano executável. Não altera código de app. Não marca a spec como pronta.

## Ler

1. `docs/ai/plano-execucao.md`
2. A spec que a pessoa apontou. Se não apontou, a spec aberta mais recente em `docs/front`, `docs/back`, `docs/stories`, `docs/correcao` ou `docs/implementacao` (arquivo sem `-plano` e sem `-pronto`).
3. Não leia planos `-pronto` para continuar trabalho. Eles estão encerrados.

## Porta

A spec precisa ter Problema, Comportamento, Fora de escopo e Critério de pronto. Contrato se houver API.

Se faltar seção ou o critério não for observável, pare. Liste o que falta e devolva para a `sdd-specify`. Não complete a spec por conta própria e não escreva o plano em cima de buraco.

## Plano

Grave `docs/<mesma-pasta>/<mesmo-slug>-plano.md`.

Regras das fatias:

- Ordem obrigatória. Dependência antes (dados, depois API, depois UI).
- Uma fatia cabe num PR.
- Cada fatia tem o que fazer, o que não fazer e como validar.
- "Como validar" sai do critério de pronto da spec. Inclua o orçamento se a spec tiver.
- "O que não fazer" repete o fora de escopo que essa fatia poderia invadir.
- Arquivos prováveis são pista, não licença para mexer em outro módulo.

## Template

```markdown
# Plano — <título>

Spec: docs/<pasta>/<slug>.md
Status: aberto

## Fatia 1 — <nome>

- [ ] pendente

**O que fazer:**

**O que não fazer:**

**Como validar:**

**Arquivos prováveis:**
```

Repita o bloco por fatia. Status da fatia: `- [ ]` pendente, `- [~]` em andamento, `- [x]` feita.

## Encerrar

Diga o caminho do plano, quantas fatias, e que o próximo passo é a `sdd-execute` na fatia 1. Não execute.
