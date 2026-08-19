import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';

let app: FastifyInstance;
let token = '';
let userId = '';
let roleId = '';
const suffix = Date.now();

async function authHeaders() {
  return { authorization: `Bearer ${token}` };
}

describe('Resenhômetro API', () => {
  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });

  it('register + login', async () => {
    const email = `qa${suffix}@resenha.test`;
    const register = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'QA User', email, password: 'secret12', username: `qa${suffix}` },
    });
    expect(register.statusCode).toBe(201);
    token = register.json().token;
    userId = register.json().user.id;

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'secret12' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().token).toBeTruthy();
  });

  it('me + update profile', async () => {
    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: await authHeaders() });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toContain('@resenha.test');

    const updated = await app.inject({
      method: 'PUT',
      url: '/users/me',
      headers: await authHeaders(),
      payload: { bio: 'Curto um barzinho', city: 'São Paulo' },
    });
    expect(updated.statusCode).toBe(200);
    expect(updated.json().bio).toBe('Curto um barzinho');
  });

  it('rejects unauthorized role creation', async () => {
    const res = await app.inject({ method: 'POST', url: '/roles', payload: { title: 'Sem token' } });
    expect(res.statusCode).toBe(401);
  });

  it('create, edit, attendance, comment, delete role', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/roles',
      headers: await authHeaders(),
      payload: {
        title: 'Sexta no Bar X',
        description: 'Resenha clássica',
        date: '2026-08-22',
        time: '19:30',
        location: 'São Paulo',
        category: 'Bar',
        tags: ['sexta', 'bar'],
      },
    });
    expect(created.statusCode).toBe(201);
    roleId = created.json().id;

    const edited = await app.inject({
      method: 'PUT',
      url: `/roles/${roleId}`,
      headers: await authHeaders(),
      payload: { title: 'Sexta no Bar X — edição', location: 'Vila Madalena' },
    });
    expect(edited.statusCode).toBe(200);
    expect(edited.json().title).toContain('edição');

    const attendance = await app.inject({
      method: 'POST',
      url: `/roles/${roleId}/attendance`,
      headers: await authHeaders(),
      payload: { status: 'going' },
    });
    expect(attendance.statusCode).toBe(200);
    expect(attendance.json().goingCount).toBeGreaterThan(0);

    const comment = await app.inject({
      method: 'POST',
      url: `/roles/${roleId}/comments`,
      headers: await authHeaders(),
      payload: { content: 'Vou sim!' },
    });
    expect(comment.statusCode).toBe(200);
    expect(comment.json().comments.length).toBeGreaterThan(0);

    const reply = await app.inject({
      method: 'POST',
      url: `/roles/${roleId}/comments`,
      headers: await authHeaders(),
      payload: { content: 'Eu também', parentId: comment.json().comments[0].id },
    });
    expect(reply.statusCode).toBe(200);
    expect(reply.json().comments[0].replies.length).toBeGreaterThan(0);
  });

  it('review + reaction + feed + stats', async () => {
    const review = await app.inject({
      method: 'POST',
      url: '/reviews',
      headers: await authHeaders(),
      payload: { roleId, title: 'Noite boa', content: 'Comida ok, música ótima', rating: 5, ratings: { fun: 5, music: 5 }, tags: ['sexta'] },
    });
    expect(review.statusCode).toBe(201);

    const reaction = await app.inject({
      method: 'POST',
      url: '/reactions',
      headers: await authHeaders(),
      payload: { targetType: 'role', targetId: roleId, type: 'fire' },
    });
    expect(reaction.statusCode).toBe(200);

    const feed = await app.inject({ method: 'GET', url: '/feed', headers: await authHeaders() });
    expect(feed.statusCode).toBe(200);
    expect(Array.isArray(feed.json())).toBe(true);

    const stats = await app.inject({ method: 'GET', url: '/stats', headers: await authHeaders() });
    expect(stats.statusCode).toBe(200);
    expect(stats.json().totalRoles).toBeGreaterThan(0);
  });

  it('cannot delete someone else role', async () => {
    const other = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: { name: 'Outro', email: `other${suffix}@resenha.test`, password: 'secret12' },
    });
    const otherToken = other.json().token;
    const res = await app.inject({
      method: 'DELETE',
      url: `/roles/${roleId}`,
      headers: { authorization: `Bearer ${otherToken}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('owner can delete role', async () => {
    const res = await app.inject({
      method: 'DELETE',
      url: `/roles/${roleId}`,
      headers: await authHeaders(),
    });
    expect(res.statusCode).toBe(204);
  });

  it('forgot password + reset', async () => {
    const email = `qa${suffix}@resenha.test`;
    const forgotUnknown = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email: `missing${suffix}@resenha.test` },
    });
    expect(forgotUnknown.statusCode).toBe(200);

    const forgot = await app.inject({
      method: 'POST',
      url: '/auth/forgot-password',
      payload: { email },
    });
    expect(forgot.statusCode).toBe(200);
    const resetUrl = forgot.json().resetUrl as string;
    expect(resetUrl).toContain('token=');
    const resetToken = new URL(resetUrl).searchParams.get('token');
    expect(resetToken).toBeTruthy();

    const reset = await app.inject({
      method: 'POST',
      url: '/auth/reset-password',
      payload: { token: resetToken, password: 'novaSenha9' },
    });
    expect(reset.statusCode).toBe(200);

    const oldLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'secret12' },
    });
    expect(oldLogin.statusCode).toBe(401);

    const newLogin = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'novaSenha9' },
    });
    expect(newLogin.statusCode).toBe(200);
    expect(newLogin.json().token).toBeTruthy();
  });
});
