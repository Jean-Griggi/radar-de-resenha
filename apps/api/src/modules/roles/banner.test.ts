import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { exec } from '../../db/client.js';
import { resetAuthRateLimits } from '../../lib/auth-rate-limit.js';
import { isSupabaseStorage, storageRoot } from '../../lib/storage.js';

const suffix = Date.now();
let app: FastifyInstance;

type Person = { id: string; token: string };
type RoleJson = { id: string; banner: string | null; coverPhoto: string | null };

async function person(tag: string): Promise<Person> {
  const username = `${tag}${suffix}`;
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: `Banner ${tag}`, email: `${username}@resenha.test`, password: 'secret12', username },
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
    payload: { title: 'Rolê com banner', date: '2026-12-20', time: '20:00', category: 'Bar' },
  });
  expect(res.statusCode).toBe(201);
  return res.json() as RoleJson;
}

function upload(p: Person, roleId: string, contentType = 'image/jpeg', filename = 'banner.jpg') {
  const boundary = '----radar-banner';
  const bytes = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
  const payload = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${contentType}\r\n\r\n`),
    bytes,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ]);
  return app.inject({
    method: 'POST',
    url: `/roles/${roleId}/banner`,
    headers: { ...bearer(p), 'content-type': `multipart/form-data; boundary=${boundary}` },
    payload,
  });
}

/** Arquivos de capa no disco local (os testes rodam sem Supabase). */
function coverFiles() {
  const dir = join(storageRoot(), 'covers');
  return existsSync(dir) ? readdirSync(dir) : [];
}

describe('banner do rolê', () => {
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

  it('rolê novo nasce sem banner', async () => {
    const role = await newRole(await person('bn1'));
    expect(role.banner).toBeNull();
    expect(role.coverPhoto).toBeNull();
  });

  it('o dono envia o banner e ele vira a capa do rolê (detalhe e lista)', async () => {
    const ana = await person('bn2');
    const role = await newRole(ana);

    const res = await upload(ana, role.id);
    expect(res.statusCode).toBe(200);
    const sent = res.json() as RoleJson;
    expect(sent.banner).toContain('covers/');
    expect(sent.coverPhoto).toBe(sent.banner);

    const list = await app.inject({ method: 'GET', url: '/roles?limit=100', headers: bearer(ana) });
    const inList = (list.json() as RoleJson[]).find((item) => item.id === role.id);
    expect(inList?.coverPhoto).toBe(sent.banner);
  });

  it('trocar o banner apaga o arquivo antigo do disco', async () => {
    if (isSupabaseStorage()) return; // este teste olha o disco local
    const ana = await person('bn3');
    const role = await newRole(ana);
    const before = coverFiles().length;

    await upload(ana, role.id);
    expect(coverFiles().length).toBe(before + 1);
    await upload(ana, role.id);
    expect(coverFiles().length).toBe(before + 1);
  });

  it('remover o banner limpa o campo e apaga o arquivo', async () => {
    if (isSupabaseStorage()) return;
    const ana = await person('bn4');
    const role = await newRole(ana);
    const before = coverFiles().length;
    await upload(ana, role.id);

    const res = await app.inject({ method: 'DELETE', url: `/roles/${role.id}/banner`, headers: bearer(ana) });
    expect(res.statusCode).toBe(200);
    expect((res.json() as RoleJson).banner).toBeNull();
    expect(coverFiles().length).toBe(before);
  });

  it('quem não é o dono recebe 403, o banner não muda e o arquivo enviado não fica no disco', async () => {
    const ana = await person('bn5');
    const beto = await person('bb5');
    const role = await newRole(ana);
    const first = (await upload(ana, role.id)).json() as RoleJson;
    const before = coverFiles().length;

    const stolen = await upload(beto, role.id);
    expect(stolen.statusCode).toBe(403);
    if (!isSupabaseStorage()) expect(coverFiles().length).toBe(before);

    const removed = await app.inject({ method: 'DELETE', url: `/roles/${role.id}/banner`, headers: bearer(beto) });
    expect(removed.statusCode).toBe(403);

    const now = await app.inject({ method: 'GET', url: `/roles/${role.id}`, headers: bearer(ana) });
    expect((now.json() as RoleJson).banner).toBe(first.banner);
  });

  it('rolê inexistente responde 404 e sem sessão responde 401; arquivo que não é imagem responde 400', async () => {
    const ana = await person('bn6');
    expect((await upload(ana, 'nao-existe')).statusCode).toBe(404);

    const role = await newRole(ana);
    const anon = await app.inject({ method: 'POST', url: `/roles/${role.id}/banner` });
    expect(anon.statusCode).toBe(401);

    const pdf = await upload(ana, role.id, 'application/pdf', 'banner.pdf');
    expect(pdf.statusCode).toBeGreaterThanOrEqual(400);
    expect(pdf.statusCode).toBeLessThan(500);
  });

  it('apagar o rolê apaga o banner do disco', async () => {
    if (isSupabaseStorage()) return;
    const ana = await person('bn7');
    const role = await newRole(ana);
    const before = coverFiles().length;
    await upload(ana, role.id);

    const res = await app.inject({ method: 'DELETE', url: `/roles/${role.id}`, headers: bearer(ana) });
    expect(res.statusCode).toBeLessThan(300);
    expect(coverFiles().length).toBe(before);
  });
});
