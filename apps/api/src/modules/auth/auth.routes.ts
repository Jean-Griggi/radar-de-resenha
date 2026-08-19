import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { saveUpload } from '../../lib/storage.js';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, updateMeSchema } from '../common.schema.js';
import { changePassword, getMe, loginUser, registerUser, requestPasswordReset, resetPassword, setUserMedia, updateMe } from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const user = await registerUser(body);
    const token = app.jwt.sign({ sub: user.id, email: user.email ?? '' });
    return reply.status(201).send({ user, token });
  });

  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = await loginUser(body);
    const token = app.jwt.sign({ sub: user.id, email: user.email ?? '' });
    return reply.send({ user, token });
  });

  app.post('/auth/forgot-password', async (request, reply) => {
    const body = forgotPasswordSchema.parse(request.body);
    return reply.send(await requestPasswordReset(body.email));
  });

  app.post('/auth/reset-password', async (request, reply) => {
    const body = resetPasswordSchema.parse(request.body);
    await resetPassword(body.token, body.password);
    return reply.send({ ok: true });
  });

  const meHandler = async (request: { user: { sub: string } }) => getMe(request.user.sub);

  app.get('/auth/me', { preHandler: [authenticate] }, async (request) => meHandler(request));
  app.get('/me', { preHandler: [authenticate] }, async (request) => meHandler(request));

  app.put('/auth/me', { preHandler: [authenticate] }, async (request) => {
    const body = updateMeSchema.parse(request.body);
    return updateMe(request.user.sub, body);
  });

  app.put('/users/me', { preHandler: [authenticate] }, async (request) => {
    const body = updateMeSchema.parse(request.body);
    return updateMe(request.user.sub, body);
  });

  app.put('/auth/password', { preHandler: [authenticate] }, async (request, reply) => {
    const body = changePasswordSchema.parse(request.body);
    await changePassword(request.user.sub, body);
    return reply.send({ ok: true });
  });

  app.post('/users/me/avatar', { preHandler: [authenticate] }, async (request) => {
    const file = await request.file();
    if (!file) throw new Error('NO_FILE');
    const saved = await saveUpload(file, 'avatar');
    return setUserMedia(request.user.sub, 'avatar', saved.relative);
  });

  app.delete('/users/me/avatar', { preHandler: [authenticate] }, async (request) => {
    return setUserMedia(request.user.sub, 'avatar', null);
  });

  app.post('/users/me/cover', { preHandler: [authenticate] }, async (request) => {
    const file = await request.file();
    if (!file) throw new Error('NO_FILE');
    const saved = await saveUpload(file, 'cover');
    return setUserMedia(request.user.sub, 'cover', saved.relative);
  });

  app.delete('/users/me/cover', { preHandler: [authenticate] }, async (request) => {
    return setUserMedia(request.user.sub, 'cover', null);
  });
}
