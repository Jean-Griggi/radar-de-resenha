import Fastify from 'fastify';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { rolesRoutes } from './modules/roles/roles.routes.js';

export async function buildApp() {
  const app = Fastify({ logger: true });

  await app.register(jwt, {
    secret: env.JWT_SECRET,
  });

  app.get('/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes);
  await app.register(rolesRoutes);

  return app;
}
