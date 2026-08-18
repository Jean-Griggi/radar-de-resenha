import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { saveUpload } from '../../lib/storage.js';
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
    const file = await request.file();
    if (!file) return reply.status(400).send({ message: 'Arquivo obrigatório' });
    const saved = await saveUpload(file, 'photo');
    const caption = (file.fields.caption as { value?: string } | undefined)?.value;
    const albumId = (file.fields.albumId as { value?: string } | undefined)?.value;
    const roleId = (file.fields.roleId as { value?: string } | undefined)?.value;
    return reply.status(201).send(await addPhoto(request.user.sub, { url: saved.relative, caption, albumId, roleId }));
  });

  app.delete('/photos/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deletePhoto(id, request.user.sub);
    return reply.status(204).send();
  });

  app.post('/audios', { preHandler: [authenticate] }, async (request, reply) => {
    const file = await request.file();
    if (!file) return reply.status(400).send({ message: 'Arquivo obrigatório' });
    const saved = await saveUpload(file, 'audio');
    const name = (file.fields.name as { value?: string } | undefined)?.value || file.filename || 'Áudio';
    const duration = Number((file.fields.duration as { value?: string } | undefined)?.value ?? 0);
    const roleId = (file.fields.roleId as { value?: string } | undefined)?.value;
    const reviewId = (file.fields.reviewId as { value?: string } | undefined)?.value;
    return reply.status(201).send(
      await addAudio(request.user.sub, {
        url: saved.relative,
        name,
        duration: duration || null,
        roleId,
        reviewId,
      }),
    );
  });

  app.delete('/audios/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await deleteAudio(id, request.user.sub);
    return reply.status(204).send();
  });
}
