import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { commentSchema, reviewSchema, updateReviewSchema } from '../common.schema.js';
import { addComment } from '../social/social.service.js';
import { createReview, deleteReview, getReview, listReviews, updateReview } from './reviews.service.js';

export async function reviewsRoutes(app: FastifyInstance) {
  app.get('/reviews', { preHandler: [authenticate] }, async () => listReviews());

  app.post('/reviews', { preHandler: [authenticate] }, async (request, reply) => {
    const body = reviewSchema.parse(request.body);
    return reply.status(201).send(await createReview(request.user.sub, body));
  });

  app.get('/reviews/:id', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return getReview(id, request.user.sub);
  });

  app.put('/reviews/:id', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return updateReview(id, request.user.sub, updateReviewSchema.parse(request.body));
  });

  app.delete('/reviews/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteReview(id, request.user.sub);
    return reply.status(204).send();
  });

  app.get('/reviews/:id/comments', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const review = await getReview(id, request.user.sub);
    return review.comments;
  });

  app.post('/reviews/:id/comments', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = commentSchema.parse(request.body);
    await addComment(request.user.sub, {
      targetType: 'review',
      targetId: id,
      content: body.content,
      parentId: body.parentId,
    });
    return getReview(id, request.user.sub);
  });
}
