import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { exec } from '../../db/client.js';
import { resetAuthRateLimits } from '../../lib/auth-rate-limit.js';
import { addFeedEvent } from './feed.js';

let app: FastifyInstance;
const suffix = Date.now();

type Person = { id: string; token: string };

async function person(tag: string): Promise<Person> {
  const username = `${tag}${suffix}`;
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: `Pessoa ${tag}`, email: `${username}@resenha.test`, password: 'secret12', username },
  });
  expect(res.statusCode).toBe(201);
  return { id: res.json().user.id, token: res.json().token };
}

const bearer = (p: Person) => ({ authorization: `Bearer ${p.token}` });

async function newRole(owner: Person) {
  const res = await app.inject({
    method: 'POST',
    url: '/roles',
    headers: bearer(owner),
    payload: { title: 'Rolê do feed', date: '2026-12-20', time: '20:00', location: 'São Paulo', category: 'Bar' },
  });
  expect(res.statusCode).toBe(201);
  return res.json().id as string;
}

async function going(p: Person, roleId: string) {
  const res = await app.inject({
    method: 'POST',
    url: `/roles/${roleId}/attendance`,
    headers: bearer(p),
    payload: { status: 'going' },
  });
  expect(res.statusCode).toBe(200);
}

async function feedOf(p: Person) {
  const res = await app.inject({ method: 'GET', url: '/feed', headers: bearer(p) });
  expect(res.statusCode).toBe(200);
  return res.json() as Array<{ type: string; actor: { id: string }; role?: { id: string } }>;
}

describe('feed: uma entrada por coisa', () => {
  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await exec(`DELETE FROM users WHERE username LIKE $1`, [`%${suffix}`]);
    await app.close();
  });

  beforeEach(() => {
    resetAuthRateLimits();
  });

  it('marcar presença várias vezes não repete o rolê: ele aparece uma vez, como criado', async () => {
    const ana = await person('fd1');
    const beto = await person('fd2');
    const roleId = await newRole(ana);

    await going(beto, roleId);
    await going(beto, roleId);
    await going(beto, roleId);

    const events = (await feedOf(ana)).filter((item) => item.role?.id === roleId);
    expect(events.map((item) => item.type)).toEqual(['role_created']);
  });

  it('o criador marcar presença no próprio rolê não repete o rolê no feed', async () => {
    const ana = await person('fd3');
    const roleId = await newRole(ana);

    await going(ana, roleId);

    const events = (await feedOf(ana)).filter((item) => item.role?.id === roleId);
    expect(events.map((item) => item.type)).toEqual(['role_created']);
  });

  it('repetições que já estavam no banco também saem do feed', async () => {
    const ana = await person('fd4');
    const beto = await person('fd5');
    const roleId = await newRole(ana);

    for (let i = 0; i < 3; i += 1) {
      await addFeedEvent({ type: 'attendance_going', actorId: beto.id, roleId });
    }

    const events = (await feedOf(ana)).filter((item) => item.role?.id === roleId);
    expect(events).toHaveLength(1);
  });

  it('várias pessoas confirmando no mesmo rolê não viram várias entradas do mesmo rolê', async () => {
    const ana = await person('fd6');
    const beto = await person('fd7');
    const caio = await person('fd8');
    const roleId = await newRole(ana);

    await going(beto, roleId);
    await going(caio, roleId);

    expect((await feedOf(ana)).filter((item) => item.role?.id === roleId)).toHaveLength(1);
  });

  it('quando o rolê criado não está mais na lista, "fulano vai" mostra o rolê uma vez só', async () => {
    const ana = await person('fd9');
    const beto = await person('fd10');
    const caio = await person('fd11');
    const roleId = await newRole(ana);
    await exec(`DELETE FROM feed_events WHERE type = 'role_created' AND role_id = $1`, [roleId]);

    await going(beto, roleId);
    await going(caio, roleId);

    const events = (await feedOf(ana)).filter((item) => item.role?.id === roleId);
    expect(events).toHaveLength(1);
    expect(events[0]!.type).toBe('attendance_going');
  });

  it('a resenha do rolê continua sendo outra coisa: rolê e resenha aparecem uma vez cada', async () => {
    const ana = await person('fd12');
    const roleId = await newRole(ana);
    const review = await app.inject({
      method: 'POST',
      url: '/reviews',
      headers: bearer(ana),
      payload: { roleId, title: 'Noite boa', content: 'Gostei', rating: 5, ratings: { fun: 5 }, tags: [] },
    });
    expect(review.statusCode).toBe(201);

    const types = (await feedOf(ana)).filter((item) => item.role?.id === roleId).map((item) => item.type).sort();
    expect(types).toEqual(['review_published', 'role_created']);
  });
});
