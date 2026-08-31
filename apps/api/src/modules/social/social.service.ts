import { randomUUID } from 'node:crypto';
import { exec, query, queryOne } from '../../db/client.js';
import {
  addFeedEvent,
  evaluateAchievements,
  getReactionSummaries,
  getReactionSummary,
  getUserRow,
  getUsersByIds,
  mapUser,
  nowIso,
  notify,
  parseJson,
  sqlPlaceholders,
} from '../../lib/helpers.js';
import { badRequest, forbidden, notFound } from '../../lib/http.js';
import { publicUrl } from '../../lib/storage.js';
import { nestComments, serializeRoles, type RoleRow } from '../roles/roles.service.js';

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
  } else if (input.targetType === 'post') {
    const post = await queryOne<{ author_id: string }>(`SELECT author_id FROM posts WHERE id = $1`, [input.targetId]);
    if (post) {
      await notify({
        userId: post.author_id,
        actorId: userId,
        type: 'comment',
        message: `${actor?.name ?? 'Alguém'} comentou na sua publicação`,
        link: '/',
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

type FeedEventRow = {
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
};

function feedReactionTarget(row: FeedEventRow) {
  if (row.role_id) return { targetType: 'role', targetId: row.role_id };
  if (row.review_id) return { targetType: 'review', targetId: row.review_id };
  if (row.post_id) return { targetType: 'post', targetId: row.post_id };
  if (row.photo_id) return { targetType: 'photo', targetId: row.photo_id };
  return { targetType: 'post', targetId: row.id };
}

export async function getFeed(userId: string) {
  const rows = await query<FeedEventRow>(`SELECT * FROM feed_events ORDER BY created_at DESC LIMIT 40`);
  if (rows.length === 0) return [];

  const roleIds = [...new Set(rows.map((row) => row.role_id).filter((id): id is string => Boolean(id)))];
  const reviewIds = [...new Set(rows.map((row) => row.review_id).filter((id): id is string => Boolean(id)))];
  const postIds = [...new Set(rows.map((row) => row.post_id).filter((id): id is string => Boolean(id)))];
  const photoIds = [...new Set(rows.map((row) => row.photo_id).filter((id): id is string => Boolean(id)))];

  const [roleRows, reviewRows, postRows, photoRows] = await Promise.all([
    roleIds.length ? query<RoleRow>(`SELECT * FROM roles WHERE id IN (${sqlPlaceholders(roleIds.length)})`, roleIds) : [],
    reviewIds.length
      ? query<{
          id: string;
          role_id: string;
          author_id: string;
          title: string;
          content: string;
          rating: number;
          ratings: unknown;
          tags: unknown;
          created_at: string;
          updated_at: string;
        }>(`SELECT * FROM reviews WHERE id IN (${sqlPlaceholders(reviewIds.length)})`, reviewIds)
      : [],
    postIds.length
      ? query<{ id: string; author_id: string; content: string; created_at: string }>(
          `SELECT * FROM posts WHERE id IN (${sqlPlaceholders(postIds.length)})`,
          postIds,
        )
      : [],
    photoIds.length
      ? query<{
          id: string;
          url: string;
          caption: string | null;
          album_id: string | null;
          role_id: string | null;
          author_id: string;
          created_at: string;
        }>(`SELECT * FROM photos WHERE id IN (${sqlPlaceholders(photoIds.length)})`, photoIds)
      : [],
  ]);

  const userIds = [
    ...new Set([
      ...rows.map((row) => row.actor_id),
      ...reviewRows.map((row) => row.author_id),
      ...postRows.map((row) => row.author_id),
    ]),
  ];

  const [users, serializedRoles, reactionsMap] = await Promise.all([
    getUsersByIds(userIds),
    serializeRoles(roleRows, userId),
    getReactionSummaries(rows.map(feedReactionTarget), userId),
  ]);

  const userMap = new Map(users.map((row) => [row.id, mapUser(row)]));
  const roleMap = new Map(serializedRoles.map((role) => [role.id, role]));
  const reviewMap = new Map(reviewRows.map((row) => [row.id, row]));
  const postMap = new Map(postRows.map((row) => [row.id, row]));
  const photoMap = new Map(photoRows.map((row) => [row.id, row]));

  const items = [];
  for (const row of rows) {
    try {
      if (row.role_id && !roleMap.has(row.role_id)) continue;
      if (row.review_id && !reviewMap.has(row.review_id)) continue;
      if (row.post_id && !postMap.has(row.post_id)) continue;
      if (row.photo_id && !photoMap.has(row.photo_id)) continue;

      const actor = userMap.get(row.actor_id);
      if (!actor) continue;

      const role = row.role_id ? roleMap.get(row.role_id) : undefined;
      const reviewRow = row.review_id ? reviewMap.get(row.review_id) : undefined;
      const postRow = row.post_id ? postMap.get(row.post_id) : undefined;
      const photoRow = row.photo_id ? photoMap.get(row.photo_id) : undefined;
      const target = feedReactionTarget(row);

      items.push({
        id: row.id,
        type: row.type,
        actor,
        createdAt: String(row.created_at),
        reactions: reactionsMap.get(`${target.targetType}:${target.targetId}`) ?? [],
        commentCount: role?.commentCount ?? 0,
        ...(role ? { role } : {}),
        ...(reviewRow
          ? {
              review: {
                id: reviewRow.id,
                roleId: reviewRow.role_id,
                authorId: reviewRow.author_id,
                author: userMap.get(reviewRow.author_id),
                title: reviewRow.title,
                content: reviewRow.content,
                rating: reviewRow.rating,
                ratings: parseJson(reviewRow.ratings, {}),
                tags: parseJson(reviewRow.tags, []),
                createdAt: String(reviewRow.created_at),
                updatedAt: String(reviewRow.updated_at),
              },
            }
          : {}),
        ...(postRow
          ? {
              post: {
                id: postRow.id,
                authorId: postRow.author_id,
                author: userMap.get(postRow.author_id),
                content: postRow.content,
                createdAt: String(postRow.created_at),
              },
            }
          : {}),
        ...(photoRow
          ? {
              photo: {
                id: photoRow.id,
                url: publicUrl(photoRow.url),
                caption: photoRow.caption,
                albumId: photoRow.album_id,
                roleId: photoRow.role_id,
                authorId: photoRow.author_id,
                createdAt: String(photoRow.created_at),
              },
            }
          : {}),
        ...(row.achievement_slug
          ? {
              achievement: {
                slug: row.achievement_slug,
                name: row.achievement_slug,
                description: '',
                unlockedAt: String(row.created_at),
              },
            }
          : {}),
      });
    } catch {
      // item órfão ou inválido: pular, não derrubar o feed
    }
  }

  return items;
}

function mapFriendship(row: { id: string; status: string; requester_id: string; receiver_id: string }) {
  return {
    id: row.id,
    status: row.status,
    requesterId: row.requester_id,
    receiverId: row.receiver_id,
  };
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String((error as { code: unknown }).code) : '';
  if (code === '23505') return true;
  const message = 'message' in error ? String((error as { message: unknown }).message) : '';
  return /duplicate key|unique constraint/i.test(message);
}

async function notifyFriendRequest(userId: string, targetId: string) {
  const actor = await getUserRow(userId);
  await notify({
    userId: targetId,
    actorId: userId,
    type: 'friendship',
    message: `${actor?.name ?? 'Alguém'} quer ser seu amigo`,
    link: `/perfil/${actor?.username ?? ''}`,
  });
}

export async function requestFriend(userId: string, targetId: string) {
  if (userId === targetId) throw badRequest('Não é possível adicionar a si mesmo');
  const target = await getUserRow(targetId);
  if (!target) throw notFound('Usuário não encontrado');

  const existing = await queryOne<{ id: string; status: string; requester_id: string; receiver_id: string }>(
    `SELECT id, status, requester_id, receiver_id FROM friendships
     WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)`,
    [userId, targetId],
  );
  if (existing?.status === 'accepted') throw badRequest('Vocês já são amigos');
  if (existing?.status === 'pending') {
    return { created: false, friendship: mapFriendship(existing) };
  }

  if (existing?.status === 'rejected') {
    await exec(
      `UPDATE friendships SET status = 'pending', requester_id = $1, receiver_id = $2 WHERE id = $3`,
      [userId, targetId, existing.id],
    );
    await notifyFriendRequest(userId, targetId);
    return {
      created: true,
      friendship: { id: existing.id, status: 'pending' as const, requesterId: userId, receiverId: targetId },
    };
  }

  const id = randomUUID();
  try {
    await exec(
      `INSERT INTO friendships (id, requester_id, receiver_id, status, created_at) VALUES ($1,$2,$3,'pending',$4)`,
      [id, userId, targetId, nowIso()],
    );
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const row = await queryOne<{ id: string; status: string; requester_id: string; receiver_id: string }>(
      `SELECT id, status, requester_id, receiver_id FROM friendships
       WHERE (requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1)`,
      [userId, targetId],
    );
    if (!row) throw error;
    if (row.status === 'accepted') throw badRequest('Vocês já são amigos');
    return { created: false, friendship: mapFriendship(row) };
  }

  await notifyFriendRequest(userId, targetId);
  return { created: true, friendship: { id, requesterId: userId, receiverId: targetId, status: 'pending' as const } };
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

export async function cancelFriendRequest(id: string, userId: string) {
  const row = await queryOne<{ requester_id: string; status: string }>(`SELECT requester_id, status FROM friendships WHERE id = $1`, [id]);
  if (!row) throw notFound('Pedido não encontrado');
  if (row.status !== 'pending') throw badRequest('Só é possível cancelar pedido pendente');
  if (row.requester_id !== userId) throw forbidden();
  await exec(`DELETE FROM friendships WHERE id = $1`, [id]);
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
