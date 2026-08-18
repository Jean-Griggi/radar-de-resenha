import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { commentSchema, postSchema, reactionSchema } from '../common.schema.js';
import { getCalendar } from '../calendar/calendar.service.js';
import { getStats, getYearReview } from '../stats/stats.service.js';
import {
  addComment,
  createPost,
  deleteComment,
  deleteReaction,
  getFeed,
  setReaction,
  updateComment,
} from '../social/social.service.js';
import { explore, listNotifications, markAllRead, markNotificationRead, searchAll, unreadCount } from './search.service.js';

export async function socialRoutes(app: FastifyInstance) {
  app.get('/feed', { preHandler: [authenticate] }, async (request) => getFeed(request.user.sub));

  app.post('/posts', { preHandler: [authenticate] }, async (request, reply) => {
    const body = postSchema.parse(request.body);
    const id = await createPost(request.user.sub, body.content);
    return reply.status(201).send({ id });
  });

  app.post('/reactions', { preHandler: [authenticate] }, async (request) => {
    const body = reactionSchema.parse(request.body);
    return setReaction(request.user.sub, body);
  });

  app.delete('/reactions/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteReaction(id, request.user.sub);
    return reply.status(204).send();
  });

  app.put('/comments/:id', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = commentSchema.parse(request.body);
    return updateComment(id, request.user.sub, body.content);
  });

  app.delete('/comments/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteComment(id, request.user.sub);
    return reply.status(204).send();
  });

  app.get('/search', { preHandler: [authenticate] }, async (request) => {
    const { q } = request.query as { q?: string };
    return searchAll(q || '', request.user.sub);
  });

  app.get('/explore', { preHandler: [authenticate] }, async (request) => explore(request.user.sub));

  app.get('/calendar', { preHandler: [authenticate] }, async (request) => {
    const { month } = request.query as { month?: string };
    return getCalendar(request.user.sub, month);
  });

  app.get('/stats', { preHandler: [authenticate] }, async (request) => getStats(request.user.sub));
  app.get('/year-review', { preHandler: [authenticate] }, async (request) => {
    const { year } = request.query as { year?: string };
    return getYearReview(request.user.sub, year ? Number(year) : undefined);
  });

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
