import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { exec } from '../../db/client.js';
import { resetAuthRateLimits } from '../../lib/auth-rate-limit.js';

let app: FastifyInstance;
const suffix = Date.now();

type Person = { id: string; token: string; username: string };

async function person(tag: string): Promise<Person> {
  const username = `${tag}${suffix}`;
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: `Pessoa ${tag}`, email: `${username}@resenha.test`, password: 'secret12', username },
  });
  expect(res.statusCode).toBe(201);
  return { id: res.json().user.id, token: res.json().token, username };
}

const bearer = (p: Person) => ({ authorization: `Bearer ${p.token}` });

// PNG de 1x1 pixel.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

function multipart(file: { name: string; type: string; data: Buffer }, fields: Record<string, string> = {}) {
  const boundary = '----chat-test-boundary';
  const parts: Buffer[] = [];
  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`));
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.name}"\r\nContent-Type: ${file.type}\r\n\r\n`,
    ),
    file.data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return { payload: Buffer.concat(parts), headers: { 'content-type': `multipart/form-data; boundary=${boundary}` } };
}

describe('chat', () => {
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

  it('/storage/sign aceita todos os tipos de envio que o site usa, inclusive a foto do chat', async () => {
    const ana = await person('cs1');
    const kinds: Array<[string, string]> = [
      ['avatar', 'image/png'],
      ['cover', 'image/png'],
      ['photo', 'image/png'],
      ['story', 'image/png'],
      ['chat', 'image/png'],
      ['audio', 'audio/mpeg'],
    ];
    for (const [kind, contentType] of kinds) {
      const res = await app.inject({
        method: 'POST',
        url: '/storage/sign',
        headers: bearer(ana),
        payload: { kind, contentType, filename: 'a.png' },
      });
      expect(res.statusCode, `kind ${kind}`).toBe(200);
    }
  });

  it('foto no chat: passa pelo /storage/sign, vai por multipart e chega ao outro lado com legenda', async () => {
    const ana = await person('ci1');
    const beto = await person('ci2');

    const sign = await app.inject({
      method: 'POST',
      url: '/storage/sign',
      headers: bearer(ana),
      payload: { kind: 'chat', contentType: 'image/png', filename: 'foto.png' },
    });
    expect(sign.statusCode).toBe(200);
    expect(sign.json().mode).toBe('multipart');

    const form = multipart({ name: 'foto.png', type: 'image/png', data: PNG }, { content: 'olha isso' });
    const sent = await app.inject({
      method: 'POST',
      url: `/chat/${beto.username}/image`,
      headers: { ...bearer(ana), ...form.headers },
      payload: form.payload,
    });
    expect(sent.statusCode).toBe(200);
    expect(sent.json().content).toBe('olha isso');
    expect(sent.json().image).toContain('/chats/');

    const read = await app.inject({ method: 'GET', url: `/chat/${ana.username}/messages`, headers: bearer(beto) });
    expect(read.statusCode).toBe(200);
    expect(read.json().messages).toHaveLength(1);
    expect(read.json().messages[0].image).toContain('/chats/');
  });

  it('só foto, sem legenda, também vale; arquivo que não é imagem é recusado', async () => {
    const ana = await person('ci3');
    const beto = await person('ci4');

    const onlyPhoto = multipart({ name: 'foto.png', type: 'image/png', data: PNG });
    const ok = await app.inject({
      method: 'POST',
      url: `/chat/${beto.username}/image`,
      headers: { ...bearer(ana), ...onlyPhoto.headers },
      payload: onlyPhoto.payload,
    });
    expect(ok.statusCode).toBe(200);
    expect(ok.json().content).toBe('');

    const text = multipart({ name: 'nota.txt', type: 'text/plain', data: Buffer.from('oi') });
    const refused = await app.inject({
      method: 'POST',
      url: `/chat/${beto.username}/image`,
      headers: { ...bearer(ana), ...text.headers },
      payload: text.payload,
    });
    expect(refused.statusCode).toBe(400);
  });

  it('qualquer pessoa manda mensagem para qualquer pessoa, e não dá para mandar vazia', async () => {
    const ana = await person('cm1');
    const beto = await person('cm2');

    const sent = await app.inject({
      method: 'POST',
      url: `/chat/${beto.username}/messages`,
      headers: bearer(ana),
      payload: { content: 'oi, não nos conhecemos' },
    });
    expect(sent.statusCode).toBe(200);

    const empty = await app.inject({
      method: 'POST',
      url: `/chat/${beto.username}/messages`,
      headers: bearer(ana),
      payload: { content: '   ' },
    });
    expect(empty.statusCode).toBe(400);
  });
});
