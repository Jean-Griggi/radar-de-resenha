import { z } from 'zod';

/** Id do Spotify: só letras e números (base62). Barra, ponto e `spotify:` ficam de fora. */
export const spotifyIdSchema = z.string().regex(/^[A-Za-z0-9]{1,64}$/, 'Id do Spotify inválido');

export const musicKindSchema = z.enum(['track', 'playlist']);

/**
 * Corpo de `POST /roles/:id/music`: só identifica o item. Título, artista, capa e link
 * não são lidos do cliente (o servidor busca no Spotify), e `addedBy` é sempre a sessão.
 */
export const musicSchema = z.object({
  kind: musicKindSchema,
  spotifyId: spotifyIdSchema,
});
