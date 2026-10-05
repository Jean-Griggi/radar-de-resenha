import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Antes dos imports: o env lê o process.env uma vez, na carga do módulo.
vi.hoisted(() => {
  process.env.SPOTIFY_CLIENT_ID = 'test-client';
  process.env.SPOTIFY_CLIENT_SECRET = 'test-secret';
  process.env.SPOTIFY_REDIRECT_URI = 'http://127.0.0.1:3333/spotify/callback';
});

import { buildApp } from '../../app.js';
import { env } from '../../config/env.js';
import { exec, queryOne } from '../../db/client.js';
import { resetAuthRateLimits } from '../../lib/auth-rate-limit.js';

// --- Spotify de mentira: uma "biblioteca" por access token ---------------------------------

type FakeTrack = { id: string; name: string; artists: string[]; album: string; cover: string };
type FakePlaylist = { id: string; name: string; cover: string; total: number };
type Library = { tracks: FakeTrack[]; playlists: FakePlaylist[] };

const libraries = new Map<string, Library>();
const allTracks = new Map<string, FakeTrack>();

function track(id: string, name: string, artist: string): FakeTrack {
  const item = { id, name, artists: [artist], album: `Álbum ${name}`, cover: `https://i.scdn.co/image/${id}` };
  allTracks.set(id, item);
  return item;
}

const TRACK_A = track('trackAAAA1', 'Faixa da Ana', 'Banda A');
const TRACK_B = track('trackBBBB2', 'Faixa do Beto', 'Banda B');
const PLAYLIST_A = { id: 'listAAAA1', name: 'Lista da Ana', cover: 'https://i.scdn.co/image/listA', total: 12 };
const PLAYLIST_B = { id: 'listBBBB2', name: 'Lista do Beto', cover: 'https://i.scdn.co/image/listB', total: 7 };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function installFakeSpotify() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown, init?: { method?: string; headers?: Record<string, string>; body?: unknown }) => {
      const url = new URL(String(input));
      if (url.hostname === 'accounts.spotify.com') {
        const code = new URLSearchParams(String(init?.body)).get('code') ?? 'refresh';
        return json({ access_token: `AT-${code}`, refresh_token: `RT-${code}`, expires_in: 3600 });
      }

      const bearer = (init?.headers?.Authorization ?? '').replace('Bearer ', '');
      const library = libraries.get(bearer);
      if (!library) return json({ error: 'invalid token' }, 401);

      const path = url.pathname.replace('/v1', '');
      if (path === '/me') return json({ id: `sp-${bearer}`, display_name: `Conta ${bearer}`, product: 'premium' });
      if (path === '/me/player/currently-playing') return new Response(null, { status: 204 });
      if (path === '/me/playlists') {
        return json({
          items: library.playlists.map((item) => ({
            id: item.id,
            name: item.name,
            images: [{ url: item.cover }],
            tracks: { total: item.total },
            external_urls: { spotify: `https://open.spotify.com/playlist/${item.id}` },
          })),
          next: null,
        });
      }
      if (path === '/me/tracks/contains') {
        const ids = (url.searchParams.get('ids') ?? '').split(',');
        return json(ids.map((id) => library.tracks.some((item) => item.id === id)));
      }
      if (path === '/me/tracks') {
        return json({ items: library.tracks.map((item) => ({ track: spotifyTrack(item) })) });
      }
      const single = path.match(/^\/tracks\/(\w+)$/);
      if (single && allTracks.has(single[1])) return json(spotifyTrack(allTracks.get(single[1])!));
      return json({ error: 'not found' }, 404);
    }),
  );
}

function spotifyTrack(item: FakeTrack) {
  return {
    id: item.id,
    name: item.name,
    artists: item.artists.map((name) => ({ name })),
    album: { name: item.album, images: [{ url: item.cover }] },
    external_urls: { spotify: `https://open.spotify.com/track/${item.id}` },
  };
}

// --- API -----------------------------------------------------------------------------------

let app: FastifyInstance;
const suffix = Date.now();

type Person = { id: string; token: string; name: string; username: string };

async function person(tag: string): Promise<Person> {
  const username = `${tag}${suffix}`;
  const res = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: { name: `Pessoa ${tag}`, email: `${username}@resenha.test`, password: 'secret12', username },
  });
  expect(res.statusCode).toBe(201);
  return { id: res.json().user.id, token: res.json().token, name: `Pessoa ${tag}`, username };
}

const bearer = (p: Person) => ({ authorization: `Bearer ${p.token}` });
const cookie = (p: Person) => ({ cookie: `resenhometro_session=${p.token}` });

/** Liga a conta de mentira direto no banco (atalho para os testes que não são sobre o OAuth). */
async function connect(p: Person, key: string, library: Library) {
  libraries.set(`AT-${key}`, library);
  await exec(
    `INSERT INTO spotify_connections (user_id, spotify_id, display_name, access_token, refresh_token, expires_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())
     ON CONFLICT (user_id) DO UPDATE SET access_token = EXCLUDED.access_token, expires_at = EXCLUDED.expires_at`,
    [p.id, `sp-${key}`, `Conta ${key}`, `AT-${key}`, `RT-${key}`, new Date(Date.now() + 3_600_000).toISOString()],
  );
}

async function newRole(owner: Person) {
  const res = await app.inject({
    method: 'POST',
    url: '/roles',
    headers: bearer(owner),
    payload: { title: 'Rolê da música', date: '2026-12-20', time: '20:00', location: 'São Paulo', category: 'Bar' },
  });
  expect(res.statusCode).toBe(201);
  return res.json().id as string;
}

function addMusic(p: Person, roleId: string, body: Record<string, unknown>) {
  return app.inject({ method: 'POST', url: `/roles/${roleId}/music`, headers: bearer(p), payload: body });
}

async function stateFor(p: Person) {
  const res = await app.inject({ method: 'GET', url: '/spotify/connect', headers: bearer(p) });
  expect(res.statusCode).toBe(200);
  return new URL(res.json().url).searchParams.get('state')!;
}

function callback(p: Person | null, state: string, code = 'code-x') {
  return app.inject({
    method: 'GET',
    url: `/spotify/callback?code=${code}&state=${encodeURIComponent(state)}`,
    headers: p ? cookie(p) : {},
  });
}

async function hasConnection(p: Person) {
  return Boolean(await queryOne(`SELECT 1 FROM spotify_connections WHERE user_id = $1`, [p.id]));
}

const SECRET_FIELDS = /access_token|refresh_token|accessToken|refreshToken|AT-|RT-/;

describe('Spotify no rolê e no story', () => {
  beforeAll(async () => {
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetAuthRateLimits();
    libraries.clear();
    installFakeSpotify();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('conexão (OAuth)', () => {
    it('status não traz access token nem refresh token', async () => {
      const ana = await person('st1');
      await connect(ana, 'ana-st1', { tracks: [TRACK_A], playlists: [PLAYLIST_A] });
      const res = await app.inject({ method: 'GET', url: '/spotify/status', headers: bearer(ana) });
      expect(res.statusCode).toBe(200);
      expect(res.json().connected).toBe(true);
      expect(res.json().displayName).toBe('Conta ana-st1');
      expect(res.body).not.toMatch(SECRET_FIELDS);
    });

    it('conecta com estado válido da mesma pessoa logada e volta para a origem da web', async () => {
      const ana = await person('oa1');
      libraries.set('AT-code-oa1', { tracks: [], playlists: [] });
      const state = await stateFor(ana);

      const res = await callback(ana, state, 'code-oa1');
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(`${env.WEB_ORIGIN}/music?spotify=connected`);
      expect(await hasConnection(ana)).toBe(true);
    });

    it('estado adulterado não conecta conta', async () => {
      const ana = await person('oa2');
      const state = await stateFor(ana);
      const flipped = state.slice(0, -2) + (state.endsWith('A') ? 'BB' : 'AA');

      const res = await callback(ana, flipped);
      expect(res.headers.location).toBe(`${env.WEB_ORIGIN}/music?spotify=error`);
      expect(await hasConnection(ana)).toBe(false);

      const junk = await callback(ana, 'lixo');
      expect(junk.headers.location).toBe(`${env.WEB_ORIGIN}/music?spotify=error`);
      expect(await hasConnection(ana)).toBe(false);
    });

    it('estado emitido para outra pessoa não conecta conta de ninguém', async () => {
      const ana = await person('oa3');
      const beto = await person('ob3');
      libraries.set('AT-code-x', { tracks: [], playlists: [] });
      const anaState = await stateFor(ana);

      const res = await callback(beto, anaState);
      expect(res.headers.location).toBe(`${env.WEB_ORIGIN}/music?spotify=error`);
      expect(await hasConnection(beto)).toBe(false);
      expect(await hasConnection(ana)).toBe(false);
    });

    it('estado já usado não conecta de novo', async () => {
      const ana = await person('oa4');
      libraries.set('AT-code-x', { tracks: [], playlists: [] });
      const state = await stateFor(ana);

      expect((await callback(ana, state)).headers.location).toContain('spotify=connected');
      // Apaga só a conexão (não o estado): o replay tem que falhar por o estado já ter sido gasto.
      await exec(`DELETE FROM spotify_connections WHERE user_id = $1`, [ana.id]);
      expect(await hasConnection(ana)).toBe(false);

      const again = await callback(ana, state);
      expect(again.headers.location).toBe(`${env.WEB_ORIGIN}/music?spotify=error`);
      expect(await hasConnection(ana)).toBe(false);
    });

    it('callback sem sessão não grava conta', async () => {
      const ana = await person('oa5');
      libraries.set('AT-code-x', { tracks: [], playlists: [] });
      const state = await stateFor(ana);

      const res = await callback(null, state);
      expect(res.headers.location).toBe(`${env.WEB_ORIGIN}/music?spotify=error`);
      expect(await hasConnection(ana)).toBe(false);
    });

    it('desconectar apaga os tokens guardados', async () => {
      const ana = await person('dc1');
      await connect(ana, 'ana-dc1', { tracks: [], playlists: [] });
      expect(await hasConnection(ana)).toBe(true);

      const res = await app.inject({ method: 'DELETE', url: '/spotify', headers: bearer(ana) });
      expect(res.statusCode).toBe(200);
      expect(await queryOne(`SELECT access_token, refresh_token FROM spotify_connections WHERE user_id = $1`, [ana.id])).toBeUndefined();
      const status = await app.inject({ method: 'GET', url: '/spotify/status', headers: bearer(ana) });
      expect(status.json().connected).toBe(false);
    });

    it('conectar, listar e desconectar exigem sessão', async () => {
      for (const [method, url] of [
        ['GET', '/spotify/status'],
        ['GET', '/spotify/connect'],
        ['GET', '/spotify/playlists'],
        ['GET', '/spotify/tracks'],
        ['DELETE', '/spotify'],
      ] as const) {
        const res = await app.inject({ method, url });
        expect(res.statusCode, `${method} ${url}`).toBe(401);
      }
    });
  });

  describe('música no rolê', () => {
    it('sem Spotify conectado o rolê não aceita item novo (400)', async () => {
      const ana = await person('rl1');
      const roleId = await newRole(ana);
      const res = await addMusic(ana, roleId, { kind: 'track', spotifyId: TRACK_A.id });
      expect(res.statusCode).toBe(400);
      const role = await app.inject({ method: 'GET', url: `/roles/${roleId}`, headers: bearer(ana) });
      expect(role.json().music).toHaveLength(0);
    });

    it('id do Spotify de outra conta responde 400 e o rolê não ganha item', async () => {
      const ana = await person('rl2');
      const beto = await person('rb2');
      await connect(ana, 'ana-rl2', { tracks: [TRACK_A], playlists: [PLAYLIST_A] });
      await connect(beto, 'beto-rl2', { tracks: [TRACK_B], playlists: [PLAYLIST_B] });
      const roleId = await newRole(ana);

      expect((await addMusic(ana, roleId, { kind: 'track', spotifyId: TRACK_B.id })).statusCode).toBe(400);
      expect((await addMusic(ana, roleId, { kind: 'playlist', spotifyId: PLAYLIST_B.id })).statusCode).toBe(400);
      const role = await app.inject({ method: 'GET', url: `/roles/${roleId}`, headers: bearer(ana) });
      expect(role.json().music).toHaveLength(0);
    });

    it('servidor grava o que o Spotify devolveu, não o que o cliente mandou, e addedBy é a sessão', async () => {
      const ana = await person('rl3');
      const beto = await person('rb3');
      await connect(ana, 'ana-rl3', { tracks: [TRACK_A], playlists: [] });
      const roleId = await newRole(ana);

      const res = await addMusic(ana, roleId, {
        kind: 'track',
        spotifyId: TRACK_A.id,
        title: 'Título forjado',
        artist: 'Artista forjado',
        cover: 'https://evil.example/x.png',
        spotifyUrl: 'https://evil.example/play',
        addedBy: beto.id,
      });
      expect(res.statusCode).toBe(200);
      const [item] = res.json().music;
      expect(item).toMatchObject({
        kind: 'track',
        title: TRACK_A.name,
        artist: 'Banda A',
        cover: TRACK_A.cover,
        spotifyUrl: `https://open.spotify.com/track/${TRACK_A.id}`,
        addedBy: { id: ana.id, name: ana.name, username: ana.username },
      });
      expect(res.body).not.toContain('forjado');
      expect(res.body).not.toContain('evil.example');
      expect(res.body).not.toMatch(SECRET_FIELDS);
    });

    it('duas pessoas, duas contas: faixa de uma e playlist da outra aparecem com capa, tipo e quem colocou', async () => {
      const ana = await person('rl4');
      const beto = await person('rb4');
      await connect(ana, 'ana-rl4', { tracks: [TRACK_A], playlists: [] });
      await connect(beto, 'beto-rl4', { tracks: [], playlists: [PLAYLIST_B] });
      const roleId = await newRole(ana);

      expect((await addMusic(ana, roleId, { kind: 'track', spotifyId: TRACK_A.id })).statusCode).toBe(200);
      expect((await addMusic(beto, roleId, { kind: 'playlist', spotifyId: PLAYLIST_B.id })).statusCode).toBe(200);

      for (const viewer of [ana, beto]) {
        const role = await app.inject({ method: 'GET', url: `/roles/${roleId}`, headers: bearer(viewer) });
        const music = role.json().music as Array<Record<string, unknown> & { addedBy: { name: string } }>;
        expect(music).toHaveLength(2);
        const faixa = music.find((item) => item.kind === 'track')!;
        const lista = music.find((item) => item.kind === 'playlist')!;
        expect(faixa).toMatchObject({ title: TRACK_A.name, artist: 'Banda A', cover: TRACK_A.cover });
        expect(faixa.addedBy.name).toBe(ana.name);
        expect(lista).toMatchObject({ title: PLAYLIST_B.name, artist: null, cover: PLAYLIST_B.cover });
        expect(lista.addedBy.name).toBe(beto.name);
        expect(JSON.stringify(role.json())).not.toMatch(SECRET_FIELDS);
      }
    });

    it('rolê inexistente responde 404, sem sessão responde 401 e corpo inválido responde 400', async () => {
      const ana = await person('rl5');
      await connect(ana, 'ana-rl5', { tracks: [TRACK_A], playlists: [] });
      expect((await addMusic(ana, 'nao-existe', { kind: 'track', spotifyId: TRACK_A.id })).statusCode).toBe(404);

      const roleId = await newRole(ana);
      const anon = await app.inject({ method: 'POST', url: `/roles/${roleId}/music`, payload: { kind: 'track', spotifyId: TRACK_A.id } });
      expect(anon.statusCode).toBe(401);
      expect((await addMusic(ana, roleId, { title: 'à mão', artist: 'à mão' })).statusCode).toBe(400);
      expect((await addMusic(ana, roleId, { kind: 'track', spotifyId: '../me' })).statusCode).toBe(400);
    });

    it('GET /spotify/tracks e /spotify/playlists listam só a biblioteca da própria conta', async () => {
      const ana = await person('rl6');
      const beto = await person('rb6');
      await connect(ana, 'ana-rl6', { tracks: [TRACK_A], playlists: [PLAYLIST_A] });
      await connect(beto, 'beto-rl6', { tracks: [TRACK_B], playlists: [PLAYLIST_B] });

      const tracks = await app.inject({ method: 'GET', url: '/spotify/tracks', headers: bearer(ana) });
      expect(tracks.json()).toEqual([
        { id: TRACK_A.id, title: TRACK_A.name, artist: 'Banda A', cover: TRACK_A.cover, url: `https://open.spotify.com/track/${TRACK_A.id}` },
      ]);
      const lists = await app.inject({ method: 'GET', url: '/spotify/playlists', headers: bearer(ana) });
      expect(lists.json().map((item: { id: string }) => item.id)).toEqual([PLAYLIST_A.id]);
      expect(tracks.body + lists.body).not.toMatch(SECRET_FIELDS);
    });
  });

  describe('música no story', () => {
    const boundary = '----radar-story-music';

    function storyBody(fields: Record<string, string>) {
      const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
      const extra = Object.entries(fields)
        .map(([name, value]) => `\r\n--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}`)
        .join('');
      return Buffer.concat([
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="s.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
        ),
        jpeg,
        Buffer.from(`${extra}\r\n--${boundary}--\r\n`),
      ]);
    }

    function postStory(p: Person, fields: Record<string, string> = {}) {
      return app.inject({
        method: 'POST',
        url: '/stories',
        headers: { ...bearer(p), 'content-type': `multipart/form-data; boundary=${boundary}` },
        payload: storyBody(fields),
      });
    }

    async function makeFriends(a: Person, b: Person) {
      await exec(
        `INSERT INTO friendships (id, requester_id, receiver_id, status, created_at) VALUES ($1,$2,$3,'accepted',NOW())`,
        [`fr-${a.id}-${b.id}`, a.id, b.id],
      );
    }

    async function storiesOf(viewer: Person, authorId: string) {
      const res = await app.inject({ method: 'GET', url: '/stories', headers: bearer(viewer) });
      const rings = res.json() as Array<{ author: { id: string }; stories: Array<Record<string, any>> }>;
      return rings.find((ring) => ring.author.id === authorId)?.stories ?? [];
    }

    it('story com faixa mostra o card e o autor para quem já vê o story, sem token', async () => {
      const ana = await person('sm1');
      const beto = await person('sb1');
      await makeFriends(ana, beto);
      await connect(ana, 'ana-sm1', { tracks: [TRACK_A], playlists: [PLAYLIST_A] });

      const created = await postStory(ana, { musicKind: 'track', musicId: TRACK_A.id, musicTitle: 'forjado' });
      expect(created.statusCode).toBe(201);
      expect(created.json().music).toMatchObject({
        kind: 'track',
        title: TRACK_A.name,
        artist: 'Banda A',
        cover: TRACK_A.cover,
        addedBy: { id: ana.id, name: ana.name },
      });

      const seen = await storiesOf(beto, ana.id);
      expect(seen).toHaveLength(1);
      expect(seen[0].music).toMatchObject({ title: TRACK_A.name, addedBy: { id: ana.id } });
      expect(JSON.stringify(seen)).not.toMatch(SECRET_FIELDS);
      expect(JSON.stringify(seen)).not.toContain('forjado');
    });

    it('playlist no story aparece como playlist, sem artista', async () => {
      const ana = await person('sm2');
      await connect(ana, 'ana-sm2', { tracks: [], playlists: [PLAYLIST_A] });
      const created = await postStory(ana, { musicKind: 'playlist', musicId: PLAYLIST_A.id });
      expect(created.statusCode).toBe(201);
      expect(created.json().music).toMatchObject({ kind: 'playlist', title: PLAYLIST_A.name, artist: null });
    });

    it('sem conta conectada o story não ganha música', async () => {
      const ana = await person('sm3');
      const res = await postStory(ana, { musicKind: 'track', musicId: TRACK_A.id });
      expect(res.statusCode).toBe(400);
      expect(await storiesOf(ana, ana.id)).toHaveLength(0);
    });

    it('id de outra conta responde 400 e o story não é criado', async () => {
      const ana = await person('sm4');
      const beto = await person('sb4');
      await connect(ana, 'ana-sm4', { tracks: [TRACK_A], playlists: [] });
      await connect(beto, 'beto-sm4', { tracks: [TRACK_B], playlists: [] });

      const res = await postStory(ana, { musicKind: 'track', musicId: TRACK_B.id });
      expect(res.statusCode).toBe(400);
      expect(await storiesOf(ana, ana.id)).toHaveLength(0);
    });

    it('story sem música continua funcionando', async () => {
      const ana = await person('sm5');
      const res = await postStory(ana, { caption: 'sem som' });
      expect(res.statusCode).toBe(201);
      expect(res.json().music).toBeNull();
    });

    it('quem não pode ver o story não recebe a música; e ela some junto com o story em 24 horas', async () => {
      const ana = await person('sm6');
      const beto = await person('sb6');
      const estranho = await person('se6');
      await makeFriends(ana, beto);
      await connect(ana, 'ana-sm6', { tracks: [TRACK_A], playlists: [] });
      const created = await postStory(ana, { musicKind: 'track', musicId: TRACK_A.id });
      expect(created.statusCode).toBe(201);
      const storyId = created.json().id as string;

      expect(await storiesOf(estranho, ana.id)).toHaveLength(0);
      expect(JSON.stringify(await app.inject({ method: 'GET', url: '/stories', headers: bearer(estranho) }).then((r) => r.json()))).not.toContain(TRACK_A.name);
      expect(await storiesOf(beto, ana.id)).toHaveLength(1);

      await exec(`UPDATE stories SET expires_at = $1 WHERE id = $2`, [new Date(Date.now() - 1000).toISOString(), storyId]);
      expect(await storiesOf(beto, ana.id)).toHaveLength(0);
      expect(await storiesOf(ana, ana.id)).toHaveLength(0);
    });
  });
});
