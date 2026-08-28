import type { FastifyInstance } from 'fastify';
import { env } from '../../config/env.js';
import { authenticate } from '../../lib/authenticate.js';
import {
  completeSpotifyAuth,
  createSpotifyState,
  disconnectSpotify,
  getPlaylists,
  getSpotifyAccount,
  listMusic,
  parseSpotifyState,
  spotifyAuthUrl,
} from './music.service.js';

export async function musicRoutes(app: FastifyInstance) {
  app.get('/music', { preHandler: [authenticate] }, async (request) => listMusic(request.user.sub));

  app.get('/spotify/status', { preHandler: [authenticate] }, async (request) => getSpotifyAccount(request.user.sub));
  app.get('/spotify/playlists', { preHandler: [authenticate] }, async (request) => getPlaylists(request.user.sub));

  app.get('/spotify/connect', { preHandler: [authenticate] }, async (request) => {
    return { url: spotifyAuthUrl(createSpotifyState(request.user.sub)) };
  });

  app.delete('/spotify', { preHandler: [authenticate] }, async (request, reply) => {
    await disconnectSpotify(request.user.sub);
    return reply.send({ ok: true });
  });

  app.get('/spotify/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string };
    const userId = parseSpotifyState(state);
    if (!code || !userId) {
      return reply.redirect(`${env.WEB_ORIGIN}/music?spotify=error`);
    }
    try {
      await completeSpotifyAuth(userId, code);
      return reply.redirect(`${env.WEB_ORIGIN}/music?spotify=connected`);
    } catch {
      return reply.redirect(`${env.WEB_ORIGIN}/music?spotify=error`);
    }
  });
}
