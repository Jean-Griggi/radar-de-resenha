import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { takeUpload } from '../../lib/storage.js';
import { albumSchema } from '../common.schema.js';
import {
  addAudio,
  addPhoto,
  createAlbum,
  deleteAlbum,
  deleteAudio,
  deletePhoto,
  getAlbum,
  listAlbums,
  listAudios,
  listPhotos,
} from './media.service.js';

export async function mediaRoutes(app: FastifyInstance) {
  app.get('/photos', { preHandler: [authenticate] }, async (request) => listPhotos(request.user.sub));
  app.get('/audios', { preHandler: [authenticate] }, async (request) => listAudios(request.user.sub));
  app.get('/albums', { preHandler: [authenticate] }, async (request) => listAlbums(request.user.sub));

  app.post('/albums', { preHandler: [authenticate] }, async (request, reply) => {
    const body = albumSchema.parse(request.body);
    return reply.status(201).send(await createAlbum(request.user.sub, body));
  });

  app.get('/albums/:id', { preHandler: [authenticate] }, async (request) => {
    const { id } = request.params as { id: string };
    return getAlbum(id);
  });

  app.delete('/albums/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteAlbum(id, request.user.sub);
    return reply.status(204).send();
  });

  app.post('/photos', { preHandler: [authenticate] }, async (request, reply) => {
    const saved = await takeUpload(request, 'photo');
    return reply.status(201).send(
      await addPhoto(request.user.sub, {
        url: saved.relative,
        caption: saved.fields.caption,
        albumId: saved.fields.albumId,
        roleId: saved.fields.roleId,
      }),
    );
  });

  app.delete('/photos/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deletePhoto(id, request.user.sub);
    return reply.status(204).send();
  });

  app.post('/audios', { preHandler: [authenticate] }, async (request, reply) => {
    const saved = await takeUpload(request, 'audio');
    const duration = Number(saved.fields.duration ?? 0);
    return reply.status(201).send(
      await addAudio(request.user.sub, {
        url: saved.relative,
        name: saved.fields.name || 'Áudio',
        duration: duration || null,
        roleId: saved.fields.roleId,
        reviewId: saved.fields.reviewId,
      }),
    );
  });

  app.delete('/audios/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteAudio(id, request.user.sub);
    return reply.status(204).send();
  });
}
