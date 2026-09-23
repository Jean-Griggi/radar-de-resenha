---
name: sdd-execute
description: >-
  Executa uma fatia do plano SDD do Resenhômetro, seguindo a spec e o plano,
  sem inventar escopo. Use quando a pessoa disser executa, implementa a fatia,
  sdd-execute, ou a última etapa do fluxo specify → plan → execute.
---

# sdd-execute

Implementa uma fatia. A spec diz o que é verdade. O plano diz qual pedaço é agora. Esta skill faz só esse pedaço.

## Ler, nesta ordem

1. `docs/ai/plano-execucao.md`
2. A spec ligada no topo do plano
3. O plano (`*-plano.md` na mesma pasta)

Se a pessoa não nomear a fatia, pegue a primeira com `- [ ]`. Se nomear, só essa.

Se não existir plano, pare e peça a `sdd-plan`. Se a spec e o plano discordarem, pare e diga a discordância. Não escolha um lado no código.

## Durante

- Siga **O que fazer**, **O que não fazer** e **Como validar** da fatia.
- Não comece a próxima fatia.
- Não traga item de **Fora de escopo** da spec.
- Não reabra arquivo `-pronto`.
- Backend: `apps/api/src/modules/<domínio>/` → routes → service. Web: página fina em `app/`, tela em `features/`.
- Idioma com a equipe: português, direto.
- Não faça deploy. Não zere Supabase.

Marque a fatia `- [~]` ao começar e `- [x]` só depois da validação da própria fatia passar (teste, comando ou o critério escrito). Anote uma linha sob a fatia: data e o que ficou verificável.

## Quando a última fatia fechar

1. Status do plano e da spec: `Status: pronto`.
2. Renomeie os dois arquivos com sufixo `-pronto` antes de `.md` (`foo-plano.md` → `foo-plano-pronto.md`, `foo.md` → `foo-pronto.md`).
3. Atualize o link da spec dentro do plano e a tabela **Pronto** em `docs/README.md`.
4. Coloque no topo de cada um: `> **Pronto.** Não reabrir passo a passo.`

## Encerrar

Diga o que mudou, como a pessoa valida, e a próxima fatia (`Próximo: Fatia N — <nome>.`). Se era a última: `Próximo: nenhum. Plano encerrado.`
