# Documentação do Resenhômetro

Identidade visual no ar: **Redesenha** (Design System v1.0). Fonte: [PDF](front/Redesenha_Design_System_v1.pdf).

Arquivo **sem** `-pronto` está aberto. Arquivo **com** `-pronto` está encerrado — não reabrir passo a passo.

Specs novas não nascem no chat. O fluxo é `sdd-specify` → `sdd-plan` → `sdd-execute` (skills em `.cursor/skills/`).

## Sempre

| Arquivo | Para quê |
| ------- | -------- |
| [README raiz](../README.md) | Visão geral e como rodar |
| [guides/guia-equipe.md](guides/guia-equipe.md) | Onboarding da equipe |
| [ai/plano-execucao.md](ai/plano-execucao.md) | Constituição: estado do produto, para humanos e IAs |

## Pastas

| Pasta | O que entra |
| ----- | ----------- |
| [front/](front/) | Visual, telas, design system |
| [back/](back/) | API, banco, rotas (specs abertas) |
| [stories/](stories/) | Stories |
| [correcao/](correcao/) | Bugs de produção |
| [implementacao/](implementacao/) | Estrutura, segurança, pastas |

Feature que mexe em front e back fica numa pasta só (a da feature), não partida em dois arquivos.

## Pronto

| Arquivo | O que foi |
| ------- | --------- |
| [front/plano-migracao-identidade-visual-pronto.md](front/plano-migracao-identidade-visual-pronto.md) | Identidade Redesenha, etapas 1–14 |
| [stories/plano-stories-pronto.md](stories/plano-stories-pronto.md) | Stories 24h, v1 |
| [correcao/plano-correcao-pronto.md](correcao/plano-correcao-pronto.md) | Bugs de produção, passos 0–9 |
| [correcao/prompts-correcao-pronto.md](correcao/prompts-correcao-pronto.md) | Prompts históricos da correção |
| [implementacao/plano-seguranca-e-estrutura-pronto.md](implementacao/plano-seguranca-e-estrutura-pronto.md) | Cookie, CORS, módulos — passos 0–12 |
| [implementacao/prompts-seguranca-e-estrutura-pronto.md](implementacao/prompts-seguranca-e-estrutura-pronto.md) | Prompts históricos desse plano |

Mobile e desktop existem só como pastas reservadas. Não implementar sem pedido explícito.
