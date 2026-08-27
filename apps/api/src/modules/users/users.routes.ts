import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { publicUrl } from '../../lib/storage.js';
import { parseJson } from '../../lib/helpers.js';
import {
  cancelFriendRequest,
  followUser,
  listFriendRequests,
  removeFriend,
  requestFriend,
  respondFriend,
  unfollowUser,
} from '../social/social.service.js';
import { friendRequestSchema, respondFriendSchema } from '../common.schema.js';
import { getUserById, getUserByUsername, listFollowers, listFollowing, listFriends, suggestions, userContent } from './users.service.js';

export async function usersRoutes(app: FastifyInstance) {
  app.get('/users/:username', { preHandler: [authenticate] }, async (request) => {
    const { username } = request.params as { username: string };
    return getUserByUsername(username, request.user.sub);
  });

  app.get('/users/:username/content', { preHandler: [authenticate] }, async (request) => {
    const { username } = request.params as { username: string };
    const profile = await getUserByUsername(username, request.user.sub);
    const content = await userContent(profile.id, request.user.sub);
    return {
      ...content,
      photos: content.photos.map((photo) => ({ ...photo, url: publicUrl(photo.url as string) })),
      audios: content.audios.map((audio) => ({ ...audio, url: publicUrl(audio.url as string) })),
      reviews: content.reviews.map((review) => ({
        ...review,
        tags: parseJson(review.tags, []),
        ratings: parseJson(review.ratings, {}),
        author: profile,
      })),
    };
  });

  app.get('/users/:id/followers', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const profile = await getUserById(id, request.user.sub);
    return listFollowers(profile.id);
  });

  app.get('/users/:id/following', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const profile = await getUserById(id, request.user.sub);
    return listFollowing(profile.id);
  });

  app.post('/users/:id/follow', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await followUser(request.user.sub, id);
    return reply.send({ ok: true });
  });

  app.delete('/users/:id/follow', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await unfollowUser(request.user.sub, id);
    return reply.send({ ok: true });
  });

  app.get('/friends', { preHandler: [authenticate] }, async (request) => listFriends(request.user.sub));
  app.get('/friends/requests', { preHandler: [authenticate] }, async (request) => listFriendRequests(request.user.sub));

  app.post('/friends/requests', { preHandler: [authenticate] }, async (request, reply) => {
    const body = friendRequestSchema.parse(request.body);
    const result = await requestFriend(request.user.sub, body.userId);
    return reply.status(result.created ? 201 : 200).send(result.friendship);
  });

  app.put('/friends/requests/:id', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    const body = respondFriendSchema.parse(request.body);
    return respondFriend(id, request.user.sub, body.status);
  });

  app.delete('/friends/requests/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await cancelFriendRequest(id, request.user.sub);
    return reply.status(204).send();
  });

  app.delete('/friends/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await removeFriend(id, request.user.sub);
    return reply.status(204).send();
  });

  app.get('/suggestions', { preHandler: [authenticate] }, async (request) => suggestions(request.user.sub));

  app.get('/people/online', { preHandler: [authenticate] }, async (request) => {
    const friends = await listFriends(request.user.sub);
    return friends.slice(0, 8);
  });
}
