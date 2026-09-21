import { randomUUID } from 'node:crypto';
import { ACHIEVEMENT_DEFS } from '@resenhometro/shared';
import { exec, queryOne } from '../../db/client.js';
import { nowIso } from '../../lib/helpers.js';
import { addFeedEvent } from '../social/feed.js';

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
