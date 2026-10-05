import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../app.js';
import { exec } from '../../db/client.js';
import { AUTH_RATE_LIMIT_MESSAGE, resetAuthRateLimits } from '../../lib/auth-rate-limit.js';

const mailbox = vi.hoisted(() => ({
  sent: [] as Array<{ to: string; subject: string; html: string }>,
  fail: false,
}));

vi.mock('../../lib/mail.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/mail.js')>();
  return {
    ...actual,
    sendMail: vi.fn(async (to: string, subject: string, html: string) => {
      if (mailbox.fail) throw new Error('smtp fora do ar');
      mailbox.sent.push({ to, subject, html });
      return true;
    }),
  };
});

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

  // O limite por IP é por processo; a suíte registra mais contas do que ele permite.
  beforeEach(() => {
    resetAuthRateLimits();
  });

  it('health', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(String(res.headers['content-security-policy'] ?? '')).toContain(
      "frame-ancestors 'none'",
    );
    expect(res.headers['strict-transport-security']).toBeUndefined();
  });

  it('rejects CORS for arbitrary *.vercel.app origins', async () => {
    const blocked = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://qualquer-coisa.vercel.app' },
    });
    expect(blocked.statusCode).toBe(200);
    expect(blocked.headers['access-control-allow-origin']).not.toBe(
      'https://qualquer-coisa.vercel.app',
    );

    const allowed = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:3000' },
    });
    expect(allowed.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');
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

    const session = register.cookies.find((item) => item.name === 'resenhometro_session');
    expect(session?.value).toBeTruthy();
    expect(session?.httpOnly).toBe(true);
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()) as {
      exp?: number;
    };
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));

    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'secret12' },
    });
    expect(login.statusCode).toBe(200);
    expect(login.json().token).toBeTruthy();
  });

  it('session cookie authenticates and logout clears it', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: `qa${suffix}@resenha.test`, password: 'secret12' },
    });
    const session = login.cookies.find((item) => item.name === 'resenhometro_session');
    expect(session?.value).toBeTruthy();

    const me = await app.inject({
      method: 'GET',
      url: '/auth/me',
      cookies: { resenhometro_session: session!.value },
    });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toContain('@resenha.test');

    const logout = await app.inject({
      method: 'POST',
      url: '/auth/logout',
      cookies: { resenhometro_session: session!.value },
    });
    expect(logout.statusCode).toBe(200);
    const cleared = logout.cookies.find((item) => item.name === 'resenhometro_session');
    expect(cleared).toBeTruthy();
    expect(Number(cleared?.maxAge ?? 1)).toBeLessThanOrEqual(0);

    const after = await app.inject({ method: 'GET', url: '/auth/me' });
    expect(after.statusCode).toBe(401);
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

  it('drops the GET /me twin; session is GET /auth/me', async () => {
    const twin = await app.inject({ method: 'GET', url: '/me', headers: await authHeaders() });
    expect(twin.statusCode).toBe(404);

    const session = await app.inject({
      method: 'GET',
      url: '/auth/me',
      headers: await authHeaders(),
    });
    expect(session.statusCode).toBe(200);
    expect(session.json().email).toContain('@resenha.test');
  });

  it('rejects unauthorized role creation', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/roles',
      payload: { title: 'Sem token' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects invalid role payload', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/roles',
      headers: await authHeaders(),
      payload: { title: 'ab' },
    });
    expect(res.statusCode).toBe(400);
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

    const commentsOnly = await app.inject({
      method: 'GET',
      url: `/roles/${roleId}/comments`,
      headers: await authHeaders(),
    });
    expect(commentsOnly.statusCode).toBe(200);
    expect(Array.isArray(commentsOnly.json())).toBe(true);
    expect(commentsOnly.json()[0].content).toBeTruthy();
    expect(commentsOnly.json()[0].goingCount).toBeUndefined();
    expect(commentsOnly.json()[0].coverPhoto).toBeUndefined();

    const attendanceOnly = await app.inject({
      method: 'GET',
      url: `/roles/${roleId}/attendance`,
      headers: await authHeaders(),
    });
    expect(attendanceOnly.statusCode).toBe(200);
    expect(Array.isArray(attendanceOnly.json())).toBe(true);
    expect(attendanceOnly.json()[0].userId).toBeTruthy();

    const roleDetail = await app.inject({
      method: 'GET',
      url: `/roles/${roleId}`,
      headers: await authHeaders(),
    });
    expect(roleDetail.statusCode).toBe(200);
    expect(Array.isArray(roleDetail.json().comments)).toBe(true);
    expect(Array.isArray(roleDetail.json().photos)).toBe(true);
    expect(Array.isArray(roleDetail.json().attendances)).toBe(true);
  });

  it('review + reaction + feed + stats', async () => {
    const review = await app.inject({
      method: 'POST',
      url: '/reviews',
      headers: await authHeaders(),
      payload: {
        roleId,
        title: 'Noite boa',
        content: 'Comida ok, música ótima',
        rating: 5,
        ratings: { fun: 5, music: 5 },
        tags: ['sexta'],
      },
    });
    expect(review.statusCode).toBe(201);
    const reviewId = review.json().id as string;

    const listed = await app.inject({
      method: 'GET',
      url: '/reviews',
      headers: await authHeaders(),
    });
    expect(listed.statusCode).toBe(200);
    const listedItem = listed.json().find((item: { id: string }) => item.id === reviewId);
    expect(listedItem).toBeTruthy();
    expect(listedItem.comments).toBeUndefined();
    expect(listedItem.photos).toBeUndefined();
    expect(listedItem.audios).toBeUndefined();

    const reviewDetail = await app.inject({
      method: 'GET',
      url: `/reviews/${reviewId}`,
      headers: await authHeaders(),
    });
    expect(reviewDetail.statusCode).toBe(200);
    expect(Array.isArray(reviewDetail.json().comments)).toBe(true);

    const search = await app.inject({
      method: 'GET',
      url: '/search?q=s',
      headers: await authHeaders(),
    });
    expect(search.statusCode).toBe(200);
    expect(search.json().tags.length).toBeLessThanOrEqual(8);
    const searchReview = search.json().reviews.find((item: { id: string }) => item.id === reviewId);
    if (searchReview) {
      expect(searchReview.comments).toBeUndefined();
      expect(searchReview.photos).toBeUndefined();
    }

    const exploreRes = await app.inject({
      method: 'GET',
      url: '/explore',
      headers: await authHeaders(),
    });
    expect(exploreRes.statusCode).toBe(200);
    const exploreReview = exploreRes
      .json()
      .reviews.find((item: { id: string }) => item.id === reviewId);
    if (exploreReview) {
      expect(exploreReview.comments).toBeUndefined();
      expect(exploreReview.photos).toBeUndefined();
    }

    const content = await app.inject({
      method: 'GET',
      url: `/users/qa${suffix}/content`,
      headers: await authHeaders(),
    });
    expect(content.statusCode).toBe(200);
    expect(content.json().roles.length).toBeLessThanOrEqual(20);
    expect(content.json().photos.length).toBeLessThanOrEqual(20);

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

    const roles = await app.inject({ method: 'GET', url: '/roles', headers: await authHeaders() });
    expect(roles.statusCode).toBe(200);
    expect(Array.isArray(roles.json())).toBe(true);
    expect(roles.json().some((item: { id: string }) => item.id === roleId)).toBe(true);

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

    const feed = await app.inject({ method: 'GET', url: '/feed', headers: await authHeaders() });
    expect(feed.statusCode).toBe(200);
    expect(Array.isArray(feed.json())).toBe(true);
  });

  it('friend request: accept, reject reopen, crossed and cancel', async () => {
    async function register(name: string, nick: string) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name,
          email: `${nick}${suffix}@resenha.test`,
          password: 'secret12',
          username: nick,
        },
      });
      expect(res.statusCode).toBe(201);
      return {
        token: res.json().token as string,
        id: res.json().user.id as string,
        username: res.json().user.username as string,
      };
    }

    const a = await register('Amigo A', `fa${suffix}`);
    const b = await register('Amigo B', `fb${suffix}`);
    const header = (token: string) => ({ authorization: `Bearer ${token}` });

    const created = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      headers: header(a.token),
      payload: { userId: b.id },
    });
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      requesterId: a.id,
      receiverId: b.id,
      status: 'pending',
    });
    expect(created.json().requester_id).toBeUndefined();
    const requestId = created.json().id as string;

    const suggestionsA = await app.inject({
      method: 'GET',
      url: '/suggestions',
      headers: header(a.token),
    });
    expect(suggestionsA.statusCode).toBe(200);
    expect(suggestionsA.json().some((u: { id: string }) => u.id === b.id)).toBe(true);

    const followB = await app.inject({
      method: 'POST',
      url: `/users/${b.id}/follow`,
      headers: header(a.token),
    });
    expect(followB.statusCode).toBe(200);

    const suggestionsAfterFollow = await app.inject({
      method: 'GET',
      url: '/suggestions',
      headers: header(a.token),
    });
    expect(suggestionsAfterFollow.json().some((u: { id: string }) => u.id === b.id)).toBe(false);

    const suggestionsB = await app.inject({
      method: 'GET',
      url: '/suggestions',
      headers: header(b.token),
    });
    expect(suggestionsB.json().some((u: { id: string }) => u.id === a.id)).toBe(true);

    const crossed = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      headers: header(b.token),
      payload: { userId: a.id },
    });
    expect(crossed.statusCode).toBe(200);
    expect(crossed.json().id).toBe(requestId);
    expect(crossed.json()).toMatchObject({
      requesterId: a.id,
      receiverId: b.id,
      status: 'pending',
    });

    const missingStatus = await app.inject({
      method: 'PUT',
      url: `/friends/requests/${requestId}`,
      headers: header(b.token),
      payload: {},
    });
    expect(missingStatus.statusCode).toBe(400);

    const profileB = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(b.token),
    });
    expect(profileB.json().friendship).toMatchObject({
      status: 'pending',
      requesterId: a.id,
      receiverId: b.id,
    });

    const accepted = await app.inject({
      method: 'PUT',
      url: `/friends/requests/${requestId}`,
      headers: header(b.token),
      payload: { status: 'accepted' },
    });
    expect(accepted.statusCode).toBe(200);

    const friendsA = await app.inject({ method: 'GET', url: '/friends', headers: header(a.token) });
    const friendsB = await app.inject({ method: 'GET', url: '/friends', headers: header(b.token) });
    expect(friendsA.json().some((u: { id: string }) => u.id === b.id)).toBe(true);
    expect(friendsB.json().some((u: { id: string }) => u.id === a.id)).toBe(true);

    const already = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      headers: header(a.token),
      payload: { userId: b.id },
    });
    expect(already.statusCode).toBe(400);
    expect(already.json().message).toBe('Vocês já são amigos');

    const unfriend = await app.inject({
      method: 'DELETE',
      url: `/friends/${requestId}`,
      headers: header(a.token),
    });
    expect(unfriend.statusCode).toBe(204);

    const again = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      headers: header(a.token),
      payload: { userId: b.id },
    });
    expect(again.statusCode).toBe(201);
    const secondId = again.json().id as string;

    const rejected = await app.inject({
      method: 'PUT',
      url: `/friends/requests/${secondId}`,
      headers: header(b.token),
      payload: { status: 'rejected' },
    });
    expect(rejected.statusCode).toBe(200);

    const reopen = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      headers: header(a.token),
      payload: { userId: b.id },
    });
    expect(reopen.statusCode).toBe(201);
    expect(reopen.json()).toMatchObject({
      id: secondId,
      requesterId: a.id,
      receiverId: b.id,
      status: 'pending',
    });

    const cancelForbidden = await app.inject({
      method: 'DELETE',
      url: `/friends/requests/${secondId}`,
      headers: header(b.token),
    });
    expect(cancelForbidden.statusCode).toBe(403);

    const cancel = await app.inject({
      method: 'DELETE',
      url: `/friends/requests/${secondId}`,
      headers: header(a.token),
    });
    expect(cancel.statusCode).toBe(204);
  });

  it('accepts HEIC sign, stores photo path and hydrates feed photo url', async () => {
    const heic = await app.inject({
      method: 'POST',
      url: '/storage/sign',
      headers: await authHeaders(),
      payload: { kind: 'photo', contentType: 'image/heic', filename: 'IMG_1.HEIC' },
    });
    expect(heic.statusCode).not.toBe(400);

    const pdf = await app.inject({
      method: 'POST',
      url: '/storage/sign',
      headers: await authHeaders(),
      payload: { kind: 'photo', contentType: 'application/pdf', filename: 'doc.pdf' },
    });
    expect(pdf.statusCode).toBe(400);

    const album = await app.inject({
      method: 'POST',
      url: '/albums',
      headers: await authHeaders(),
      payload: { name: 'Noite de testes' },
    });
    expect(album.statusCode).toBe(201);

    const albums = await app.inject({
      method: 'GET',
      url: '/albums',
      headers: await authHeaders(),
    });
    expect(albums.statusCode).toBe(200);
    expect(albums.json().some((item: { name: string }) => item.name === 'Noite de testes')).toBe(
      true,
    );

    const boundary = '----radar-test';
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="foto.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      jpeg,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const created = await app.inject({
      method: 'POST',
      url: '/photos',
      headers: {
        ...(await authHeaders()),
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const photo = created.json() as { id: string; url: string };
    expect(photo.id).toBeTruthy();
    expect(photo.url).toContain('photos/');

    const feed = await app.inject({ method: 'GET', url: '/feed', headers: await authHeaders() });
    expect(feed.statusCode).toBe(200);
    const photoEvent = (
      feed.json() as { type: string; photo?: { id: string; url: string } }[]
    ).find((item) => item.type === 'photo_added' && item.photo?.id === photo.id);
    expect(photoEvent?.photo?.url).toBeTruthy();
    expect(photoEvent?.photo?.url).toContain('photos/');

    const removed = await app.inject({
      method: 'DELETE',
      url: `/photos/${photo.id}`,
      headers: await authHeaders(),
    });
    expect(removed.statusCode).toBe(204);
  });

  it('stories: friends-only, view, reply and delete', async () => {
    async function register(name: string, nick: string) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name,
          email: `${nick}${suffix}@resenha.test`,
          password: 'secret12',
          username: nick,
        },
      });
      expect(res.statusCode).toBe(201);
      return { token: res.json().token as string, id: res.json().user.id as string };
    }

    const a = await register('Story A', `sa${suffix}`);
    const b = await register('Story B', `sb${suffix}`);
    const header = (token: string) => ({ authorization: `Bearer ${token}` });

    const signOk = await app.inject({
      method: 'POST',
      url: '/storage/sign',
      headers: header(a.token),
      payload: { kind: 'story', contentType: 'image/jpeg', filename: 'x.jpg' },
    });
    expect(signOk.statusCode).toBe(200);

    const signVideo = await app.inject({
      method: 'POST',
      url: '/storage/sign',
      headers: header(a.token),
      payload: { kind: 'story', contentType: 'video/mp4', filename: 'x.mp4' },
    });
    expect(signVideo.statusCode).toBe(200);

    const signPdf = await app.inject({
      method: 'POST',
      url: '/storage/sign',
      headers: header(a.token),
      payload: { kind: 'story', contentType: 'application/pdf', filename: 'x.pdf' },
    });
    expect(signPdf.statusCode).toBe(400);

    const boundary = '----radar-story';
    const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xd9]);
    const payload = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="story.jpg"\r\nContent-Type: image/jpeg\r\n\r\n`,
      ),
      jpeg,
      Buffer.from(
        `\r\n--${boundary}\r\nContent-Disposition: form-data; name="caption"\r\n\r\nnoite boa\r\n--${boundary}--\r\n`,
      ),
    ]);
    const created = await app.inject({
      method: 'POST',
      url: '/stories',
      headers: { ...header(a.token), 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const story = created.json() as { id: string; caption: string; url: string; mediaType: string };
    expect(story.caption).toBe('noite boa');
    expect(story.mediaType).toBe('photo');
    expect(story.url).toContain('stories/');

    const strangerRings = await app.inject({
      method: 'GET',
      url: '/stories',
      headers: header(b.token),
    });
    expect(
      (strangerRings.json() as { author: { id: string }; stories: unknown[] }[]).some(
        (ring) => ring.author.id === a.id && ring.stories.length > 0,
      ),
    ).toBe(false);

    const forbiddenView = await app.inject({
      method: 'POST',
      url: `/stories/${story.id}/view`,
      headers: header(b.token),
    });
    expect(forbiddenView.statusCode).toBe(403);

    const request = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      headers: header(a.token),
      payload: { userId: b.id },
    });
    expect(request.statusCode).toBe(201);
    const accepted = await app.inject({
      method: 'PUT',
      url: `/friends/requests/${request.json().id}`,
      headers: header(b.token),
      payload: { status: 'accepted' },
    });
    expect(accepted.statusCode).toBe(200);

    const friendRings = await app.inject({
      method: 'GET',
      url: '/stories',
      headers: header(b.token),
    });
    const aRing = (
      friendRings.json() as {
        author: { id: string };
        hasUnseen: boolean;
        stories: { id: string; viewed: boolean }[];
      }[]
    ).find((ring) => ring.author.id === a.id);
    expect(aRing?.hasUnseen).toBe(true);
    expect(aRing?.stories[0]?.id).toBe(story.id);

    const viewed = await app.inject({
      method: 'POST',
      url: `/stories/${story.id}/view`,
      headers: header(b.token),
    });
    expect(viewed.statusCode).toBe(200);

    const afterView = await app.inject({
      method: 'GET',
      url: '/stories',
      headers: header(b.token),
    });
    const seenRing = (
      afterView.json() as {
        author: { id: string };
        hasUnseen: boolean;
        stories: { viewed: boolean }[];
      }[]
    ).find((ring) => ring.author.id === a.id);
    expect(seenRing?.hasUnseen).toBe(false);
    expect(seenRing?.stories[0]?.viewed).toBe(true);

    const viewers = await app.inject({
      method: 'GET',
      url: `/stories/${story.id}/viewers`,
      headers: header(a.token),
    });
    expect(
      (viewers.json() as { user: { id: string } }[]).some((item) => item.user.id === b.id),
    ).toBe(true);

    const viewersForbidden = await app.inject({
      method: 'GET',
      url: `/stories/${story.id}/viewers`,
      headers: header(b.token),
    });
    expect(viewersForbidden.statusCode).toBe(403);

    const reply = await app.inject({
      method: 'POST',
      url: `/stories/${story.id}/reply`,
      headers: header(b.token),
      payload: { content: 'top demais' },
    });
    expect(reply.statusCode).toBe(200);

    const notes = await app.inject({
      method: 'GET',
      url: '/notifications',
      headers: header(a.token),
    });
    expect(
      (notes.json() as { type: string; message: string }[]).some(
        (item) => item.type === 'story_reply' && item.message.includes('top demais'),
      ),
    ).toBe(true);

    const removedStory = await app.inject({
      method: 'DELETE',
      url: `/stories/${story.id}`,
      headers: header(a.token),
    });
    expect(removedStory.statusCode).toBe(204);
  });

  describe('recuperar senha', () => {
    const FORGOT = '/auth/forgot-password';
    const RESET = '/auth/reset-password';

    async function newAccount(tag: string) {
      const email = `${tag}${suffix}@resenha.test`;
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: { name: `Reset ${tag}`, email, password: 'secret12', username: `${tag}${suffix}` },
      });
      expect(res.statusCode).toBe(201);
      return { email, id: res.json().user.id as string };
    }

    function forgot(email: string) {
      return app.inject({ method: 'POST', url: FORGOT, payload: { email } });
    }

    function reset(token: string, password: string) {
      return app.inject({ method: 'POST', url: RESET, payload: { token, password } });
    }

    function login(email: string, password: string) {
      return app.inject({ method: 'POST', url: '/auth/login', payload: { email, password } });
    }

    function tokenFrom(html: string) {
      const match = html.match(/redefinir-senha\?token=([a-f0-9]+)/);
      expect(match).toBeTruthy();
      return match![1];
    }

    beforeEach(() => {
      mailbox.sent.length = 0;
      mailbox.fail = false;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('responde igual com e sem conta, sem link nem token, e só manda e-mail para conta real', async () => {
      const { email } = await newAccount('rp1');
      const known = await forgot(email);
      const unknown = await forgot(`ninguem${suffix}@resenha.test`);

      expect(known.statusCode).toBe(200);
      expect(unknown.statusCode).toBe(200);
      expect(known.json()).toEqual(unknown.json());
      expect(Object.keys(known.json()).sort()).toEqual(['message', 'ok']);

      expect(mailbox.sent).toHaveLength(1);
      expect(mailbox.sent[0].to).toBe(email);
      const token = tokenFrom(mailbox.sent[0].html);
      expect(known.body).not.toContain(token);
      expect(known.body).not.toContain('redefinir-senha');
    });

    it('e-mail usa a origem da web, a marca Redesenha e não usa violeta', async () => {
      const { email } = await newAccount('rp2');
      await forgot(email);
      const { html } = mailbox.sent[0];
      expect(html).toContain('http://localhost:3000/redefinir-senha?token=');
      expect(html).toContain('RESENHÔMETRO');
      expect(html).not.toMatch(/#8b5cf6|#a78bfa|#d946ef|violet|purple/i);
    });

    it('envio que falha não muda a resposta nem entrega o link', async () => {
      const { email } = await newAccount('rp3');
      mailbox.fail = true;
      vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.spyOn(console, 'info').mockImplementation(() => {});
      const res = await forgot(email);
      expect(res.statusCode).toBe(200);
      expect(Object.keys(res.json()).sort()).toEqual(['message', 'ok']);
      expect(res.body).not.toContain('token');
    });

    it('em produção o token não aparece em nenhum log', async () => {
      const { email } = await newAccount('rp4');
      const logs: string[] = [];
      for (const level of ['log', 'info', 'warn', 'error'] as const) {
        vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
          logs.push(args.map(String).join(' '));
        });
      }
      const previous = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        mailbox.fail = true; // pior caso: o e-mail não saiu
        await forgot(email);
        mailbox.fail = false;
        await forgot(email);
      } finally {
        process.env.NODE_ENV = previous;
      }
      const token = tokenFrom(mailbox.sent[0].html);
      expect(logs.join('\n')).not.toContain(token);
      expect(logs.join('\n')).not.toContain('redefinir-senha');
    });

    it('novo pedido invalida o link anterior que não foi usado', async () => {
      const { email } = await newAccount('rp5');
      await forgot(email);
      await forgot(email);
      const [first, second] = mailbox.sent.map((mail) => tokenFrom(mail.html));
      expect(first).not.toBe(second);

      expect((await reset(first, 'novaSenha9')).statusCode).toBe(400);
      expect((await reset(second, 'novaSenha9')).statusCode).toBe(200);
    });

    it('o sexto pedido do mesmo e-mail em 15 min responde 429 sem revelar a conta', async () => {
      const { email } = await newAccount('rp6');
      const missing = `fantasma${suffix}@resenha.test`;

      async function sixth(target: string) {
        resetAuthRateLimits(); // cada e-mail numa janela de IP limpa: aqui só o limite por e-mail pode disparar
        for (let i = 0; i < 5; i += 1) expect((await forgot(target)).statusCode).toBe(200);
        return forgot(target);
      }

      const real = await sixth(email);
      const fake = await sixth(missing);
      expect(real.statusCode).toBe(429);
      expect(fake.statusCode).toBe(429);
      expect(real.json()).toEqual(fake.json());
    });

    it('o décimo primeiro pedido do mesmo IP responde 429 sem revelar a conta', async () => {
      const { email } = await newAccount('rp7');
      for (let i = 0; i < 10; i += 1) {
        expect((await forgot(i === 0 ? email : `x${i}${suffix}@resenha.test`)).statusCode).toBe(200);
      }
      const limited = await forgot(`y${suffix}@resenha.test`);
      expect(limited.statusCode).toBe(429);
      expect(limited.json().message).toBe(AUTH_RATE_LIMIT_MESSAGE);
    });

    it('troca a senha pelo link: a nova entra, a antiga não, e o link não serve de novo', async () => {
      const { email } = await newAccount('rp8');
      await forgot(email);
      const token = tokenFrom(mailbox.sent[0].html);

      const done = await reset(token, 'novaSenha9');
      expect(done.statusCode).toBe(200);
      expect(done.body).not.toContain('novaSenha9');
      expect(done.body).not.toContain(token);

      expect((await login(email, 'secret12')).statusCode).toBe(401);
      expect((await login(email, 'novaSenha9')).statusCode).toBe(200);

      expect((await reset(token, 'outraSenha1')).statusCode).toBe(400);
      expect((await login(email, 'novaSenha9')).statusCode).toBe(200);
    });

    it('senha curta responde 400, não grava e o link continua valendo', async () => {
      const { email } = await newAccount('rp9');
      await forgot(email);
      const token = tokenFrom(mailbox.sent[0].html);

      expect((await reset(token, '1234567')).statusCode).toBe(400);
      expect((await login(email, 'secret12')).statusCode).toBe(200);
      expect((await reset(token, 'novaSenha9')).statusCode).toBe(200);
    });

    it('token inválido ou expirado responde 400 sem trocar a senha', async () => {
      const { email, id } = await newAccount('rp10');
      const invalid = await reset('f'.repeat(64), 'novaSenha9');
      expect(invalid.statusCode).toBe(400);
      expect(invalid.json().message).toMatch(/outro e-mail/i);

      await forgot(email);
      const token = tokenFrom(mailbox.sent[0].html);
      await exec(`UPDATE password_resets SET expires_at = $1 WHERE user_id = $2`, [
        new Date(Date.now() - 1000).toISOString(),
        id,
      ]);

      const expired = await reset(token, 'novaSenha9');
      expect(expired.statusCode).toBe(400);
      expect(expired.json().message).toBe(invalid.json().message);
      expect((await login(email, 'secret12')).statusCode).toBe(200);
    });

    it('sessão emitida antes do reset deixa de autenticar; a nova entra', async () => {
      const { email, id } = await newAccount('rp11');
      const before = app.jwt.sign({ sub: id, email, iat: Math.floor(Date.now() / 1000) - 120 });
      const headers = { authorization: `Bearer ${before}` };
      expect((await app.inject({ method: 'GET', url: '/auth/me', headers })).statusCode).toBe(200);

      await forgot(email);
      const token = tokenFrom(mailbox.sent[0].html);
      expect((await reset(token, 'novaSenha9')).statusCode).toBe(200);

      expect((await app.inject({ method: 'GET', url: '/auth/me', headers })).statusCode).toBe(401);

      const fresh = await login(email, 'novaSenha9');
      expect(fresh.statusCode).toBe(200);
      const after = await app.inject({
        method: 'GET',
        url: '/auth/me',
        headers: { authorization: `Bearer ${fresh.json().token}` },
      });
      expect(after.statusCode).toBe(200);
    });
  });

  it('rate-limits 20 login attempts from the same IP', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 20; i += 1) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'nobody@resenha.test', password: 'whatever1' },
      });
      statuses.push(res.statusCode);
    }
    expect(statuses).toContain(429);
    const limited = statuses.findLast((code) => code === 429);
    expect(limited).toBe(429);

    const extra = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'nobody@resenha.test', password: 'whatever1' },
    });
    expect(extra.statusCode).toBe(429);
    expect(extra.json().message).toBe(AUTH_RATE_LIMIT_MESSAGE);
  });

  it('rejects passwords shorter than 8 on register', async () => {
    const short = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Curto',
        email: `short${suffix}@resenha.test`,
        password: '1234567',
        username: `short${suffix}`,
      },
    });
    expect(short.statusCode).toBe(400);

    const ok = await app.inject({
      method: 'POST',
      url: '/auth/register',
      payload: {
        name: 'Oito',
        email: `eight${suffix}@resenha.test`,
        password: '12345678',
        username: `eight${suffix}`,
      },
    });
    expect(ok.statusCode).toBe(201);
    expect(ok.json().user.email).toContain('@resenha.test');
  });

  it('hides email on other profiles and private content from strangers', async () => {
    async function register(name: string, nick: string) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name,
          email: `${nick}${suffix}@resenha.test`,
          password: 'secret12',
          username: nick,
        },
      });
      expect(res.statusCode).toBe(201);
      return {
        token: res.json().token as string,
        id: res.json().user.id as string,
        username: res.json().user.username as string,
      };
    }

    const a = await register('Priv A', `pa${suffix}`);
    const b = await register('Priv B', `pb${suffix}`);
    const header = (token: string) => ({ authorization: `Bearer ${token}` });
    const point = { latitude: -23.5, longitude: -46.625 };

    const savedPoint = await app.inject({
      method: 'PUT',
      url: '/users/me',
      headers: header(a.token),
      payload: { ...point, placeName: '  casa  ' },
    });
    expect(savedPoint.statusCode).toBe(200);
    expect(JSON.stringify(savedPoint.json())).not.toMatch(
      /AIza|googleMaps|mapsApiKey|GOOGLE_MAPS/i,
    );

    const ownPoint = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(a.token),
    });
    expect(ownPoint.json().latitude).toBe(point.latitude);
    expect(ownPoint.json().longitude).toBe(point.longitude);
    expect(ownPoint.json().placeName).toBe('casa');
    expect(JSON.stringify(ownPoint.json())).not.toMatch(/AIza|googleMaps|mapsApiKey|GOOGLE_MAPS/i);

    const publicProfile = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(b.token),
    });
    expect(publicProfile.statusCode).toBe(200);
    expect(publicProfile.json().email).toBeUndefined();
    expect(publicProfile.json().latitude).toBe(point.latitude);
    expect(publicProfile.json().longitude).toBe(point.longitude);
    expect(publicProfile.json().placeName).toBe('casa');

    const madePrivate = await app.inject({
      method: 'PUT',
      url: '/users/me',
      headers: header(a.token),
      payload: { isPublic: false },
    });
    expect(madePrivate.statusCode).toBe(200);
    expect(madePrivate.json().email).toContain('@resenha.test');
    expect(madePrivate.json().isPublic).toBe(false);

    const ownerAfterPrivate = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(a.token),
    });
    expect(ownerAfterPrivate.json().latitude).toBe(point.latitude);
    expect(ownerAfterPrivate.json().longitude).toBe(point.longitude);
    expect(ownerAfterPrivate.json().placeName).toBe('casa');

    const role = await app.inject({
      method: 'POST',
      url: '/roles',
      headers: header(a.token),
      payload: { title: 'Rolê secreto da privacidade' },
    });
    expect(role.statusCode).toBe(201);

    const me = await app.inject({ method: 'GET', url: '/auth/me', headers: header(a.token) });
    expect(me.statusCode).toBe(200);
    expect(me.json().email).toContain('@resenha.test');

    const strangerProfile = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(b.token),
    });
    expect(strangerProfile.statusCode).toBe(200);
    expect(strangerProfile.json().email).toBeUndefined();
    expect(strangerProfile.json().username).toBe(a.username);
    expect(strangerProfile.json().stats.roles).toBe(0);
    expect(strangerProfile.json().latitude).toBeUndefined();
    expect(strangerProfile.json().longitude).toBeUndefined();
    expect(strangerProfile.json().placeName).toBeUndefined();

    const strangerContent = await app.inject({
      method: 'GET',
      url: `/users/${a.username}/content`,
      headers: header(b.token),
    });
    expect(strangerContent.statusCode).toBe(200);
    expect(strangerContent.json().roles).toEqual([]);

    const search = await app.inject({
      method: 'GET',
      url: `/search?q=${a.username}`,
      headers: header(b.token),
    });
    const person = (
      search.json().people as {
        username: string;
        email?: string;
        latitude?: number;
        placeName?: string;
      }[]
    ).find((item) => item.username === a.username);
    expect(person?.email).toBeUndefined();
    expect(person?.latitude).toBeUndefined();
    expect(person?.placeName).toBeUndefined();

    const ownContent = await app.inject({
      method: 'GET',
      url: `/users/${a.username}/content`,
      headers: header(a.token),
    });
    expect(
      ownContent.json().roles.some((item: { title: string }) => item.title.includes('secreto')),
    ).toBe(true);

    const follow = await app.inject({
      method: 'POST',
      url: `/users/${a.id}/follow`,
      headers: header(b.token),
    });
    expect(follow.statusCode).toBe(200);

    const followerContent = await app.inject({
      method: 'GET',
      url: `/users/${a.username}/content`,
      headers: header(b.token),
    });
    expect(followerContent.json().roles.length).toBeGreaterThan(0);

    const followerProfile = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(b.token),
    });
    expect(followerProfile.json().latitude).toBe(point.latitude);
    expect(followerProfile.json().longitude).toBe(point.longitude);
    expect(followerProfile.json().placeName).toBe('casa');

    const otherSession = await app.inject({
      method: 'PUT',
      url: '/users/me',
      headers: header(b.token),
      payload: { id: a.id, latitude: 10, longitude: 20, placeName: 'trabalho' },
    });
    expect(otherSession.statusCode).toBe(200);
    expect(otherSession.json().id).toBe(b.id);

    const ownerUntouched = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(a.token),
    });
    expect(ownerUntouched.json().latitude).toBe(point.latitude);
    expect(ownerUntouched.json().longitude).toBe(point.longitude);
    expect(ownerUntouched.json().placeName).toBe('casa');

    async function rejectAndKeep(payload: Record<string, unknown>) {
      const rejected = await app.inject({
        method: 'PUT',
        url: '/users/me',
        headers: header(a.token),
        payload,
      });
      expect(rejected.statusCode).toBe(400);
      expect(rejected.body).not.toContain(String(point.latitude));
      expect(rejected.body).not.toContain(String(point.longitude));
      const after = await app.inject({
        method: 'GET',
        url: `/users/${a.username}`,
        headers: header(a.token),
      });
      expect(after.json().latitude).toBe(point.latitude);
      expect(after.json().longitude).toBe(point.longitude);
      expect(after.json().placeName).toBe('casa');
    }

    await rejectAndKeep({ latitude: 91, longitude: 10 });
    await rejectAndKeep({ latitude: 10, longitude: 181 });
    await rejectAndKeep({ latitude: 12 });
    await rejectAndKeep({ latitude: null, longitude: 10 });
    await rejectAndKeep({ placeName: 'escritorio' });
    await rejectAndKeep({ latitude: null, longitude: null, placeName: 'casa' });
    await rejectAndKeep({ ...point, placeName: 'c'.repeat(41) });

    const cleared = await app.inject({
      method: 'PUT',
      url: '/users/me',
      headers: header(a.token),
      payload: { latitude: null, longitude: null },
    });
    expect(cleared.statusCode).toBe(200);

    const gone = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(a.token),
    });
    expect(gone.json().latitude).toBeUndefined();
    expect(gone.json().longitude).toBeUndefined();
    expect(gone.json().placeName).toBeUndefined();

    const followerAfterClear = await app.inject({
      method: 'GET',
      url: `/users/${a.username}`,
      headers: header(b.token),
    });
    expect(followerAfterClear.json().latitude).toBeUndefined();
    expect(followerAfterClear.json().longitude).toBeUndefined();
    expect(followerAfterClear.json().placeName).toBeUndefined();
  });

  it('mapa lista só os pontos que o perfil já mostraria', async () => {
    async function register(name: string, nick: string) {
      const res = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          name,
          email: `${nick}${suffix}@resenha.test`,
          password: 'secret12',
          username: nick,
        },
      });
      expect(res.statusCode).toBe(201);
      return {
        token: res.json().token as string,
        id: res.json().user.id as string,
        username: res.json().user.username as string,
      };
    }

    const header = (token: string) => ({ authorization: `Bearer ${token}` });
    const open = await register('Mapa Aberto', `ma${suffix}`);
    const hidden = await register('Mapa Fechado', `mf${suffix}`);
    const viewer = await register('Mapa Olho', `mo${suffix}`);
    const blank = await register('Mapa Vazio', `mv${suffix}`);

    const casa = { latitude: -23.55, longitude: -46.63, placeName: 'casa' };
    const trabalho = { latitude: -22.9, longitude: -43.2, placeName: 'trabalho' };

    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/users/me',
          headers: header(open.token),
          payload: casa,
        })
      ).statusCode,
    ).toBe(200);
    expect(
      (
        await app.inject({
          method: 'PUT',
          url: '/users/me',
          headers: header(hidden.token),
          payload: { ...trabalho, isPublic: false },
        })
      ).statusCode,
    ).toBe(200);

    const anon = await app.inject({ method: 'GET', url: '/users/map' });
    expect(anon.statusCode).toBe(401);

    type MapEntry = {
      id: string;
      username: string;
      avatar: string | null;
      latitude?: number;
      longitude?: number;
      placeName?: string;
      email?: string;
      cover?: string;
    };

    async function mapOf(token: string) {
      const res = await app.inject({ method: 'GET', url: '/users/map', headers: header(token) });
      expect(res.statusCode).toBe(200);
      expect(JSON.stringify(res.json())).not.toMatch(/AIza|googleMaps|mapsApiKey|GOOGLE_MAPS/i);
      return res.json() as MapEntry[];
    }

    async function profileOf(token: string, username: string) {
      const res = await app.inject({
        method: 'GET',
        url: `/users/${username}`,
        headers: header(token),
      });
      expect(res.statusCode).toBe(200);
      return res.json() as MapEntry;
    }

    function entry(list: MapEntry[], username: string) {
      return list.find((item) => item.username === username);
    }

    function sameAsProfile(point: MapEntry | undefined, profile: MapEntry) {
      expect(point).toBeDefined();
      expect(point?.latitude).toBe(profile.latitude);
      expect(point?.longitude).toBe(profile.longitude);
      expect(point?.placeName).toBe(profile.placeName);
      expect(point?.avatar).toBe(profile.avatar ?? null);
      expect(point?.email).toBeUndefined();
      expect(point?.cover).toBeUndefined();
      expect(JSON.stringify(point)).not.toContain('email');
    }

    const strangerMap = await mapOf(viewer.token);
    const openProfile = await profileOf(viewer.token, open.username);
    const hiddenProfile = await profileOf(viewer.token, hidden.username);
    sameAsProfile(entry(strangerMap, open.username), openProfile);
    expect(entry(strangerMap, hidden.username)).toBeUndefined();
    expect(hiddenProfile.latitude).toBeUndefined();
    expect(hiddenProfile.placeName).toBeUndefined();
    expect(entry(strangerMap, blank.username)).toBeUndefined();
    expect(entry(strangerMap, viewer.username)).toBeUndefined();

    const ownHidden = await mapOf(hidden.token);
    sameAsProfile(entry(ownHidden, hidden.username), await profileOf(hidden.token, hidden.username));

    const followed = await app.inject({
      method: 'POST',
      url: `/users/${hidden.id}/follow`,
      headers: header(viewer.token),
    });
    expect(followed.statusCode).toBe(200);
    const followerMap = await mapOf(viewer.token);
    sameAsProfile(entry(followerMap, hidden.username), await profileOf(viewer.token, hidden.username));

    const unfollowed = await app.inject({
      method: 'DELETE',
      url: `/users/${hidden.id}/follow`,
      headers: header(viewer.token),
    });
    expect(unfollowed.statusCode).toBe(200);
    expect(entry(await mapOf(viewer.token), hidden.username)).toBeUndefined();

    const asked = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      headers: header(viewer.token),
      payload: { userId: hidden.id },
    });
    expect(asked.statusCode).toBe(201);
    expect(entry(await mapOf(viewer.token), hidden.username)).toBeUndefined();

    const accepted = await app.inject({
      method: 'PUT',
      url: `/friends/requests/${asked.json().id}`,
      headers: header(hidden.token),
      payload: { status: 'accepted' },
    });
    expect(accepted.statusCode).toBe(200);
    const friendMap = await mapOf(viewer.token);
    sameAsProfile(entry(friendMap, hidden.username), await profileOf(viewer.token, hidden.username));
    expect(entry(friendMap, hidden.username)?.placeName).toBe('trabalho');
    expect(entry(friendMap, open.username)?.placeName).toBe('casa');
    expect(entry(friendMap, open.username)?.avatar ?? null).toBe(openProfile.avatar ?? null);
  });
});
