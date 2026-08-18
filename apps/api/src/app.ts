import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import { ZodError } from 'zod';
import { corsOrigins, env } from './config/env.js';
import { initDb } from './db/client.js';
import { HttpError } from './lib/http.js';
import { ensureStorage, storageRoot } from './lib/storage.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { mediaRoutes } from './modules/media/media.routes.js';
import { musicRoutes } from './modules/music/music.routes.js';
import { reviewsRoutes } from './modules/reviews/reviews.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';
import { socialRoutes } from './modules/search/search.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';

export async function buildApp() {
  await initDb();
  await ensureStorage();

  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: corsOrigins(),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.register(jwt, { secret: env.JWT_SECRET });
  await app.register(multipart, {
    limits: { fileSize: 12 * 1024 * 1024 },
  });
  await app.register(staticFiles, {
    root: storageRoot(),
    prefix: '/uploads/',
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({ message: 'Dados inválidos', issues: error.issues });
    }
    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({ message: error.message });
    }
    if (error instanceof Error && error.message === 'UNSUPPORTED_MEDIA') {
      return reply.status(400).send({ message: 'Tipo de arquivo não suportado' });
    }
    if (error instanceof Error && error.message === 'FILE_TOO_LARGE') {
      return reply.status(400).send({ message: 'Arquivo muito grande' });
    }
    if (error instanceof Error && error.message === 'AUDIO_TOO_LONG') {
      return reply.status(400).send({ message: 'Áudio deve ter no máximo 5 minutos' });
    }
    request.log.error(error);
    return reply.status(500).send({ message: 'Erro interno' });
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(rolesRoutes);
  await app.register(reviewsRoutes);
  await app.register(mediaRoutes);
  await app.register(musicRoutes);
  await app.register(socialRoutes);

  return app;
}
