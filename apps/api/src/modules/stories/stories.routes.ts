import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { takeUpload } from '../../lib/storage.js';
import { storyReplySchema } from '../common.schema.js';
import {
  createStory,
  deleteStory,
  listStoryRings,
  listStoryViewers,
  markStoryViewed,
  replyToStory,
} from './stories.service.js';

export async function storiesRoutes(app: FastifyInstance) {
  app.get('/stories', { preHandler: [authenticate] }, async (request) => listStoryRings(request.user.sub));

  app.post('/stories', { preHandler: [authenticate] }, async (request, reply) => {
    const saved = await takeUpload(request, 'story');
    return reply.status(201).send(
      await createStory(request.user.sub, {
        url: saved.relative,
        caption: saved.fields.caption,
      }),
    );
  });

  app.delete('/stories/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteStory(id, request.user.sub);
    return reply.status(204).send();
  });

  app.post('/stories/:id/view', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return markStoryViewed(id, request.user.sub);
  });

  app.get('/stories/:id/viewers', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return listStoryViewers(id, request.user.sub);
  });

  app.post('/stories/:id/reply', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = storyReplySchema.parse(request.body);
    return replyToStory(id, request.user.sub, body.content);
  });
}
