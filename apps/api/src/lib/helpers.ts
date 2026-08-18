import { randomUUID } from 'node:crypto';
import { ACHIEVEMENT_DEFS } from '@resenhometro/shared';
import { exec, query, queryOne } from '../db/client.js';
import { publicUrl } from './storage.js';

export function nowIso() {
  return new Date().toISOString();
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

export async function getUsersByIds(ids: string[]) {
  if (ids.length === 0) return [] as UserRow[];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
  return query<UserRow>(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users WHERE id IN (${placeholders})`,
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

export async function getReactionSummary(targetType: string, targetId: string, userId?: string) {
  const rows = await query<{ type: string; count: string }>(
    `SELECT type, COUNT(*)::text AS count FROM reactions WHERE target_type = $1 AND target_id = $2 GROUP BY type`,
    [targetType, targetId],
  );
  const mine = userId
    ? await queryOne<{ type: string }>(
        `SELECT type FROM reactions WHERE target_type = $1 AND target_id = $2 AND user_id = $3`,
        [targetType, targetId, userId],
      )
    : undefined;

  const types = ['heart', 'laugh', 'cry', 'fire', 'eyes'] as const;
  return types.map((type) => ({
    type,
    count: Number(rows.find((row) => row.type === type)?.count ?? 0),
    reacted: mine?.type === type,
  }));
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

export function roleStatus(date: string | null, time: string | null, current = 'upcoming') {
  if (current === 'cancelled') return 'cancelled';
  if (!date) return 'upcoming';
  const stamp = new Date(`${date}T${time || '23:59'}:00`);
  if (Number.isNaN(stamp.getTime())) return 'upcoming';
  const now = Date.now();
  if (stamp.getTime() < now - 4 * 60 * 60 * 1000) return 'past';
  if (stamp.getTime() <= now + 2 * 60 * 60 * 1000 && stamp.getTime() >= now - 2 * 60 * 60 * 1000) return 'ongoing';
  if (stamp.getTime() < now) return 'past';
  return 'upcoming';
}
