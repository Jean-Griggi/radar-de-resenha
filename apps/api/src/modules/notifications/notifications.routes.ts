import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { listNotifications, markAllRead, markNotificationRead, unreadCount } from './notifications.service.js';

export async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications', { preHandler: [authenticate] }, async (request) => listNotifications(request.user.sub));
  app.get('/notifications/unread-count', { preHandler: [authenticate] }, async (request) => ({
    count: await unreadCount(request.user.sub),
  }));
  app.put('/notifications/:id/read', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await markNotificationRead(id, request.user.sub);
    return reply.send({ ok: true });
  });
  app.put('/notifications/read-all', { preHandler: [authenticate] }, async (request, reply) => {
    await markAllRead(request.user.sub);
    return reply.send({ ok: true });
  });
}
