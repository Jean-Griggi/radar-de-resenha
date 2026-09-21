import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { explore, searchAll } from './search.service.js';

export async function searchRoutes(app: FastifyInstance) {
  app.get('/search', { preHandler: [authenticate] }, async (request) => {
    const { q } = request.query as { q?: string };
    return searchAll(q || '', request.user.sub);
  });

  app.get('/explore', { preHandler: [authenticate] }, async (request) => explore(request.user.sub));
}
