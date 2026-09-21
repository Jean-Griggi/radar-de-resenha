import { ACHIEVEMENT_DEFS } from '@resenhometro/shared';
import { exec, query, queryOne } from '../../db/client.js';
import { nowIso } from '../../lib/helpers.js';
import { conflict, notFound } from '../../lib/http.js';
import { serializeRoles, type RoleRow } from '../roles/roles.service.js';
import { getFriendship, isFollowing } from '../social/social.service.js';
import { evaluateAchievements } from './achievements.js';
import type { UpdateMeInput } from './users.schema.js';
import { getUserRow, mapUser, type UserRow } from './users.map.js';

const HIDDEN_STATS = { roles: 0, reviews: 0, friends: 0, followers: 0, following: 0 };

/**
 * Perfil privado (`is_public = false`): conteúdo (rolês, fotos, resenhas, etc.)
 * só para o dono, amigo aceito ou quem segue o perfil.
 * Estranho recebe payload reduzido (nome/username/avatar, sem listas).
 */
export async function canViewProfileContent(
  owner: { id: string; is_public: boolean },
  viewerId?: string,
) {
  if (owner.is_public) return true;
  if (!viewerId) return false;
  if (viewerId === owner.id) return true;
  const [friendship, following] = await Promise.all([
    getFriendship(viewerId, owner.id),
    isFollowing(viewerId, owner.id),
  ]);
  const status = (friendship as { status?: string } | null)?.status;
  return status === 'accepted' || following;
}

export async function getUserByUsername(username: string, viewerId?: string) {
  const row = await queryOne<UserRow>(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users WHERE username = $1`,
    [username.toLowerCase()],
  );
  if (!row) throw notFound('Usuário não encontrado');

  const isMe = viewerId === row.id;
  const friendship = viewerId && !isMe ? await getFriendship(viewerId, row.id) : null;
  const following = viewerId ? await isFollowing(viewerId, row.id) : false;
  const friendshipStatus = (friendship as { status?: string } | null)?.status;
  const canView = Boolean(row.is_public) || isMe || friendshipStatus === 'accepted' || following;

  const [roles, reviews, friends, followers, followingCount] = canView
    ? await Promise.all([
        queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM roles WHERE creator_id = $1`, [row.id]),
        queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM reviews WHERE author_id = $1`, [row.id]),
        queryOne<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM friendships WHERE status = 'accepted' AND (requester_id = $1 OR receiver_id = $1)`,
          [row.id],
        ),
        queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM follows WHERE following_id = $1`, [row.id]),
        queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM follows WHERE follower_id = $1`, [row.id]),
      ])
    : [null, null, null, null, null];

  const achievementsRows = canView
    ? await query<{ slug: string; unlocked_at: string }>(
        `SELECT slug, unlocked_at FROM user_achievements WHERE user_id = $1`,
        [row.id],
      )
    : [];
  const unlocked = new Map(achievementsRows.map((item) => [item.slug, item.unlocked_at]));

  return {
    ...mapUser(row),
    stats: canView
      ? {
          roles: Number(roles?.count ?? 0),
          reviews: Number(reviews?.count ?? 0),
          friends: Number(friends?.count ?? 0),
          followers: Number(followers?.count ?? 0),
          following: Number(followingCount?.count ?? 0),
        }
      : HIDDEN_STATS,
    friendship:
      friendship && (friendship as { status?: string }).status !== 'rejected'
        ? {
            id: (friendship as { id: string }).id,
            status: (friendship as { status: string }).status,
            requesterId: (friendship as { requester_id: string }).requester_id,
            receiverId: (friendship as { receiver_id: string }).receiver_id,
          }
        : null,
    isFollowing: following,
    isMe,
    achievements: canView
      ? ACHIEVEMENT_DEFS.map((item) => ({
          slug: item.slug,
          name: item.name,
          description: item.description,
          unlockedAt: unlocked.get(item.slug) ? String(unlocked.get(item.slug)) : null,
        }))
      : [],
  };
}

export async function getUserById(id: string, viewerId?: string) {
  const row = await getUserRow(id);
  if (!row) throw notFound('Usuário não encontrado');
  return getUserByUsername(row.username, viewerId);
}

const USER_CONTENT_LIMIT = 20;
const EMPTY_CONTENT = { roles: [] as Awaited<ReturnType<typeof serializeRoles>>, reviews: [], photos: [], audios: [], music: [] };

export async function userContent(userId: string, viewerId?: string) {
  const owner = await getUserRow(userId);
  if (!owner) throw notFound('Usuário não encontrado');
  if (!(await canViewProfileContent(owner, viewerId))) return EMPTY_CONTENT;

  const [roles, reviews, photos, audios, music] = await Promise.all([
    query<RoleRow>(`SELECT * FROM roles WHERE creator_id = $1 ORDER BY created_at DESC LIMIT $2`, [
      userId,
      USER_CONTENT_LIMIT,
    ]),
    query(`SELECT * FROM reviews WHERE author_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, USER_CONTENT_LIMIT]),
    query(`SELECT * FROM photos WHERE author_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, USER_CONTENT_LIMIT]),
    query(`SELECT * FROM audios WHERE author_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, USER_CONTENT_LIMIT]),
    query(`SELECT * FROM music WHERE added_by = $1 ORDER BY created_at DESC LIMIT $2`, [userId, USER_CONTENT_LIMIT]),
  ]);

  return {
    roles: await serializeRoles(roles, viewerId),
    reviews,
    photos,
    audios,
    music,
  };
}

export async function listFriends(userId: string) {
  const rows = await query<{ requester_id: string; receiver_id: string; id: string; status: string; created_at: string }>(
    `SELECT * FROM friendships WHERE status = 'accepted' AND (requester_id = $1 OR receiver_id = $1)`,
    [userId],
  );
  const ids = rows.map((row) => (row.requester_id === userId ? row.receiver_id : row.requester_id));
  const result = [];
  for (const id of ids) {
    const user = await getUserRow(id);
    if (user) result.push(mapUser(user));
  }
  return result;
}

export async function listFollowers(userId: string, viewerId?: string) {
  const owner = await getUserRow(userId);
  if (!owner) throw notFound('Usuário não encontrado');
  if (!(await canViewProfileContent(owner, viewerId))) return [];
  const rows = await query<{ follower_id: string }>(`SELECT follower_id FROM follows WHERE following_id = $1`, [userId]);
  const result = [];
  for (const row of rows) {
    const user = await getUserRow(row.follower_id);
    if (user) result.push(mapUser(user));
  }
  return result;
}

export async function listFollowing(userId: string, viewerId?: string) {
  const owner = await getUserRow(userId);
  if (!owner) throw notFound('Usuário não encontrado');
  if (!(await canViewProfileContent(owner, viewerId))) return [];
  const rows = await query<{ following_id: string }>(`SELECT following_id FROM follows WHERE follower_id = $1`, [userId]);
  const result = [];
  for (const row of rows) {
    const user = await getUserRow(row.following_id);
    if (user) result.push(mapUser(user));
  }
  return result;
}

export async function suggestions(userId: string) {
  const rows = await query(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users
     WHERE id <> $1
       AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = $1)
     ORDER BY created_at DESC
     LIMIT 8`,
    [userId],
  );
  return rows.map((row) => mapUser(row as never));
}

export async function updateMe(id: string, input: UpdateMeInput) {
  const row = await queryOne<Record<string, unknown>>(`SELECT * FROM users WHERE id = $1`, [id]);
  if (!row) throw notFound('Usuário não encontrado');

  if (input.email && input.email.toLowerCase() !== row.email) {
    const taken = await queryOne(`SELECT id FROM users WHERE email = $1 AND id <> $2`, [input.email.toLowerCase(), id]);
    if (taken) throw conflict('E-mail já cadastrado');
  }

  if (input.username && input.username.toLowerCase() !== row.username) {
    const taken = await queryOne(`SELECT id FROM users WHERE username = $1 AND id <> $2`, [
      input.username.toLowerCase(),
      id,
    ]);
    if (taken) throw conflict('Username já está em uso');
  }

  await exec(
    `UPDATE users SET
      name = $1, username = $2, email = $3, bio = $4, city = $5,
      is_public = $6, show_followers = $7, show_interactions = $8, updated_at = $9
     WHERE id = $10`,
    [
      input.name ?? row.name,
      (input.username ?? (row.username as string)).toLowerCase(),
      (input.email ?? (row.email as string)).toLowerCase(),
      input.bio === undefined ? row.bio : input.bio,
      input.city === undefined ? row.city : input.city,
      input.isPublic ?? row.is_public,
      input.showFollowers ?? row.show_followers,
      input.showInteractions ?? row.show_interactions,
      nowIso(),
      id,
    ],
  );

  const updated = await getUserRow(id);
  if (!updated) throw notFound('Usuário não encontrado');
  return mapUser(updated, true);
}

export async function setUserMedia(id: string, field: 'avatar' | 'cover', relative: string | null) {
  await exec(`UPDATE users SET ${field} = $1, updated_at = $2 WHERE id = $3`, [relative, nowIso(), id]);
  await evaluateAchievements(id);
  const row = await getUserRow(id);
  if (!row) throw notFound('Usuário não encontrado');
  return mapUser(row, true);
}
