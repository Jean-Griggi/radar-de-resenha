import type { FastifyInstance, FastifyReply } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { consumeAuthIpLimit, consumeForgotEmailLimit } from '../../lib/auth-rate-limit.js';
import { clearSessionCookie, setSessionCookie } from '../../lib/session.js';
import { takeUpload } from '../../lib/storage.js';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema, updateMeSchema } from '../common.schema.js';
import { changePassword, getMe, loginUser, registerUser, requestPasswordReset, resetPassword, setUserMedia, updateMe } from './auth.service.js';

function issueSession(
  app: FastifyInstance,
  reply: FastifyReply,
  user: { id: string; email?: string | null },
) {
  const token = app.jwt.sign({ sub: user.id, email: user.email ?? '' });
  setSessionCookie(reply, token);
  return token;
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    consumeAuthIpLimit(request, 'auth-register');
    const body = registerSchema.parse(request.body);
    const user = await registerUser(body);
    const token = issueSession(app, reply, user);
    return reply.status(201).send({ user, token });
  });

  app.post('/auth/login', async (request, reply) => {
    consumeAuthIpLimit(request, 'auth-login');
    const body = loginSchema.parse(request.body);
    const user = await loginUser(body);
    const token = issueSession(app, reply, user);
    return reply.send({ user, token });
  });

  app.post('/auth/logout', async (_request, reply) => {
    clearSessionCookie(reply);
    return reply.send({ ok: true });
  });

  app.post('/auth/forgot-password', async (request, reply) => {
    consumeAuthIpLimit(request, 'auth-forgot');
    const body = forgotPasswordSchema.parse(request.body);
    consumeForgotEmailLimit(body.email);
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
    const saved = await takeUpload(request, 'avatar');
    return setUserMedia(request.user.sub, 'avatar', saved.relative);
  });

  app.delete('/users/me/avatar', { preHandler: [authenticate] }, async (request) => {
    return setUserMedia(request.user.sub, 'avatar', null);
  });

  app.post('/users/me/cover', { preHandler: [authenticate] }, async (request) => {
    const saved = await takeUpload(request, 'cover');
    return setUserMedia(request.user.sub, 'cover', saved.relative);
  });

  app.delete('/users/me/cover', { preHandler: [authenticate] }, async (request) => {
    return setUserMedia(request.user.sub, 'cover', null);
  });
}
