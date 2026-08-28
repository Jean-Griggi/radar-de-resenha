# Plano — Stories (estilo Instagram)

Feature pedida depois dos bugs de produção. Passos 0–9 de [plano-correcao.md](plano-correcao.md) estão `[x]`.

Escopo: **web + API**. Sem mobile/desktop.

## O que é

Foto ou vídeo curto no topo do feed, some em **24h**, visível só para **amigos aceitos** (+ o autor). Reply vira notificação. Quem viu aparece só para o autor.

## Dados

```
stories (id, author_id, url, media_type photo|video, caption, expires_at, created_at)
story_views (story_id, user_id, viewed_at) PK (story_id, user_id)
```

Upload reusa `/storage/sign` com kind `story` (pasta `stories/`). Foto até 8 tipos de imagem atuais; vídeo `mp4`/`webm`/`mov`, máx. 12 MB e 15 s (checagem no cliente).

## API

| Método | Rota | Quem |
| ------ | ---- | ---- |
| GET | `/stories` | anéis: eu sempre + amigos com story ativo |
| POST | `/stories` | multipart ou signed (caption opcional) |
| DELETE | `/stories/:id` | autor |
| POST | `/stories/:id/view` | amigo; ignora o autor |
| GET | `/stories/:id/viewers` | autor |
| POST | `/stories/:id/reply` | amigo; notifica o autor (`story_reply`, link `/?story=:id`) |

Regras: máx. 20 stories ativos por pessoa. Expirado = 404. Não-amigo = 403. Não entra no feed de eventos.

`GET /stories` devolve `StoryRing[]`: eu primeiro; amigos com não-visto antes; dentro do anel, ordem cronológica.

## UI (home)

1. Barra de círculos no topo do feed (eu com `+` se não tiver story).
2. Anel degradê = não visto; cinza = já visto.
3. Viewer full-screen: barra de progresso, foto ~5 s / vídeo até o fim, tap/setas, hold pausa, Esc fecha.
4. Composer: preview + legenda + publicar.
5. No próprio story: apagar e lista de quem viu. Nos dos amigos: campo de reply.

## Fora de v1

Highlights, música, menções, close friends, stories no perfil público, mobile/desktop.
