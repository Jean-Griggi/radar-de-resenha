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
  roleStatus,
} from '../../lib/helpers.js';
import { forbidden, notFound } from '../../lib/http.js';
import { publicUrl } from '../../lib/storage.js';
import type { CreateRoleInput, UpdateRoleInput } from '../common.schema.js';

type RoleRow = {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  location: string | null;
  category: string;
  estimated_cost: number | null;
  tags: string;
  creator_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

async function counts(roleId: string) {
  const attendance = await query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM attendances WHERE role_id = $1 GROUP BY status`,
    [roleId],
  );
  const comments = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM comments WHERE target_type = 'role' AND target_id = $1`,
    [roleId],
  );
  const rating = await queryOne<{ avg: string | null }>(
    `SELECT AVG(rating)::text AS avg FROM reviews WHERE role_id = $1`,
    [roleId],
  );
  const cover = await queryOne<{ url: string }>(
    `SELECT url FROM photos WHERE role_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [roleId],
  );

  const pick = (status: string) => Number(attendance.find((row) => row.status === status)?.count ?? 0);

  return {
    goingCount: pick('going'),
    maybeCount: pick('maybe'),
    notGoingCount: pick('not_going'),
    commentCount: Number(comments?.count ?? 0),
    averageRating: rating?.avg ? Math.round(Number(rating.avg) * 10) / 10 : null,
    coverPhoto: publicUrl(cover?.url ?? null),
  };
}

export async function serializeRole(row: RoleRow, viewerId?: string) {
  const creator = await getUserRow(row.creator_id);
  const extra = await counts(row.id);
  const status = roleStatus(row.date ? String(row.date).slice(0, 10) : null, row.time, row.status);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date ? String(row.date).slice(0, 10) : null,
    time: row.time,
    location: row.location,
    category: row.category,
    estimatedCost: row.estimated_cost,
    tags: parseJson<string[]>(row.tags, []),
    creatorId: row.creator_id,
    creator: creator ? mapUser(creator) : { id: row.creator_id, name: 'Usuário', username: 'user', avatar: null, cover: null, bio: null, city: null, isPublic: true, createdAt: row.created_at, updatedAt: row.updated_at },
    status,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ...extra,
    myAttendance: viewerId
      ? ((await queryOne<{ status: string }>(`SELECT status FROM attendances WHERE role_id = $1 AND user_id = $2`, [row.id, viewerId]))?.status ?? null)
      : null,
  };
}

async function nestComments(targetType: string, targetId: string, viewerId?: string) {
  const rows = await query<{
    id: string;
    author_id: string;
    target_type: string;
    target_id: string;
    parent_id: string | null;
    content: string;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM comments WHERE target_type = $1 AND target_id = $2 ORDER BY created_at ASC`,
    [targetType, targetId],
  );
  const authors = await getUsersByIds([...new Set(rows.map((row) => row.author_id))]);
  const authorMap = new Map(authors.map((row) => [row.id, mapUser(row)]));

  const mapped = await Promise.all(
    rows.map(async (row) => ({
      id: row.id,
      authorId: row.author_id,
      author: authorMap.get(row.author_id)!,
      targetType: row.target_type,
      targetId: row.target_id,
      parentId: row.parent_id,
      content: row.content,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      replies: [] as unknown[],
      reactions: await getReactionSummary('comment', row.id, viewerId),
    })),
  );

  const roots = mapped.filter((item) => !item.parentId);
  for (const comment of mapped) {
    if (comment.parentId) {
      const parent = mapped.find((item) => item.id === comment.parentId);
      parent?.replies.push(comment);
    }
  }
  return roots;
}

export async function serializeRoleDetail(id: string, viewerId?: string) {
  const row = await queryOne<RoleRow>(`SELECT * FROM roles WHERE id = $1`, [id]);
  if (!row) return undefined;
  const base = await serializeRole(row, viewerId);

  const attendanceRows = await query<{ id: string; role_id: string; user_id: string; status: string; created_at: string }>(
    `SELECT * FROM attendances WHERE role_id = $1 ORDER BY created_at ASC`,
    [id],
  );
  const users = await getUsersByIds(attendanceRows.map((item) => item.user_id));
  const userMap = new Map(users.map((item) => [item.id, mapUser(item)]));

  const photos = await query(`SELECT * FROM photos WHERE role_id = $1 ORDER BY created_at DESC`, [id]);
  const audios = await query(`SELECT * FROM audios WHERE role_id = $1 ORDER BY created_at DESC`, [id]);
  const music = await query(`SELECT * FROM music WHERE role_id = $1 ORDER BY created_at DESC`, [id]);
  const reviewRow = await queryOne(`SELECT * FROM reviews WHERE role_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]);

  return {
    ...base,
    attendances: attendanceRows.map((item) => ({
      id: item.id,
      roleId: item.role_id,
      userId: item.user_id,
      user: userMap.get(item.user_id)!,
      status: item.status,
      createdAt: String(item.created_at),
    })),
    comments: await nestComments('role', id, viewerId),
    photos: photos.map((photo) => ({
      id: photo.id,
      url: publicUrl(photo.url as string),
      caption: photo.caption,
      albumId: photo.album_id,
      roleId: photo.role_id,
      authorId: photo.author_id,
      createdAt: String(photo.created_at),
    })),
    audios: audios.map((audio) => ({
      id: audio.id,
      url: publicUrl(audio.url as string),
      name: audio.name,
      duration: audio.duration,
      roleId: audio.role_id,
      reviewId: audio.review_id,
      authorId: audio.author_id,
      createdAt: String(audio.created_at),
    })),
    music: music.map((track) => ({
      id: track.id,
      title: track.title,
      artist: track.artist,
      album: track.album,
      cover: track.cover,
      spotifyUrl: track.spotify_url,
      spotifyId: track.spotify_id,
    })),
    review: reviewRow
      ? {
          id: reviewRow.id,
          roleId: reviewRow.role_id,
          authorId: reviewRow.author_id,
          author: mapUser((await getUserRow(reviewRow.author_id as string))!),
          title: reviewRow.title,
          content: reviewRow.content,
          rating: reviewRow.rating,
          ratings: parseJson(reviewRow.ratings, {}),
          tags: parseJson(reviewRow.tags, []),
          createdAt: String(reviewRow.created_at),
          updatedAt: String(reviewRow.updated_at),
        }
      : null,
    reactions: await getReactionSummary('role', id, viewerId),
  };
}

export async function listRoles(filter: string | undefined, userId?: string) {
  let sql = `SELECT * FROM roles`;
  const params: unknown[] = [];

  if (filter === 'meus' && userId) {
    sql += ` WHERE creator_id = $1`;
    params.push(userId);
  } else if ((filter === 'participando' || filter === 'talvez') && userId) {
    sql += ` WHERE id IN (SELECT role_id FROM attendances WHERE user_id = $1 AND status = $2)`;
    params.push(userId, filter === 'talvez' ? 'maybe' : 'going');
  }

  sql += ` ORDER BY COALESCE(date, created_at::date) DESC, created_at DESC`;
  const rows = await query<RoleRow>(sql, params);
  const items = await Promise.all(rows.map((row) => serializeRole(row, userId)));

  if (filter === 'proximos') return items.filter((item) => item.status !== 'past');
  if (filter === 'passados') return items.filter((item) => item.status === 'past');
  return items;
}

export async function createRole(userId: string, input: CreateRoleInput) {
  const id = randomUUID();
  const stamp = nowIso();
  await exec(
    `INSERT INTO roles (id, title, description, date, time, location, category, estimated_cost, tags, creator_id, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'upcoming',$11,$12)`,
    [
      id,
      input.title,
      input.description ?? null,
      input.date ?? null,
      input.time ?? null,
      input.location ?? null,
      input.category ?? 'Outro',
      input.estimatedCost ?? null,
      JSON.stringify(input.tags ?? []),
      userId,
      stamp,
      stamp,
    ],
  );

  await exec(
    `INSERT INTO attendances (id, role_id, user_id, status, created_at) VALUES ($1,$2,$3,'going',$4)
     ON CONFLICT (role_id, user_id) DO UPDATE SET status = 'going'`,
    [randomUUID(), id, userId, stamp],
  );

  await addFeedEvent({ type: 'role_created', actorId: userId, roleId: id });
  await evaluateAchievements(userId);
  return serializeRoleDetail(id, userId);
}

export async function updateRole(id: string, userId: string, input: UpdateRoleInput) {
  const row = await queryOne<RoleRow>(`SELECT * FROM roles WHERE id = $1`, [id]);
  if (!row) throw notFound('Rolê não encontrado');
  if (row.creator_id !== userId) throw forbidden();

  await exec(
    `UPDATE roles SET title = $1, description = $2, date = $3, time = $4, location = $5, category = $6, estimated_cost = $7, tags = $8, updated_at = $9
     WHERE id = $10`,
    [
      input.title ?? row.title,
      input.description === undefined ? row.description : input.description,
      input.date === undefined ? row.date : input.date,
      input.time === undefined ? row.time : input.time,
      input.location === undefined ? row.location : input.location,
      input.category ?? row.category,
      input.estimatedCost === undefined ? row.estimated_cost : input.estimatedCost,
      JSON.stringify(input.tags ?? parseJson(row.tags, [])),
      nowIso(),
      id,
    ],
  );

  return serializeRoleDetail(id, userId);
}

export async function deleteRole(id: string, userId: string) {
  const row = await queryOne<RoleRow>(`SELECT * FROM roles WHERE id = $1`, [id]);
  if (!row) throw notFound('Rolê não encontrado');
  if (row.creator_id !== userId) throw forbidden();
  await exec(`DELETE FROM roles WHERE id = $1`, [id]);
}

export async function setAttendance(roleId: string, userId: string, status: 'going' | 'maybe' | 'not_going') {
  const row = await queryOne<RoleRow>(`SELECT * FROM roles WHERE id = $1`, [roleId]);
  if (!row) throw notFound('Rolê não encontrado');

  await exec(
    `INSERT INTO attendances (id, role_id, user_id, status, created_at) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (role_id, user_id) DO UPDATE SET status = EXCLUDED.status`,
    [randomUUID(), roleId, userId, status, nowIso()],
  );

  if (status === 'going') {
    await addFeedEvent({ type: 'attendance_going', actorId: userId, roleId });
    await notify({
      userId: row.creator_id,
      actorId: userId,
      type: 'attendance',
      message: 'confirmou presença no seu rolê',
      link: `/roles/${roleId}`,
    });
    await evaluateAchievements(userId);
  }

  return serializeRoleDetail(roleId, userId);
}

export { nestComments };
