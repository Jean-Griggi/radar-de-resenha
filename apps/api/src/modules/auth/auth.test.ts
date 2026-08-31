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
      payload: { roleId, title: 'Noite boa', content: 'Comida ok, música ótima', rating: 5, ratings: { fun: 5, music: 5 }, tags: ['sexta'] },
    });
    expect(review.statusCode).toBe(201);
    const reviewId = review.json().id as string;

    const listed = await app.inject({ method: 'GET', url: '/reviews', headers: await authHeaders() });
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

    const search = await app.inject({ method: 'GET', url: '/search?q=s', headers: await authHeaders() });
    expect(search.statusCode).toBe(200);
    expect(search.json().tags.length).toBeLessThanOrEqual(8);
    const searchReview = search.json().reviews.find((item: { id: string }) => item.id === reviewId);
    if (searchReview) {
      expect(searchReview.comments).toBeUndefined();
      expect(searchReview.photos).toBeUndefined();
    }

    const exploreRes = await app.inject({ method: 'GET', url: '/explore', headers: await authHeaders() });
    expect(exploreRes.statusCode).toBe(200);
    const exploreReview = exploreRes.json().reviews.find((item: { id: string }) => item.id === reviewId);
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
        payload: { name, email: `${nick}${suffix}@resenha.test`, password: 'secret12', username: nick },
      });
      expect(res.statusCode).toBe(201);
      return { token: res.json().token as string, id: res.json().user.id as string, username: res.json().user.username as string };
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
    expect(created.json()).toMatchObject({ requesterId: a.id, receiverId: b.id, status: 'pending' });
    expect(created.json().requester_id).toBeUndefined();
    const requestId = created.json().id as string;

    const suggestionsA = await app.inject({ method: 'GET', url: '/suggestions', headers: header(a.token) });
    expect(suggestionsA.statusCode).toBe(200);
    expect(suggestionsA.json().some((u: { id: string }) => u.id === b.id)).toBe(true);

    const followB = await app.inject({ method: 'POST', url: `/users/${b.id}/follow`, headers: header(a.token) });
    expect(followB.statusCode).toBe(200);

    const suggestionsAfterFollow = await app.inject({ method: 'GET', url: '/suggestions', headers: header(a.token) });
    expect(suggestionsAfterFollow.json().some((u: { id: string }) => u.id === b.id)).toBe(false);

    const suggestionsB = await app.inject({ method: 'GET', url: '/suggestions', headers: header(b.token) });
    expect(suggestionsB.json().some((u: { id: string }) => u.id === a.id)).toBe(true);

    const crossed = await app.inject({
      method: 'POST',
      url: '/friends/requests',
      headers: header(b.token),
      payload: { userId: a.id },
    });
    expect(crossed.statusCode).toBe(200);
    expect(crossed.json().id).toBe(requestId);
    expect(crossed.json()).toMatchObject({ requesterId: a.id, receiverId: b.id, status: 'pending' });

    const missingStatus = await app.inject({
      method: 'PUT',
      url: `/friends/requests/${requestId}`,
      headers: header(b.token),
      payload: {},
    });
    expect(missingStatus.statusCode).toBe(400);

    const profileB = await app.inject({ method: 'GET', url: `/users/${a.username}`, headers: header(b.token) });
    expect(profileB.json().friendship).toMatchObject({ status: 'pending', requesterId: a.id, receiverId: b.id });

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
    expect(reopen.json()).toMatchObject({ id: secondId, requesterId: a.id, receiverId: b.id, status: 'pending' });

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

    const albums = await app.inject({ method: 'GET', url: '/albums', headers: await authHeaders() });
    expect(albums.statusCode).toBe(200);
    expect(albums.json().some((item: { name: string }) => item.name === 'Noite de testes')).toBe(true);

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
      headers: { ...(await authHeaders()), 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload,
    });
    expect(created.statusCode).toBe(201);
    const photo = created.json() as { id: string; url: string };
    expect(photo.id).toBeTruthy();
    expect(photo.url).toContain('photos/');

    const feed = await app.inject({ method: 'GET', url: '/feed', headers: await authHeaders() });
    expect(feed.statusCode).toBe(200);
    const photoEvent = (feed.json() as { type: string; photo?: { id: string; url: string } }[]).find(
      (item) => item.type === 'photo_added' && item.photo?.id === photo.id,
    );
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
        payload: { name, email: `${nick}${suffix}@resenha.test`, password: 'secret12', username: nick },
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

    const strangerRings = await app.inject({ method: 'GET', url: '/stories', headers: header(b.token) });
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

    const friendRings = await app.inject({ method: 'GET', url: '/stories', headers: header(b.token) });
    const aRing = (friendRings.json() as { author: { id: string }; hasUnseen: boolean; stories: { id: string; viewed: boolean }[] }[]).find(
      (ring) => ring.author.id === a.id,
    );
    expect(aRing?.hasUnseen).toBe(true);
    expect(aRing?.stories[0]?.id).toBe(story.id);

    const viewed = await app.inject({
      method: 'POST',
      url: `/stories/${story.id}/view`,
      headers: header(b.token),
    });
    expect(viewed.statusCode).toBe(200);

    const afterView = await app.inject({ method: 'GET', url: '/stories', headers: header(b.token) });
    const seenRing = (afterView.json() as { author: { id: string }; hasUnseen: boolean; stories: { viewed: boolean }[] }[]).find(
      (ring) => ring.author.id === a.id,
    );
    expect(seenRing?.hasUnseen).toBe(false);
    expect(seenRing?.stories[0]?.viewed).toBe(true);

    const viewers = await app.inject({
      method: 'GET',
      url: `/stories/${story.id}/viewers`,
      headers: header(a.token),
    });
    expect((viewers.json() as { user: { id: string } }[]).some((item) => item.user.id === b.id)).toBe(true);

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

    const notes = await app.inject({ method: 'GET', url: '/notifications', headers: header(a.token) });
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
