import { randomUUID } from 'node:crypto';
import { ACHIEVEMENT_DEFS } from '@resenhometro/shared';
import { exec, query, queryOne } from '../db/client.js';
import { publicUrl } from './storage.js';

export const APP_TIMEZONE = 'America/Sao_Paulo';

/** Instant do rolê no banco (date + time em Brasília). Sem hora válida → 23:59. */
export const ROLE_START_AT_SQL = `((date::timestamp + COALESCE(
  CASE WHEN time ~ '^[0-9]{1,2}:[0-9]{2}' THEN BTRIM(time)::time ELSE NULL END,
  TIME '23:59'
)) AT TIME ZONE '${APP_TIMEZONE}')`;

export function nowIso() {
  return new Date().toISOString();
}

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function utcDateKey(value: Date) {
  return `${value.getUTCFullYear()}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}`;
}

/**
 * DATE do postgres.js vira Date em UTC midnight — getters locais no Brasil
 * atrasam um dia. PGlite às vezes manda Date; String(date).slice(0, 10) vira "Wed Aug 19".
 */
export function toDateKey(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return utcDateKey(value);
  }
  const text = String(value);
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso?.[1]) return iso[1];
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return null;
  return utcDateKey(parsed);
}

/** UTC em que o relógio em `timeZone` marca `dateKey` + `time` (HH:mm). */
export function zonedLocalToUtc(dateKey: string, time: string | null, timeZone = APP_TIMEZONE): Date | null {
  const dateMatch = dateKey.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  let hour = 23;
  let minute = 59;
  if (time) {
    const timeMatch = String(time).match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) return null;
    hour = Number(timeMatch[1]);
    minute = Number(timeMatch[2]);
    if (hour > 23 || minute > 59) return null;
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMs = (instant: number) => {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      hourCycle: 'h23',
    }).formatToParts(new Date(instant));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
    return Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second')) - instant;
  };

  const adjusted = utcGuess - offsetMs(utcGuess);
  return new Date(utcGuess - offsetMs(adjusted));
}

export function parseJson<T>(value: unknown, fallback: T): T {
  if (Array.isArray(value) || (value && typeof value === 'object')) return value as T;
  if (typeof value !== 'string' || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type UserRow = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  cover: string | null;
  bio: string | null;
  city: string | null;
  is_public: boolean;
  show_followers: boolean;
  show_interactions: boolean;
  created_at: string;
  updated_at: string;
};

export function mapUser(row: UserRow, withEmail = false) {
  return {
    id: row.id,
    name: row.name,
    username: row.username,
    avatar: publicUrl(row.avatar),
    cover: publicUrl(row.cover),
    bio: row.bio,
    city: row.city,
    isPublic: Boolean(row.is_public),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    ...(withEmail ? { email: row.email } : {}),
  };
}

export async function getUserRow(id: string) {
  return queryOne<UserRow>(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users WHERE id = $1`,
    [id],
  );
}

export function sqlPlaceholders(count: number, start = 1) {
  return Array.from({ length: count }, (_, i) => `$${start + i}`).join(',');
}

export async function getUsersByIds(ids: string[]) {
  if (ids.length === 0) return [] as UserRow[];
  return query<UserRow>(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users WHERE id IN (${sqlPlaceholders(ids.length)})`,
    ids,
  );
}

export async function addFeedEvent(input: {
  type: string;
  actorId: string;
  roleId?: string | null;
  reviewId?: string | null;
  photoId?: string | null;
  audioId?: string | null;
  musicId?: string | null;
  postId?: string | null;
  achievementSlug?: string | null;
}) {
  await exec(
    `INSERT INTO feed_events (id, type, actor_id, role_id, review_id, photo_id, audio_id, music_id, post_id, achievement_slug, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      randomUUID(),
      input.type,
      input.actorId,
      input.roleId ?? null,
      input.reviewId ?? null,
      input.photoId ?? null,
      input.audioId ?? null,
      input.musicId ?? null,
      input.postId ?? null,
      input.achievementSlug ?? null,
      nowIso(),
    ],
  );
}

export async function notify(input: {
  userId: string;
  actorId?: string | null;
  type: string;
  message: string;
  link?: string | null;
}) {
  if (input.userId === input.actorId) return;
  await exec(
    `INSERT INTO notifications (id, user_id, actor_id, type, message, link, read, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,FALSE,$7)`,
    [randomUUID(), input.userId, input.actorId ?? null, input.type, input.message, input.link ?? null, nowIso()],
  );
}

export async function unlockAchievement(userId: string, slug: string) {
  const exists = await queryOne(`SELECT slug FROM user_achievements WHERE user_id = $1 AND slug = $2`, [userId, slug]);
  if (exists) return false;
  const def = ACHIEVEMENT_DEFS.find((item) => item.slug === slug);
  if (!def) return false;
  await exec(`INSERT INTO user_achievements (id, user_id, slug, unlocked_at) VALUES ($1,$2,$3,$4)`, [
    randomUUID(),
    userId,
    slug,
    nowIso(),
  ]);
  await addFeedEvent({ type: 'achievement_unlocked', actorId: userId, achievementSlug: slug });
  return true;
}

export async function evaluateAchievements(userId: string) {
  const createdRoles = await queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM roles WHERE creator_id = $1`, [userId]);
  const roleCount = Number(createdRoles?.count ?? 0);
  if (roleCount >= 1) await unlockAchievement(userId, 'first-role');
  if (roleCount >= 10) await unlockAchievement(userId, 'roles-10');
  if (roleCount >= 25) await unlockAchievement(userId, 'roles-25');
  if (roleCount >= 50) await unlockAchievement(userId, 'roles-50');

  const reviews = await queryOne<{ count: string }>(`SELECT COUNT(*)::text AS count FROM reviews WHERE author_id = $1`, [userId]);
  const reviewCount = Number(reviews?.count ?? 0);
  if (reviewCount >= 1) await unlockAchievement(userId, 'first-review');
  if (reviewCount >= 10) await unlockAchievement(userId, 'reviews-10');

  const late = await queryOne(
    `SELECT a.id FROM attendances a
     JOIN roles r ON r.id = a.role_id
     WHERE a.user_id = $1 AND a.status = 'going' AND r.time IS NOT NULL AND r.time >= '23:00'
     LIMIT 1`,
    [userId],
  );
  if (late) await unlockAchievement(userId, 'night-owl');

  const places = await queryOne<{ count: string }>(
    `SELECT COUNT(DISTINCT location)::text AS count FROM roles WHERE creator_id = $1 AND location IS NOT NULL AND location <> ''`,
    [userId],
  );
  if (Number(places?.count ?? 0) >= 5) await unlockAchievement(userId, 'explorer');

  const bars = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM roles WHERE creator_id = $1 AND category = 'Bar'`,
    [userId],
  );
  if (Number(bars?.count ?? 0) >= 5) await unlockAchievement(userId, 'bar-king');

  const year = new Date().getFullYear();
  const best = await queryOne<{ author_id: string }>(
    `SELECT author_id FROM reviews WHERE EXTRACT(YEAR FROM created_at::timestamp) = $1 ORDER BY rating DESC, created_at DESC LIMIT 1`,
    [year],
  );
  if (best?.author_id === userId) await unlockAchievement(userId, 'role-of-the-year');
}

const REACTION_TYPES = ['heart', 'laugh', 'cry', 'fire', 'eyes'] as const;

export type ReactionSummaryItem = { type: (typeof REACTION_TYPES)[number]; count: number; reacted: boolean };

function emptyReactionSummary(): ReactionSummaryItem[] {
  return REACTION_TYPES.map((type) => ({ type, count: 0, reacted: false }));
}

function reactionKey(targetType: string, targetId: string) {
  return `${targetType}:${targetId}`;
}

export async function getReactionSummaries(
  targets: { targetType: string; targetId: string }[],
  userId?: string,
) {
  const map = new Map<string, ReactionSummaryItem[]>();
  const unique: { targetType: string; targetId: string }[] = [];
  const seen = new Set<string>();

  for (const target of targets) {
    if (!target.targetType || !target.targetId) continue;
    const key = reactionKey(target.targetType, target.targetId);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(target);
    map.set(key, emptyReactionSummary());
  }

  if (unique.length === 0) return map;

  const tupleSql = unique.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(',');
  const tupleParams = unique.flatMap((target) => [target.targetType, target.targetId]);

  const rows = await query<{ target_type: string; target_id: string; type: string; count: string }>(
    `SELECT target_type, target_id, type, COUNT(*)::text AS count
     FROM reactions
     WHERE (target_type, target_id) IN (${tupleSql})
     GROUP BY target_type, target_id, type`,
    tupleParams,
  );

  for (const row of rows) {
    const summary = map.get(reactionKey(row.target_type, row.target_id));
    const slot = summary?.find((item) => item.type === row.type);
    if (slot) slot.count = Number(row.count);
  }

  if (userId) {
    const mineSql = unique.map((_, i) => `($${i * 2 + 2}, $${i * 2 + 3})`).join(',');
    const mine = await query<{ target_type: string; target_id: string; type: string }>(
      `SELECT target_type, target_id, type FROM reactions
       WHERE user_id = $1 AND (target_type, target_id) IN (${mineSql})`,
      [userId, ...tupleParams],
    );
    for (const row of mine) {
      const summary = map.get(reactionKey(row.target_type, row.target_id));
      if (!summary) continue;
      for (const slot of summary) slot.reacted = slot.type === row.type;
    }
  }

  return map;
}

export async function getReactionSummary(targetType: string, targetId: string, userId?: string) {
  const map = await getReactionSummaries([{ targetType, targetId }], userId);
  return map.get(reactionKey(targetType, targetId)) ?? emptyReactionSummary();
}

export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .slice(0, 18);
}

export async function uniqueUsername(from: string) {
  const base = slugify(from) || 'user';
  let candidate = base;
  let i = 0;
  while (await queryOne(`SELECT id FROM users WHERE username = $1`, [candidate])) {
    i += 1;
    candidate = `${base}${i}`;
  }
  return candidate;
}

export function roleStatus(date: string | null, time: string | null, current = 'upcoming', now = Date.now()) {
  if (current === 'cancelled') return 'cancelled';
  if (!date) return 'upcoming';
  const stamp = zonedLocalToUtc(date, time);
  if (!stamp) return 'upcoming';
  const t = stamp.getTime();
  if (t < now - 4 * 60 * 60 * 1000) return 'past';
  if (t <= now + 2 * 60 * 60 * 1000 && t >= now - 2 * 60 * 60 * 1000) return 'ongoing';
  if (t < now) return 'past';
  return 'upcoming';
}
