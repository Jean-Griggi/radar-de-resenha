import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate, checkSession } from '../../lib/authenticate.js';
import {
  completeSpotifyAuth,
  consumeSpotifyState,
  disconnectSpotify,
  getPlaylists,
  getSavedTracks,
  getSpotifyAccount,
  issueSpotifyState,
  listMusic,
  searchSpotify,
  spotifyAuthUrl,
} from './music.service.js';

const searchQuerySchema = z.object({ q: z.string().trim().min(2).max(100) });

export async function musicRoutes(app: FastifyInstance) {
  app.get('/music', { preHandler: [authenticate] }, async (request) => listMusic(request.user.sub));

  app.get('/spotify/status', { preHandler: [authenticate] }, async (request) => getSpotifyAccount(request.user.sub));
  app.get('/spotify/playlists', { preHandler: [authenticate] }, async (request) => getPlaylists(request.user.sub));
  app.get('/spotify/tracks', { preHandler: [authenticate] }, async (request) => getSavedTracks(request.user.sub));

  app.get('/spotify/search', { preHandler: [authenticate] }, async (request) => {
    const { q } = searchQuerySchema.parse(request.query);
    return searchSpotify(request.user.sub, q);
  });

  app.get('/spotify/connect', { preHandler: [authenticate] }, async (request) => {
    return { url: spotifyAuthUrl(await issueSpotifyState(request.user.sub)) };
  });

  app.delete('/spotify', { preHandler: [authenticate] }, async (request, reply) => {
    await disconnectSpotify(request.user.sub);
    return reply.send({ ok: true });
  });

  // O browser volta do Spotify com o cookie de sessão: só conclui se for a mesma pessoa que pediu a conexão.
  // Em qualquer falha o redirect é sempre para a origem da web já configurada, sem gravar conta.
  app.get('/spotify/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };
    const fail = () => reply.redirect(`${env.WEB_ORIGIN}/music?spotify=error`);

    const sessionUserId = await checkSession(request);
    if (!code || !sessionUserId) return fail();
    if (!(await consumeSpotifyState(state, sessionUserId))) return fail();

    try {
      await completeSpotifyAuth(sessionUserId, code);
      return reply.redirect(`${env.WEB_ORIGIN}/music?spotify=connected`);
    } catch {
      return fail();
    }
  });
}
