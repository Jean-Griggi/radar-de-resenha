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
  ROLE_START_AT_SQL,
  roleStatus,
  sqlPlaceholders,
  toDateKey,
} from '../../lib/helpers.js';
import { forbidden, notFound } from '../../lib/http.js';
import { publicUrl } from '../../lib/storage.js';
import type { CreateRoleInput, UpdateRoleInput } from '../common.schema.js';

export type RoleRow = {
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

type RoleExtras = {
  attendance: Map<string, Map<string, number>>;
  comments: Map<string, number>;
  ratings: Map<string, number | null>;
  covers: Map<string, string | null>;
  myAttendance: Map<string, string>;
};

const FALLBACK_CREATOR = {
  name: 'Usuário',
  username: 'user',
  avatar: null,
  cover: null,
  bio: null,
  city: null,
  isPublic: true,
};

async function loadRoleExtras(roleIds: string[], viewerId?: string): Promise<RoleExtras> {
  const attendance = new Map<string, Map<string, number>>();
  const comments = new Map<string, number>();
  const ratings = new Map<string, number | null>();
  const covers = new Map<string, string | null>();
  const myAttendance = new Map<string, string>();

  if (roleIds.length === 0) {
    return { attendance, comments, ratings, covers, myAttendance };
  }

  const inList = sqlPlaceholders(roleIds.length);

  const [attendanceRows, commentRows, ratingRows, coverRows, mineRows] = await Promise.all([
    query<{ role_id: string; status: string; count: string }>(
      `SELECT role_id, status, COUNT(*)::text AS count FROM attendances WHERE role_id IN (${inList}) GROUP BY role_id, status`,
      roleIds,
    ),
    query<{ target_id: string; count: string }>(
      `SELECT target_id, COUNT(*)::text AS count FROM comments WHERE target_type = 'role' AND target_id IN (${inList}) GROUP BY target_id`,
      roleIds,
    ),
    query<{ role_id: string; avg: string | null }>(
      `SELECT role_id, AVG(rating)::text AS avg FROM reviews WHERE role_id IN (${inList}) GROUP BY role_id`,
      roleIds,
    ),
    query<{ role_id: string; url: string }>(
      `SELECT DISTINCT ON (role_id) role_id, url FROM photos WHERE role_id IN (${inList}) ORDER BY role_id, created_at DESC`,
      roleIds,
    ),
    viewerId
      ? query<{ role_id: string; status: string }>(
          `SELECT role_id, status FROM attendances WHERE user_id = $${roleIds.length + 1} AND role_id IN (${inList})`,
          [...roleIds, viewerId],
        )
      : Promise.resolve([] as { role_id: string; status: string }[]),
  ]);

  for (const row of attendanceRows) {
    let byStatus = attendance.get(row.role_id);
    if (!byStatus) {
      byStatus = new Map();
      attendance.set(row.role_id, byStatus);
    }
    byStatus.set(row.status, Number(row.count));
  }
  for (const row of commentRows) comments.set(row.target_id, Number(row.count));
  for (const row of ratingRows) {
    ratings.set(row.role_id, row.avg ? Math.round(Number(row.avg) * 10) / 10 : null);
  }
  for (const row of coverRows) covers.set(row.role_id, publicUrl(row.url));
  for (const row of mineRows) myAttendance.set(row.role_id, row.status);

  return { attendance, comments, ratings, covers, myAttendance };
}

function mapSerializedRole(
  row: RoleRow,
  creatorMap: Map<string, ReturnType<typeof mapUser>>,
  extras: RoleExtras,
  viewerId?: string,
) {
  const date = toDateKey(row.date);
  const byStatus = extras.attendance.get(row.id);
  const pick = (status: string) => byStatus?.get(status) ?? 0;
  const creator = creatorMap.get(row.creator_id);

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date,
    time: row.time,
    location: row.location,
    category: row.category,
    estimatedCost: row.estimated_cost,
    tags: parseJson<string[]>(row.tags, []),
    creatorId: row.creator_id,
    creator: creator ?? { id: row.creator_id, ...FALLBACK_CREATOR, createdAt: row.created_at, updatedAt: row.updated_at },
    status: roleStatus(date, row.time, row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    goingCount: pick('going'),
    maybeCount: pick('maybe'),
    notGoingCount: pick('not_going'),
    commentCount: extras.comments.get(row.id) ?? 0,
    averageRating: extras.ratings.get(row.id) ?? null,
    coverPhoto: extras.covers.get(row.id) ?? null,
    myAttendance: viewerId ? (extras.myAttendance.get(row.id) ?? null) : null,
  };
}

export type SerializedRole = ReturnType<typeof mapSerializedRole>;

export async function serializeRoles(rows: RoleRow[], viewerId?: string, options?: { skipFailures?: boolean }) {
  if (rows.length === 0) return [] as SerializedRole[];

  const skipFailures = options?.skipFailures ?? true;
  const [creators, extras] = await Promise.all([
    getUsersByIds([...new Set(rows.map((row) => row.creator_id))]),
    loadRoleExtras(rows.map((row) => row.id), viewerId),
  ]);
  const creatorMap = new Map(creators.map((row) => [row.id, mapUser(row)]));

  const items: SerializedRole[] = [];
  for (const row of rows) {
    try {
      items.push(mapSerializedRole(row, creatorMap, extras, viewerId));
    } catch (error) {
      if (!skipFailures) throw error;
    }
  }
  return items;
}

export async function serializeRole(row: RoleRow, viewerId?: string) {
  const [item] = await serializeRoles([row], viewerId, { skipFailures: false });
  if (!item) throw new Error('Falha ao serializar rolê');
  return item;
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

export async function listRoles(
  filter: string | undefined,
  userId?: string,
  page?: { limit?: number; offset?: number },
) {
  const limit = Math.min(Math.max(Number.isFinite(page?.limit) ? Number(page?.limit) : 30, 1), 50);
  const offset = Math.max(Number.isFinite(page?.offset) ? Number(page?.offset) : 0, 0);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let i = 1;

  if (filter === 'meus' && userId) {
    conditions.push(`creator_id = $${i++}`);
    params.push(userId);
  } else if ((filter === 'participando' || filter === 'talvez') && userId) {
    conditions.push(`id IN (SELECT role_id FROM attendances WHERE user_id = $${i++} AND status = $${i++})`);
    params.push(userId, filter === 'talvez' ? 'maybe' : 'going');
  } else if (filter === 'proximos') {
    conditions.push(`(date IS NULL OR ${ROLE_START_AT_SQL} >= NOW() - INTERVAL '2 hours')`);
  } else if (filter === 'passados') {
    conditions.push(`(date IS NOT NULL AND ${ROLE_START_AT_SQL} < NOW() - INTERVAL '2 hours')`);
  }

  let sql = `SELECT * FROM roles`;
  if (conditions.length > 0) sql += ` WHERE ${conditions.join(' AND ')}`;
  sql += ` ORDER BY COALESCE(date, created_at::date) DESC, created_at DESC`;
  sql += ` LIMIT $${i++} OFFSET $${i++}`;
  params.push(limit, offset);

  const rows = await query<RoleRow>(sql, params);
  return serializeRoles(rows, userId);
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
