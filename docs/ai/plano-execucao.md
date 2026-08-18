# RESENHÔMETRO — PROMPT MESTRE DE EXECUÇÃO COMPLETA

## LEIA ANTES DE COMEÇAR

Este documento é a especificação oficial para transformar o projeto atual do Resenhômetro em uma aplicação completa.

A execução deve ser **contínua, de ponta a ponta e sem pausas entre fases**.

**NÃO faça apenas planejamento.**
**NÃO entregue somente exemplos.**
**NÃO pare depois de uma fase.**
**NÃO peça autorização para passar para a próxima fase.**
**NÃO pergunte “quer que eu continue?”.**

A tarefa é **implementar o projeto inteiro no repositório**, testar, corrigir os problemas encontrados e continuar automaticamente até concluir tudo que for tecnicamente possível dentro deste documento.

A ordem das fases existe para organização técnica. **Ela não representa checkpoints de aprovação.**

Somente interrompa se existir um **bloqueio técnico real** que impeça a continuação. Nesse caso, informe exatamente:

1. qual é o bloqueio;
2. qual arquivo/serviço está afetado;
3. por que não é possível continuar;
4. qual decisão ou recurso externo é necessário.

Não interrompa apenas porque uma fase terminou.

---

# 1. OBJETIVO DO PRODUTO

O Resenhômetro não deve mais ser tratado como apenas um sistema de cadastro de rolês.

O objetivo é construir uma:

# REDE SOCIAL DE EXPERIÊNCIAS, ROLÊS E MEMÓRIAS

O usuário deve conseguir:

* criar perfil;
* colocar foto de perfil;
* colocar foto de capa;
* criar rolês;
* convidar pessoas;
* confirmar presença;
* informar ausência;
* comentar;
* responder comentários;
* reagir;
* publicar resenhas;
* adicionar fotos;
* adicionar áudios;
* associar músicas;
* conectar Spotify;
* visualizar calendário;
* acompanhar estatísticas;
* descobrir rolês;
* descobrir pessoas;
* seguir pessoas;
* adicionar amigos;
* receber notificações;
* visualizar histórico;
* visualizar retrospectivas;
* acompanhar sua própria vida social.

O produto deve parecer uma **rede social moderna**, não um painel administrativo.

---

# 2. REFERÊNCIAS VISUAIS

Existem duas referências visuais fornecidas pelo humano.

## Referência 1

Utilizar como inspiração para:

* perfil social;
* timeline;
* feed;
* stories/atividade;
* contatos;
* sidebar;
* navegação;
* capa;
* avatar;
* abas;
* sensação de rede social.

## Referência 2

Utilizar como inspiração para:

* dashboard;
* sidebar;
* cards;
* dark mode;
* estatísticas;
* banners;
* destaque visual;
* organização das informações;
* sensação de produto moderno.

## Regra

Não copiar literalmente nenhuma referência.

Criar uma identidade própria do Resenhômetro combinando os pontos fortes das duas.

---

# 3. DIREÇÃO VISUAL

## Tema principal

Dark mode.

## Sensação

* moderno;
* elegante;
* social;
* tecnológico;
* agradável;
* visualmente rico;
* organizado;
* jovem sem parecer infantil.

## Cores

Priorizar:

* preto;
* azul-marinho;
* roxo;
* azul;
* gradientes;
* branco;
* cinza.

Criar uma paleta consistente.

Não usar cores aleatórias.

## Componentes

Utilizar:

* cards;
* bordas arredondadas;
* sombras;
* badges;
* avatares;
* tabs;
* menus;
* modais;
* toasts;
* skeletons;
* gráficos;
* players;
* dropdowns.

## Microinterações

Adicionar de forma moderada:

* hover;
* focus;
* transição;
* abertura de modal;
* troca de abas;
* reação;
* loading;
* toast;
* player.

Não transformar o produto em uma interface cheia de animações desnecessárias.

---

# 4. LAYOUT PRINCIPAL

Criar layout semelhante a:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ TOPBAR                                                              │
├──────────────┬───────────────────────────────────┬──────────────────┤
│              │                                   │                  │
│ SIDEBAR      │        CONTEÚDO PRINCIPAL        │ COLUNA DIREITA   │
│              │                                   │                  │
│              │                                   │                  │
│              │                                   │                  │
└──────────────┴───────────────────────────────────┴──────────────────┘
```

## Sidebar

Itens:

* Início;
* Explorar;
* Rolês;
* Calendário;
* Música;
* Estatísticas;
* Amigos;
* Fotos;
* Perfil.

Parte inferior:

* Configurações;
* Sair.

## Topbar

Incluir:

* busca;
* notificações;
* avatar;
* nome;
* menu do usuário.

## Coluna direita

Usar conforme a tela:

* próximos rolês;
* atividades;
* amigos;
* pessoas online;
* sugestões;
* música atual;
* estatísticas rápidas.

---

# 5. STACK

## Frontend

* Next.js;
* TypeScript;
* Tailwind CSS;
* shadcn/ui quando fizer sentido.

Se shadcn causar atraso ou conflito significativo, utilizar Tailwind e componentes próprios.

## Backend

* Fastify;
* TypeScript;
* JWT.

## Banco

O projeto deve chegar a uma versão realmente funcional e persistente.

Não manter a aplicação final dependente exclusivamente de memória.

Utilizar banco relacional adequado ao projeto quando chegar à implementação de persistência.

PostgreSQL é a opção preferencial.

## Storage

Fotos e áudios precisam de armazenamento persistente.

Utilizar uma solução adequada ao ambiente do projeto.

Não deixar a versão final dependendo de arquivos temporários do processo.

---

# 6. REGRA SOBRE DEPENDÊNCIAS

Não instalar dezenas de packages.

Antes de adicionar uma dependência:

1. verificar se o projeto já possui algo equivalente;
2. usar a solução existente quando possível;
3. adicionar somente o necessário.

Evitar bibliotecas redundantes.

---

# 7. REGRA SOBRE CÓDIGO

Manter código simples e legível.

No backend, preservar o padrão:

```text
routes → service → store/repository
```

Não fazer arquitetura excessivamente complexa.

Não refatorar arquivos sem relação com o projeto.

Não apagar funcionalidades já existentes que continuam necessárias.

---

# 8. ESTRUTURA DO REPOSITÓRIO

Frontend:

```text
apps/web/
```

Backend:

```text
apps/api/
```

Compartilhados:

```text
packages/shared/
```

UI compartilhada, quando realmente fizer sentido:

```text
packages/ui/
```

Não mexer em:

```text
apps/mobile/
apps/desktop/
```

---

# 9. AUTENTICAÇÃO

Manter:

```text
POST /auth/register
POST /auth/login
```

Implementar autenticação completa.

Usuário deve conseguir:

* cadastrar;
* entrar;
* sair;
* manter sessão;
* recuperar informações do próprio usuário;
* editar perfil;
* alterar senha.

JWT deve ser tratado de maneira segura.

Nunca expor:

* JWT secret;
* senha;
* refresh token;
* access token do Spotify.

---

# 10. USUÁRIO E PERFIL

Criar perfil completo.

Campos:

```text
id
name
username
email
passwordHash
avatar
cover
bio
city
createdAt
updatedAt
```

## Página de perfil

```text
/perfil/[username]
```

Estrutura:

```text
CAPA
AVATAR
NOME
@USERNAME
BIO
CIDADE
ESTATÍSTICAS
AÇÕES
ABAS
CONTEÚDO
```

Estatísticas:

* rolês;
* resenhas;
* amigos;
* seguidores;
* seguindo.

Abas:

* Resumo;
* Rolês;
* Resenhas;
* Fotos;
* Áudios;
* Música;
* Estatísticas.

---

# 11. FOTO DE PERFIL E CAPA

Permitir:

* enviar foto;
* visualizar preview;
* substituir;
* remover;
* salvar.

O mesmo vale para a capa.

A experiência deve ser simples e agradável.

---

# 12. FEED SOCIAL

Criar feed principal.

O feed deve exibir atividades como:

* usuário criou rolê;
* usuário publicou resenha;
* usuário confirmou presença;
* usuário adicionou foto;
* usuário adicionou áudio;
* usuário adicionou música;
* usuário ganhou conquista;
* usuário publicou algo.

Exemplo visual:

```text
Quan Ha criou um novo rolê

Sexta-feira no Bar X
19:30
São Paulo

8 pessoas confirmaram

❤️ 24   💬 8   🔥 6
```

---

# 13. COMPOSER

No topo do feed:

```text
O que está acontecendo?
```

Ações:

* criar rolê;
* escrever resenha;
* adicionar foto;
* adicionar áudio;
* adicionar música.

---

# 14. ROLÊS

O rolê é o núcleo do sistema.

Campos:

```text
id
title
description
date
time
location
category
estimatedCost
creatorId
status
createdAt
updatedAt
```

Categorias:

* Festa;
* Bar;
* Restaurante;
* Viagem;
* Show;
* Balada;
* Cinema;
* Encontro;
* Faculdade;
* Trabalho;
* Esporte;
* Outro.

---

# 15. CRIAR ROLÊ

Página:

```text
/roles/new
```

Campos:

* nome;
* descrição;
* data;
* hora;
* local;
* categoria;
* custo estimado;
* tags.

Permitir também associação posterior de:

* foto;
* música;
* participantes.

---

# 16. LISTA DE ROLÊS

Página:

```text
/roles
```

Filtros:

* próximos;
* passados;
* meus;
* participando;
* talvez.

Cards mostram:

* título;
* data;
* local;
* categoria;
* criador;
* participantes;
* status.

---

# 17. DETALHE DO ROLÊ

Página:

```text
/roles/[id]
```

Mostrar:

* título;
* descrição;
* data;
* horário;
* local;
* categoria;
* criador;
* participantes;
* fotos;
* áudios;
* música;
* comentários;
* resenha;
* reações.

---

# 18. EDITAR ROLÊ

Implementar:

```text
PUT/PATCH /roles/:id
```

Somente proprietário/autorizado.

Permitir editar todos os campos relevantes.

---

# 19. EXCLUIR ROLÊ

Implementar:

```text
DELETE /roles/:id
```

Somente proprietário/autorizado.

Exigir confirmação visual.

---

# 20. PRESENÇA

Implementar:

```text
POST /roles/:id/attendance
```

Status:

```text
going
maybe
not_going
```

Mostrar:

```text
8 vão
3 talvez
2 não vão
```

Mostrar participantes.

Não criar presença duplicada para o mesmo usuário/rolê.

---

# 21. AMIZADES

Implementar:

* solicitar amizade;
* aceitar;
* recusar;
* remover.

Modelo:

```text
id
requesterId
receiverId
status
createdAt
```

Status:

```text
pending
accepted
rejected
```

---

# 22. SEGUIR USUÁRIOS

Implementar:

* seguir;
* deixar de seguir;
* seguidores;
* seguindo.

---

# 23. COMENTÁRIOS

Comentários devem funcionar em:

* rolês;
* resenhas;
* publicações.

Implementar:

* criar;
* listar;
* editar;
* excluir;
* responder.

Modelo:

```text
id
authorId
targetType
targetId
parentId
content
createdAt
updatedAt
```

Respostas devem aparecer aninhadas visualmente.

---

# 24. REAÇÕES

Implementar:

* ❤️;
* 😂;
* 😭;
* 🔥;
* 👀.

Usuário pode:

* reagir;
* remover reação;
* alterar reação.

Mostrar contagem.

---

# 25. RESENHAS

A resenha é a memória pós-rolê.

Página:

```text
/reviews/[id]
```

Campos:

```text
id
roleId
authorId
title
content
rating
createdAt
updatedAt
```

---

# 26. AVALIAÇÃO

Permitir nota de:

```text
1 a 5 estrelas
```

Categorias:

* diversão;
* música;
* comida;
* ambiente;
* companhia;
* custo-benefício.

Mostrar média e detalhes.

---

# 27. TAGS

Permitir:

```text
#sexta
#festa
#bar
#viagem
#faculdade
```

Tags devem aparecer nas resenhas.

Preparar estrutura para busca.

---

# 28. FOTOS

Implementar:

* foto de perfil;
* capa;
* fotos de rolê;
* galeria;
* álbum;
* legenda;
* excluir;
* associação com rolê.

Página:

```text
/photos
```

Galeria em grid.

---

# 29. ÁLBUNS

Permitir:

* criar álbum;
* nome;
* descrição;
* capa;
* adicionar fotos;
* remover fotos;
* excluir álbum.

Álbuns podem estar relacionados a um rolê.

---

# 30. ÁUDIOS

Implementar suporte a áudio.

Usuário pode:

* gravar;
* enviar arquivo;
* nomear;
* reproduzir;
* excluir.

Associar áudio a:

* rolê;
* resenha;
* perfil.

Mostrar player:

```text
🎙️ História da noite

▶ ━━━━━━━━━━━ 00:37
```

Limitar duração/tamanho de arquivo de forma razoável.

---

# 31. MÚSICA

Criar página:

```text
/music
```

Integração com Spotify.

Permitir:

* conectar;
* desconectar;
* mostrar conta;
* música atual quando disponível;
* artista;
* álbum;
* capa;
* músicas;
* playlists;
* associar música a rolê;
* abrir música no Spotify.

---

# 32. SPOTIFY

Utilizar OAuth seguro e compatível com o ambiente.

Nunca mandar secret para o browser.

Nunca expor tokens.

Guardar tokens somente no backend/storage seguro.

Implementar as funcionalidades suportadas pela API e pelas políticas atuais do Spotify.

Não assumir que reprodução completa dentro do Resenhômetro está automaticamente autorizada.

Prioridade:

1. conectar conta;
2. metadata;
3. música atual;
4. associação ao rolê;
5. links;
6. playlists;
7. reprodução somente quando legal e tecnicamente suportada.

---

# 33. MINI-PLAYER

Criar player persistente na interface.

Exemplo:

```text
┌────────────────────────────────────────────────────────────┐
│ ▶  Blinding Lights — The Weeknd     ♡    Abrir Spotify   │
└────────────────────────────────────────────────────────────┘
```

Manter visual consistente entre páginas.

---

# 34. CALENDÁRIO

Página:

```text
/calendar
```

Implementar calendário mensal.

Mostrar:

* dias;
* rolês;
* horários;
* status.

Dias com evento devem possuir indicador.

Ao clicar:

```text
22 de agosto

20:00 — Festa
23:30 — Bar
```

Também exibir:

* próximos rolês;
* eventos passados;
* visão por mês.

---

# 35. ESTATÍSTICAS

Página:

```text
/stats
```

Mostrar:

## Resumo

* total de rolês;
* resenhas;
* participações;
* amigos;
* lugares visitados.

## Gráficos

* rolês por mês;
* rolês por categoria;
* rolês por dia da semana;
* horários;
* avaliações;
* lugares;
* pessoas;
* música.

---

# 36. GRÁFICO MENSAL

Exemplo:

```text
Janeiro   ███
Fevereiro █████
Março     ████
Abril     ███████
Maio      █████
Junho     █████████
```

Dados reais da aplicação.

---

# 37. OUTROS GRÁFICOS

Criar:

### Rolês por categoria

### Dias mais ativos

### Horário médio

### Lugares mais visitados

### Pessoas mais presentes

### Média das avaliações

### Músicas/artistas associados

Utilizar gráficos simples e visualmente agradáveis.

---

# 38. RETROSPECTIVA ANUAL

Página:

```text
/year-review
```

Exemplo:

```text
Seu 2026 no Resenhômetro

48 rolês
17 lugares
23 pessoas
29 resenhas

Seu mês mais agitado:
Agosto

Seu gênero favorito:
Indie

Sua música mais associada:
________

Seu parceiro de rolê:
________
```

Criar visual semelhante a uma retrospectiva social.

---

# 39. NOTIFICAÇÕES

Implementar notificações dentro da aplicação.

Tipos:

* comentário;
* resposta;
* reação;
* marcação;
* convite;
* presença;
* amizade;
* novo seguidor.

Página:

```text
/notifications
```

Permitir:

* marcar individualmente como lida;
* marcar todas como lidas.

Não implementar push agora.

---

# 40. CONQUISTAS

Adicionar sistema simples.

Exemplos:

* Primeiro Rolê;
* 10 Rolês;
* 25 Rolês;
* 50 Rolês;
* Primeira Resenha;
* 10 Resenhas;
* Madrugadeiro;
* Explorador;
* Rei do Bar;
* Rolê do Ano.

Mostrar conquistas no perfil.

---

# 41. EXPLORAR

Página:

```text
/explore
```

Seções:

* rolês em destaque;
* pessoas;
* resenhas;
* categorias;
* tags;
* lugares;
* músicas.

Não criar algoritmo complexo.

Ordenação simples é suficiente.

---

# 42. BUSCA

Busca global no topo.

Pesquisar:

* pessoas;
* rolês;
* resenhas;
* tags;
* lugares;
* músicas.

Resultados divididos por categoria.

---

# 43. CONFIGURAÇÕES

Página:

```text
/settings
```

Seções:

## Conta

* nome;
* username;
* email;
* senha.

## Perfil

* avatar;
* capa;
* bio;
* cidade.

## Privacidade

* perfil público;
* seguidores;
* interações.

## Música

* Spotify.

## Sessão

* logout.

---

# 44. ESTADOS DE INTERFACE

Todas as páginas devem possuir:

## Loading

Skeleton ou loading apropriado.

## Empty state

Exemplo:

> Você ainda não tem nenhum rolê.

Botão:

> Criar primeiro rolê

## Erro

Mensagem amigável.

## Sucesso

Toast ou feedback visual.

---

# 45. RESPONSIVIDADE

É um projeto web.

Não criar aplicativo mobile.

Mas o frontend precisa se adaptar a telas menores.

Adaptar:

* sidebar;
* cards;
* coluna direita;
* gráficos;
* calendário;
* feed.

Não criar layout mobile separado.

---

# 46. ACESSIBILIDADE

Implementar:

* labels;
* alt;
* foco;
* teclado;
* contraste;
* semântica básica.

---

# 47. SEGURANÇA

Toda rota protegida deve exigir JWT.

Toda operação deve verificar autorização.

Exemplo:

Um usuário não pode editar/excluir o rolê de outro.

Nunca confiar apenas no frontend.

Nunca expor secrets.

Validar inputs.

Evitar XSS.

Evitar upload de tipos de arquivo não suportados.

Limitar tamanho e duração de mídia.

---

# 48. BANCO DE DADOS

A versão final deve possuir persistência.

Estruturas necessárias:

```text
users
roles
attendances
reviews
comments
reactions
friendships
follows
photos
albums
audios
music
spotify_connections
calendar_events
notifications
achievements
```

Adicionar índices e constraints razoáveis.

Garantir relacionamentos consistentes.

Não duplicar dados desnecessariamente.

---

# 49. STORAGE

Mídias devem usar armazenamento persistente.

Categorias:

```text
avatars
covers
photos
audios
```

Não armazenar arquivos grandes diretamente no banco.

Utilizar URLs/referências.

---

# 50. API

Criar e integrar endpoints necessários.

Principais:

```text
GET /health

POST /auth/register
POST /auth/login
GET /auth/me

GET /users/:username
PUT /users/me

GET /feed

GET /roles
POST /roles
GET /roles/:id
PUT/PATCH /roles/:id
DELETE /roles/:id

POST /roles/:id/attendance
GET /roles/:id/attendance

POST /roles/:id/comments
GET /roles/:id/comments

PUT /comments/:id
DELETE /comments/:id

POST /reviews
GET /reviews/:id
PUT /reviews/:id
DELETE /reviews/:id

GET /reviews/:id/comments
POST /reviews/:id/comments

POST /reactions
DELETE /reactions/:id

POST /friends/requests
GET /friends/requests
PUT /friends/requests/:id
DELETE /friends/:id

POST /users/:id/follow
DELETE /users/:id/follow

GET /calendar
GET /stats
GET /notifications
PUT /notifications/:id/read

GET /search
```

Adicionar endpoints de mídia e Spotify conforme implementação.

---

# 51. CLIENTE HTTP

Criar cliente centralizado.

Base:

```text
NEXT_PUBLIC_API_URL
```

Desenvolvimento:

```text
http://localhost:3333
```

Responsabilidades:

* base URL;
* Authorization;
* tratamento de erros;
* requisições;
* sessão.

Evitar chamadas HTTP espalhadas de maneira inconsistente.

---

# 52. TIPOS COMPARTILHADOS

Sempre que fizer sentido, utilizar:

```text
packages/shared/
```

Compartilhar:

* enums;
* tipos;
* categorias;
* status;
* interfaces.

Evitar duplicar definições entre frontend e backend.

---

# 53. TESTES

Executar testes do projeto.

Criar ou ajustar testes para pontos críticos.

Prioridade:

## Backend

* registro;
* login;
* autorização;
* criação de rolê;
* edição;
* exclusão;
* presença;
* comentário.

## Frontend

* páginas principais;
* formulários;
* navegação;
* estados principais.

---

# 54. TESTE MANUAL

Depois de implementar tudo, executar fluxo completo:

```text
Criar usuário
↓
Login
↓
Editar perfil
↓
Adicionar avatar
↓
Criar rolê
↓
Editar rolê
↓
Adicionar participantes
↓
Confirmar presença
↓
Comentar
↓
Responder
↓
Reagir
↓
Publicar resenha
↓
Avaliar
↓
Adicionar foto
↓
Adicionar áudio
↓
Associar música
↓
Visualizar calendário
↓
Visualizar estatísticas
↓
Visualizar perfil
↓
Visualizar feed
↓
Receber notificação
↓
Visualizar retrospectiva
```

Corrigir erros encontrados.

Não considerar pronto enquanto o fluxo principal estiver quebrado.

---

# 55. PERFORMANCE

Evitar:

* chamadas duplicadas;
* loops desnecessários;
* imagens enormes;
* renderização excessiva;
* consultas repetidas.

Utilizar paginação onde houver volume relevante.

Não criar otimizações complexas antes de serem necessárias.

---

# 56. UX FINAL

O produto deve parecer:

> Uma mistura de rede social, diário de rolês, álbum de memórias, calendário social e dashboard pessoal.

O usuário deve entrar e entender rapidamente:

* o que aconteceu;
* quais são os próximos rolês;
* com quem está conectado;
* qual música está tocando;
* o que seus amigos fizeram;
* como foi seu mês;
* quais memórias possui.

---

# 57. O QUE NÃO FAZER

Não implementar sem solicitação explícita:

* aplicativo mobile;
* aplicativo desktop;
* mapa;
* Leaflet;
* OpenStreetMap;
* chat em tempo real;
* videochamada;
* pagamentos;
* marketplace;
* assinatura;
* sistema avançado de recomendação;
* IA;
* sistema complexo de moderação;
* notificações push;
* funcionalidades completamente fora do conceito do Resenhômetro.

---

# 58. FASES INTERNAS DE EXECUÇÃO

A implementação deve ocorrer internamente nesta ordem:

```text
FASE 1 — UI / DESIGN / LAYOUT
FASE 2 — AUTENTICAÇÃO
FASE 3 — ROLÊS
FASE 4 — SOCIAL
FASE 5 — RESENHAS
FASE 6 — PERFIL / FOTOS / ÁUDIOS
FASE 7 — CALENDÁRIO
FASE 8 — SPOTIFY / MÚSICA
FASE 9 — ESTATÍSTICAS
FASE 10 — NOTIFICAÇÕES / CONQUISTAS / POLIMENTO
FASE 11 — BANCO / STORAGE / PERSISTÊNCIA
FASE 12 — TESTES FINAIS
FASE 13 — DEPLOY
```

**IMPORTANTE:**

Essas fases NÃO são checkpoints.

Não parar entre elas.

Não pedir aprovação.

Executar todas automaticamente.

---

# 59. FASE 1 — UI

Primeiro transformar `apps/web` na nova experiência visual.

Criar:

* layout;
* sidebar;
* topbar;
* feed;
* dashboard;
* perfil;
* cards;
* navegação;
* dark mode;
* componentes.

Depois continuar imediatamente.

---

# 60. FASE 2 — AUTENTICAÇÃO

Implementar e ligar:

* cadastro;
* login;
* logout;
* JWT;
* sessão;
* perfil.

Continuar automaticamente.

---

# 61. FASE 3 — ROLÊS

Implementar:

* criar;
* listar;
* editar;
* excluir;
* detalhe;
* presença.

Continuar automaticamente.

---

# 62. FASE 4 — SOCIAL

Implementar:

* feed;
* comentários;
* respostas;
* reações;
* amigos;
* seguidores;
* busca;
* notificações básicas.

Continuar automaticamente.

---

# 63. FASE 5 — RESENHAS

Implementar:

* resenha;
* notas;
* categorias;
* tags;
* comentários;
* reações.

Continuar automaticamente.

---

# 64. FASE 6 — MÍDIA E PERFIL

Implementar:

* avatar;
* capa;
* fotos;
* álbuns;
* áudios;
* perfil completo.

Continuar automaticamente.

---

# 65. FASE 7 — CALENDÁRIO

Implementar:

* calendário;
* rolês;
* próximos eventos;
* histórico.

Continuar automaticamente.

---

# 66. FASE 8 — SPOTIFY

Implementar:

* OAuth;
* conexão;
* desconexão;
* música atual;
* associação de músicas;
* metadata;
* links;
* mini-player quando permitido.

Continuar automaticamente.

---

# 67. FASE 9 — ESTATÍSTICAS

Implementar:

* gráficos;
* indicadores;
* histórico;
* meses;
* categorias;
* lugares;
* pessoas;
* música;
* retrospectiva.

Continuar automaticamente.

---

# 68. FASE 10 — POLIMENTO

Revisar tudo.

Corrigir:

* bugs;
* loading;
* estados vazios;
* erros;
* layout;
* responsividade;
* acessibilidade;
* permissões;
* validações;
* segurança;
* consistência.

Continuar automaticamente.

---

# 69. FASE 11 — PERSISTÊNCIA

Garantir:

* PostgreSQL;
* migrações;
* storage;
* persistência de usuários;
* rolês;
* comentários;
* resenhas;
* mídia;
* relações;
* notificações;
* estatísticas.

A aplicação final não pode perder todos os dados ao reiniciar.

---

# 70. FASE 12 — TESTES FINAIS

Executar:

* build;
* lint;
* testes;
* testes de API;
* testes manuais;
* fluxo completo.

Corrigir problemas encontrados.

Executar novamente até passar.

---

# 71. FASE 13 — DEPLOY

Somente depois de tudo estar funcionando.

## Front

Vercel ou equivalente.

Root:

```text
apps/web
```

Variável:

```text
NEXT_PUBLIC_API_URL
```

## API

Render, Railway ou equivalente.

Configurar:

```text
API_PORT
JWT_SECRET
DATABASE_URL
STORAGE
SPOTIFY_CLIENT_ID
SPOTIFY_CLIENT_SECRET
SPOTIFY_REDIRECT_URI
```

Utilizar os nomes realmente necessários conforme a implementação final.

## CORS

Liberar somente origens apropriadas.

Produção deve aceitar o domínio real do frontend.

---

# 72. REGRAS DE DEPLOY

Não publicar nada antes do final.

Quando chegar à fase de deploy:

1. preparar;
2. verificar build;
3. configurar variáveis;
4. informar o que precisa ser configurado;
5. publicar somente quando o ambiente estiver disponível e for permitido pelo humano.

Não fazer push ou deploy fora desse contexto.

---

# 73. CRITÉRIO FINAL

A implementação será considerada concluída quando for possível executar:

```text
CADASTRO
↓
LOGIN
↓
PERFIL
↓
AVATAR
↓
CAPA
↓
ROLÊ
↓
PARTICIPAÇÃO
↓
AMIZADE
↓
SEGUIR
↓
FEED
↓
COMENTÁRIO
↓
RESPOSTA
↓
REAÇÃO
↓
RESENHA
↓
NOTA
↓
FOTO
↓
ÁUDIO
↓
MÚSICA
↓
SPOTIFY
↓
CALENDÁRIO
↓
ESTATÍSTICAS
↓
NOTIFICAÇÕES
↓
CONQUISTAS
↓
RETROSPECTIVA
```

Tudo deve estar integrado visualmente e tecnicamente.

---

# 74. REGRA ESPECIAL SOBRE O FRONTEND

O frontend é prioridade visual.

Não criar páginas funcionais porém visualmente genéricas.

Todas as telas principais precisam seguir a identidade visual definida.

O produto final deve parecer uma aplicação real e acabada.

Evitar:

* HTML sem identidade;
* páginas brancas genéricas;
* formulários sem estilização;
* dashboards genéricos;
* botões padrão sem design;
* componentes visualmente inconsistentes.

---

# 75. REGRA ESPECIAL SOBRE O PRODUTO

Sempre considerar esta pergunta durante a implementação:

> “Isso parece uma rede social de rolês e memórias?”

Se a resposta for não, ajustar a interface.

O sistema deve incentivar:

* registrar;
* compartilhar;
* lembrar;
* descobrir;
* interagir.

---

# 76. REGRA ESPECIAL SOBRE O FLUXO

NÃO fazer:

```text
Fase 1
↓
PARAR
↓
Perguntar
```

Fazer:

```text
Fase 1
↓
Fase 2
↓
Fase 3
↓
Fase 4
↓
Fase 5
↓
Fase 6
↓
Fase 7
↓
Fase 8
↓
Fase 9
↓
Fase 10
↓
Fase 11
↓
Fase 12
↓
Fase 13
↓
ENTREGAR
```

---

# 77. REGRA FINAL DE EXECUÇÃO

Ao receber este documento:

**COMECE IMEDIATAMENTE.**

Não perguntar:

* “por onde começo?”;
* “quer que eu faça a Fase 1?”;
* “posso continuar?”;
* “quer banco agora?”;
* “quer Spotify agora?”;
* “quer que eu faça o frontend primeiro?”.

A ordem já está definida.

Executar tudo.

Testar tudo.

Corrigir tudo.

Continuar.

Não parar entre etapas.

Não entregar somente planejamento.

Não simular implementação.

Modificar o código real do projeto.

---

# 78. ENTREGA FINAL

Ao concluir tudo, fornecer somente um resumo objetivo contendo:

```text
RESENHÔMETRO CONCLUÍDO

Frontend:
- ...

Backend:
- ...

Banco:
- ...

Storage:
- ...

Spotify:
- ...

Mídia:
- ...

Social:
- ...

Calendário:
- ...

Estatísticas:
- ...

Testes:
- ...

Deploy:
- ...

Pendências reais:
- ...
```

Somente listar pendências que realmente não puderam ser concluídas.

Não inventar problemas.

Não dizer que algo foi implementado se não foi.

---

# 79. DEFINIÇÃO FINAL DO RESENHÔMETRO

O produto final deve ser uma plataforma onde:

**as pessoas registram os rolês que viveram, as pessoas com quem viveram, as músicas que tocaram, as fotos que tiraram, os áudios que gravaram e as histórias que ficaram.**

O sistema transforma essas experiências em:

* feed;
* perfil;
* calendário;
* estatísticas;
* memórias;
* resenhas;
* música;
* relacionamento social;
* retrospectivas.

O foco é criar uma experiência completa, visualmente agradável e coerente.

**Execute o projeto inteiro de ponta a ponta.**
**Não pare entre fases.**
**Não peça autorização para continuar.**
**Teste e corrija até concluir o máximo possível.**
