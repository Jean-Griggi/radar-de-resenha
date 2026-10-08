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
  parseSpotifyState,
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

  // O browser volta do Spotify numa navegação normal: leva o cookie de sessão, se o navegador guarda cookie de outro
  // domínio, e não leva nada se ele bloqueia (Safari/iPhone, Brave). O `state` é assinado, de uso único, expira e foi
  // emitido para uma pessoa logada, então ele sozinho identifica quem pediu a conexão. Com sessão, ela precisa ser a
  // mesma do `state`. Em qualquer falha o redirect é sempre para a origem da web já configurada, sem gravar conta.
  app.get('/spotify/callback', async (request, reply) => {
    const { code, state, error } = request.query as { code?: string; state?: string; error?: string };
    // `reason` é um código fixo (a tela tem o texto de cada um): nunca devolve texto vindo de fora para a página.
    const fail = (reason: string) => {
      request.log.warn({ reason }, 'spotify: conexão não concluída');
      return reply.redirect(`${env.WEB_ORIGIN}/music?spotify=error&reason=${reason}`);
    };

    if (error) return fail(error === 'access_denied' ? 'denied' : 'other');

    const userId = (await checkSession(request)) ?? parseSpotifyState(state)?.userId ?? null;
    if (!code || !userId) return fail('state');
    if (!(await consumeSpotifyState(state, userId))) return fail('state');

    try {
      await completeSpotifyAuth(userId, code);
      return reply.redirect(`${env.WEB_ORIGIN}/music?spotify=connected`);
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      if (message.startsWith('Esta conta do Spotify ainda não')) return fail('allowlist');
      return fail(message.startsWith('Falha ao conectar') ? 'token' : 'profile');
    }
  });
}
