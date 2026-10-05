import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { exec } from '../../db/client.js';
import { resetAuthRateLimits } from '../../lib/auth-rate-limit.js';

const suffix = Date.now();
let app: FastifyInstance;

type Person = { id: string; token: string };

async function person(tag: string): Promise<Person> {
  const username = `${tag}${suffix}`;
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: `Local ${tag}`, email: `${username}@resenha.test`, password: 'secret12', username },
  });
  expect(res.statusCode).toBe(201);
  return { id: res.json().user.id, token: res.json().token };
}

const bearer = (p: Person) => ({ authorization: `Bearer ${p.token}` });
const CUIABA = { latitude: -15.6014, longitude: -56.0979 };
const BASE = { title: 'Rolê no centro', date: '2026-12-20', time: '20:00', category: 'Bar' };

function create(p: Person, extra: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: '/roles', headers: bearer(p), payload: { ...BASE, ...extra } });
}

function update(p: Person, id: string, payload: Record<string, unknown>) {
  return app.inject({ method: 'PUT', url: `/roles/${id}`, headers: bearer(p), payload });
}

async function detail(p: Person, id: string) {
  const res = await app.inject({ method: 'GET', url: `/roles/${id}`, headers: bearer(p) });
  expect(res.statusCode).toBe(200);
  return res.json() as { latitude: number | null; longitude: number | null; location: string | null };
}

describe('local do rolê no mapa', () => {
  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    // Apagar o usuário leva junto os rolês criados aqui (o banco local é persistente e a listagem tem limite).
    await exec(`DELETE FROM users WHERE username LIKE $1`, [`%${suffix}`]);
    await app.close();
  });

  beforeEach(() => {
    resetAuthRateLimits();
  });

  it('guarda o texto do local e o ponto exato, e devolve os dois', async () => {
    const ana = await person('lc1');
    const res = await create(ana, { location: 'Praça Alencastro', ...CUIABA });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ location: 'Praça Alencastro', ...CUIABA });

    const again = await detail(ana, res.json().id);
    expect(again).toMatchObject({ location: 'Praça Alencastro', ...CUIABA });
  });

  it('rolê sem ponto continua valendo, com latitude e longitude nulas', async () => {
    const ana = await person('lc2');
    const res = await create(ana, { location: 'Em casa' });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ location: 'Em casa', latitude: null, longitude: null });
  });

  it('coordenada fora da faixa ou só uma das duas responde 400 e não cria o rolê', async () => {
    const ana = await person('lc3');
    for (const body of [
      { latitude: 91, longitude: -56 },
      { latitude: -15, longitude: 181 },
      { latitude: -15.6 },
      { longitude: -56.09 },
      { latitude: null, longitude: -56.09 },
      { latitude: 'abc', longitude: -56.09 },
    ]) {
      const res = await create(ana, body);
      expect(res.statusCode, JSON.stringify(body)).toBe(400);
    }
    const list = await app.inject({ method: 'GET', url: '/roles?limit=100', headers: bearer(ana) });
    expect((list.json() as Array<{ creatorId: string }>).filter((role) => role.creatorId === ana.id)).toHaveLength(0);
  });

  it('editar sem mandar o ponto mantém; trocar, limpar e mandar um só se comportam como esperado', async () => {
    const ana = await person('lc4');
    const { id } = (await create(ana, { location: 'Antes', ...CUIABA })).json() as { id: string };

    // não mandou ponto: mantém
    expect((await update(ana, id, { title: 'Novo nome do rolê' })).statusCode).toBe(200);
    expect(await detail(ana, id)).toMatchObject(CUIABA);

    // troca de ponto
    const outro = { latitude: -15.5961, longitude: -56.0967 };
    expect((await update(ana, id, outro)).statusCode).toBe(200);
    expect(await detail(ana, id)).toMatchObject(outro);

    // um só: 400 e nada muda
    expect((await update(ana, id, { latitude: -10 })).statusCode).toBe(400);
    expect(await detail(ana, id)).toMatchObject(outro);

    // limpar: os dois nulos
    expect((await update(ana, id, { latitude: null, longitude: null })).statusCode).toBe(200);
    expect(await detail(ana, id)).toMatchObject({ latitude: null, longitude: null });
  });

  it('só o dono altera o ponto do rolê', async () => {
    const ana = await person('lc5');
    const beto = await person('lb5');
    const { id } = (await create(ana, CUIABA)).json() as { id: string };

    const res = await update(beto, id, { latitude: 0, longitude: 0 });
    expect(res.statusCode).toBe(403);
    expect(await detail(ana, id)).toMatchObject(CUIABA);
  });
});
