import { randomUUID } from 'node:crypto';
import { exec, query, queryOne } from '../../db/client.js';
import {
  addFeedEvent,
  evaluateAchievements,
  getReactionSummary,
  getUserRow,
  getUsersByIds,
  mapUser,
  nowIso,
  notify,
  parseJson,
} from '../../lib/helpers.js';
import { badRequest, forbidden, notFound } from '../../lib/http.js';
import { nestComments } from '../roles/roles.service.js';

export async function addComment(
  userId: string,
  input: { targetType: string; targetId: string; content: string; parentId?: string | null },
) {
  if (input.parentId) {
    const parent = await queryOne<{ id: string; author_id: string; target_id: string }>(
      `SELECT id, author_id, target_id FROM comments WHERE id = $1`,
      [input.parentId],
    );
    if (!parent) throw notFound('Comentário não encontrado');
  }

  const id = randomUUID();
  const stamp = nowIso();
  await exec(
    `INSERT INTO comments (id, author_id, target_type, target_id, parent_id, content, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, userId, input.targetType, input.targetId, input.parentId ?? null, input.content, stamp, stamp],
  );

  const actor = await getUserRow(userId);
  const link =
    input.targetType === 'review' ? `/reviews/${input.targetId}` : input.targetType === 'role' ? `/roles/${input.targetId}` : '/';

  if (input.parentId) {
    const parent = await queryOne<{ author_id: string }>(`SELECT author_id FROM comments WHERE id = $1`, [input.parentId]);
    if (parent) {
      await notify({
        userId: parent.author_id,
        actorId: userId,
        type: 'reply',
        message: `${actor?.name ?? 'Alguém'} respondeu seu comentário`,
        link,
      });
    }
  } else if (input.targetType === 'role') {
    const role = await queryOne<{ creator_id: string }>(`SELECT creator_id FROM roles WHERE id = $1`, [input.targetId]);
    if (role) {
      await notify({
        userId: role.creator_id,
        actorId: userId,
        type: 'comment',
        message: `${actor?.name ?? 'Alguém'} comentou no seu rolê`,
        link,
      });
    }
  } else if (input.targetType === 'review') {
    const review = await queryOne<{ author_id: string }>(`SELECT author_id FROM reviews WHERE id = $1`, [input.targetId]);
    if (review) {
      await notify({
        userId: review.author_id,
        actorId: userId,
        type: 'comment',
        message: `${actor?.name ?? 'Alguém'} comentou na sua resenha`,
        link,
      });
    }
  }

  return nestComments(input.targetType, input.targetId, userId);
}

export async function updateComment(id: string, userId: string, content: string) {
  const row = await queryOne<{ author_id: string; target_type: string; target_id: string }>(
    `SELECT author_id, target_type, target_id FROM comments WHERE id = $1`,
    [id],
  );
  if (!row) throw notFound('Comentário não encontrado');
  if (row.author_id !== userId) throw forbidden();
  await exec(`UPDATE comments SET content = $1, updated_at = $2 WHERE id = $3`, [content, nowIso(), id]);
  return nestComments(row.target_type, row.target_id, userId);
}

export async function deleteComment(id: string, userId: string) {
  const row = await queryOne<{ author_id: string }>(`SELECT author_id FROM comments WHERE id = $1`, [id]);
  if (!row) throw notFound('Comentário não encontrado');
  if (row.author_id !== userId) throw forbidden();
  await exec(`DELETE FROM comments WHERE id = $1`, [id]);
}

export async function setReaction(userId: string, input: { targetType: string; targetId: string; type: string }) {
  const existing = await queryOne<{ id: string; type: string }>(
    `SELECT id, type FROM reactions WHERE user_id = $1 AND target_type = $2 AND target_id = $3`,
    [userId, input.targetType, input.targetId],
  );

  if (existing?.type === input.type) {
    await exec(`DELETE FROM reactions WHERE id = $1`, [existing.id]);
  } else if (existing) {
    await exec(`UPDATE reactions SET type = $1 WHERE id = $2`, [input.type, existing.id]);
  } else {
    await exec(
      `INSERT INTO reactions (id, user_id, target_type, target_id, type, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
      [randomUUID(), userId, input.targetType, input.targetId, input.type, nowIso()],
    );

    const actor = await getUserRow(userId);
    if (input.targetType === 'role') {
      const role = await queryOne<{ creator_id: string }>(`SELECT creator_id FROM roles WHERE id = $1`, [input.targetId]);
      if (role) {
        await notify({
          userId: role.creator_id,
          actorId: userId,
          type: 'reaction',
          message: `${actor?.name ?? 'Alguém'} reagiu ao seu rolê`,
          link: `/roles/${input.targetId}`,
        });
      }
    }
  }

  return getReactionSummary(input.targetType, input.targetId, userId);
}

export async function deleteReaction(id: string, userId: string) {
  const row = await queryOne<{ user_id: string }>(`SELECT user_id FROM reactions WHERE id = $1`, [id]);
  if (!row) throw notFound('Reação não encontrada');
  if (row.user_id !== userId) throw forbidden();
  await exec(`DELETE FROM reactions WHERE id = $1`, [id]);
}

export async function createPost(userId: string, content: string) {
  const id = randomUUID();
  await exec(`INSERT INTO posts (id, author_id, content, created_at) VALUES ($1,$2,$3,$4)`, [id, userId, content, nowIso()]);
  await addFeedEvent({ type: 'post_created', actorId: userId, postId: id });
  return id;
}

export async function getFeed(userId: string) {
  const rows = await query<{
    id: string;
    type: string;
    actor_id: string;
    role_id: string | null;
    review_id: string | null;
    photo_id: string | null;
    audio_id: string | null;
    music_id: string | null;
    post_id: string | null;
    achievement_slug: string | null;
    created_at: string;
  }>(`SELECT * FROM feed_events ORDER BY created_at DESC LIMIT 40`);

  const actors = await getUsersByIds([...new Set(rows.map((row) => row.actor_id))]);
  const actorMap = new Map(actors.map((row) => [row.id, mapUser(row)]));

  const items = [];
  for (const row of rows) {
    const item: Record<string, unknown> = {
      id: row.id,
      type: row.type,
      actor: actorMap.get(row.actor_id),
      createdAt: String(row.created_at),
      reactions: await getReactionSummary(
        row.role_id ? 'role' : row.review_id ? 'review' : row.post_id ? 'post' : row.photo_id ? 'photo' : 'post',
        row.role_id || row.review_id || row.post_id || row.photo_id || row.id,
        userId,
      ),
      commentCount: 0,
    };

    if (row.role_id) {
      const role = await queryOne(`SELECT * FROM roles WHERE id = $1`, [row.role_id]);
      if (role) {
        const { serializeRole } = await import('../roles/roles.service.js');
        item.role = await serializeRole(role as never, userId);
        item.commentCount = (item.role as { commentCount: number }).commentCount;
      }
    }
    if (row.review_id) {
      const review = await queryOne(`SELECT * FROM reviews WHERE id = $1`, [row.review_id]);
      if (review) {
        item.review = {
          id: review.id,
          roleId: review.role_id,
          authorId: review.author_id,
          author: actorMap.get(review.author_id as string),
          title: review.title,
          content: review.content,
          rating: review.rating,
          ratings: parseJson(review.ratings, {}),
          tags: parseJson(review.tags, []),
          createdAt: String(review.created_at),
          updatedAt: String(review.updated_at),
        };
      }
    }
    if (row.post_id) {
      const post = await queryOne(`SELECT * FROM posts WHERE id = $1`, [row.post_id]);
      if (post) {
        item.post = {
          id: post.id,
          authorId: post.author_id,
          author: actorMap.get(post.author_id as string),
          content: post.content,
          createdAt: String(post.created_at),
        };
      }
    }
    if (row.achievement_slug) {
      item.achievement = {
        slug: row.achievement_slug,
        name: row.achievement_slug,
        description: '',
        unlockedAt: String(row.created_at),
      };
    }
    items.push(item);
  }

  return items;
}

export async function requestFriend(userId: string, targetId: string) {
  if (userId === targetId) throw badRequest('Não é possível adicionar a si mesmo');
  const target = await getUserRow(targetId);
  if (!target) throw notFound('Usuário não encontrado');

  const existing = await queryOne<{ id: string; status: string; requester_id: string }>(
    `SELECT id, status, requester_id FROM friendships
     WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)`,
    [userId, targetId],
  );
  if (existing?.status === 'accepted') throw badRequest('Vocês já são amigos');
  if (existing) return existing;

  const id = randomUUID();
  await exec(
    `INSERT INTO friendships (id, requester_id, receiver_id, status, created_at) VALUES ($1,$2,$3,'pending',$4)`,
    [id, userId, targetId, nowIso()],
  );
  const actor = await getUserRow(userId);
  await notify({
    userId: targetId,
    actorId: userId,
    type: 'friendship',
    message: `${actor?.name ?? 'Alguém'} quer ser seu amigo`,
    link: `/perfil/${actor?.username ?? ''}`,
  });
  return { id, requesterId: userId, receiverId: targetId, status: 'pending' };
}

export async function listFriendRequests(userId: string) {
  const rows = await query(
    `SELECT * FROM friendships WHERE receiver_id = $1 AND status = 'pending' ORDER BY created_at DESC`,
    [userId],
  );
  const users = await getUsersByIds(rows.map((row) => row.requester_id as string));
  const map = new Map(users.map((row) => [row.id, mapUser(row)]));
  const me = await getUserRow(userId);
  return rows.map((row) => ({
    id: row.id,
    requesterId: row.requester_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: String(row.created_at),
    requester: map.get(row.requester_id as string),
    receiver: me ? mapUser(me) : null,
  }));
}

export async function respondFriend(id: string, userId: string, status: 'accepted' | 'rejected') {
  const row = await queryOne<{ receiver_id: string; requester_id: string }>(`SELECT * FROM friendships WHERE id = $1`, [id]);
  if (!row) throw notFound('Pedido não encontrado');
  if (row.receiver_id !== userId) throw forbidden();
  await exec(`UPDATE friendships SET status = $1 WHERE id = $2`, [status, id]);
  if (status === 'accepted') {
    const actor = await getUserRow(userId);
    await notify({
      userId: row.requester_id,
      actorId: userId,
      type: 'friendship',
      message: `${actor?.name ?? 'Alguém'} aceitou sua amizade`,
      link: `/perfil/${actor?.username ?? ''}`,
    });
  }
  return { ok: true, status };
}

export async function removeFriend(id: string, userId: string) {
  const row = await queryOne<{ requester_id: string; receiver_id: string }>(`SELECT * FROM friendships WHERE id = $1`, [id]);
  if (!row) throw notFound('Amizade não encontrada');
  if (row.requester_id !== userId && row.receiver_id !== userId) throw forbidden();
  await exec(`DELETE FROM friendships WHERE id = $1`, [id]);
}

export async function followUser(userId: string, targetId: string) {
  if (userId === targetId) throw badRequest('Não é possível seguir a si mesmo');
  const target = await getUserRow(targetId);
  if (!target) throw notFound('Usuário não encontrado');
  await exec(
    `INSERT INTO follows (id, follower_id, following_id, created_at) VALUES ($1,$2,$3,$4)
     ON CONFLICT (follower_id, following_id) DO NOTHING`,
    [randomUUID(), userId, targetId, nowIso()],
  );
  const actor = await getUserRow(userId);
  await notify({
    userId: targetId,
    actorId: userId,
    type: 'follow',
    message: `${actor?.name ?? 'Alguém'} começou a te seguir`,
    link: `/perfil/${actor?.username ?? ''}`,
  });
}

export async function unfollowUser(userId: string, targetId: string) {
  await exec(`DELETE FROM follows WHERE follower_id = $1 AND following_id = $2`, [userId, targetId]);
}

export async function getFriendship(a: string, b: string) {
  return queryOne(
    `SELECT * FROM friendships WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)`,
    [a, b],
  );
}

export async function isFollowing(a: string, b: string) {
  const row = await queryOne(`SELECT id FROM follows WHERE follower_id = $1 AND following_id = $2`, [a, b]);
  return Boolean(row);
}

export { evaluateAchievements };
