import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { musicKindSchema, spotifyIdSchema } from '../music/music.schema.js';
import { resolveSpotifyItem } from '../music/music.service.js';
import { commentQuerySchema, commentSchema, createTargetCommentSchema, postSchema, reactionSchema } from './social.schema.js';
import { nestComments } from '../roles/roles.service.js';
import {
  addComment,
  createPost,
  deleteComment,
  deleteReaction,
  getFeed,
  setReaction,
  updateComment,
} from './social.service.js';

export async function socialRoutes(app: FastifyInstance) {
  app.get('/feed', { preHandler: [authenticate] }, async (request) => getFeed(request.user.sub));

  app.post('/posts', { preHandler: [authenticate] }, async (request, reply) => {
    const body = postSchema.parse(request.body);
    // Faixa ou playlist: só o tipo e o id vêm do cliente; título, capa e link o servidor busca no Spotify.
    const music = body.musicId
      ? await resolveSpotifyItem(request.user.sub, musicKindSchema.parse(body.musicKind), spotifyIdSchema.parse(body.musicId))
      : null;
    const id = await createPost(request.user.sub, body.content, music);
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

  app.get('/comments', { preHandler: [authenticate] }, async (request) => {
    const query = commentQuerySchema.parse(request.query);
    return nestComments(query.targetType, query.targetId, request.user.sub);
  });

  app.post('/comments', { preHandler: [authenticate] }, async (request) => {
    const body = createTargetCommentSchema.parse(request.body);
    return addComment(request.user.sub, body);
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
}
