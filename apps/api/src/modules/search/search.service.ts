import { query, queryOne } from '../../db/client.js';
import { getUserRow, mapUser } from '../../lib/helpers.js';
import { publicUrl } from '../../lib/storage.js';
import type { RoleRow } from '../roles/roles.service.js';
import type { ReviewRow } from '../reviews/reviews.service.js';

function collectMatchingTags(rows: { tags: string }[], q: string, max = 8) {
  const needle = q.toLowerCase();
  const tags = new Set<string>();
  for (const row of rows) {
    try {
      for (const tag of JSON.parse(row.tags || '[]') as string[]) {
        if (tag.toLowerCase().includes(needle)) tags.add(tag);
        if (tags.size >= max) return [...tags];
      }
    } catch {
      /* ignore */
    }
  }
  return [...tags];
}

export async function searchAll(q: string, _viewerId?: string) {
  const term = `%${q}%`;
  const [people, roles, reviews, tagsRows, places, music] = await Promise.all([
    query(
      `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
       FROM users WHERE name ILIKE $1 OR username ILIKE $1 OR city ILIKE $1 LIMIT 8`,
      [term],
    ),
    query<RoleRow>(`SELECT * FROM roles WHERE title ILIKE $1 OR location ILIKE $1 OR tags ILIKE $1 LIMIT 8`, [term]),
    query<ReviewRow>(`SELECT * FROM reviews WHERE title ILIKE $1 OR content ILIKE $1 OR tags ILIKE $1 LIMIT 8`, [term]),
    query<{ tags: string }>(
      `(SELECT tags FROM roles WHERE tags ILIKE $1 LIMIT 40)
       UNION ALL
       (SELECT tags FROM reviews WHERE tags ILIKE $1 LIMIT 40)`,
      [term],
    ),
    query<{ location: string }>(
      `SELECT DISTINCT location FROM roles WHERE location ILIKE $1 AND location IS NOT NULL LIMIT 8`,
      [term],
    ),
    query(`SELECT * FROM music WHERE title ILIKE $1 OR artist ILIKE $1 LIMIT 8`, [term]),
  ]);

  return {
    people: people.map((row) => mapUser(row as never)),
    roles: roles.map((row) => ({
      id: row.id,
      title: row.title,
      location: row.location,
      category: row.category,
    })),
    reviews: reviews.map((row) => ({
      id: row.id,
      title: row.title,
      rating: row.rating,
    })),
    tags: collectMatchingTags(tagsRows, q),
    places: places.map((row) => row.location),
    music: music.map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      cover: row.cover,
      spotifyUrl: row.spotify_url,
      spotifyId: row.spotify_id,
    })),
  };
}

function asJsonArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function explore(_viewerId?: string) {
  const started = Date.now();
  const row = await queryOne<{
    featured_roles: unknown;
    people: unknown;
    reviews: unknown;
    categories: unknown;
    places: unknown;
    music: unknown;
    tags_rows: unknown;
  }>(`
    SELECT
      (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
        SELECT id, title, location, category FROM roles ORDER BY created_at DESC LIMIT 8
      ) x) AS featured_roles,
      (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
        SELECT id, name, username, avatar FROM users ORDER BY created_at DESC LIMIT 8
      ) x) AS people,
      (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
        SELECT id, title, rating FROM reviews ORDER BY created_at DESC LIMIT 6
      ) x) AS reviews,
      (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
        SELECT category AS name, COUNT(*)::int AS count FROM roles GROUP BY category ORDER BY COUNT(*) DESC
      ) x) AS categories,
      (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
        SELECT location AS name, COUNT(*)::int AS count FROM roles
        WHERE location IS NOT NULL AND location <> ''
        GROUP BY location ORDER BY COUNT(*) DESC LIMIT 8
      ) x) AS places,
      (SELECT COALESCE(json_agg(x), '[]'::json) FROM (
        SELECT id, title, artist FROM music ORDER BY created_at DESC LIMIT 6
      ) x) AS music,
      (SELECT COALESCE(json_agg(tags), '[]'::json) FROM (
        SELECT tags FROM roles LIMIT 40
      ) x) AS tags_rows
  `);

  const tags = new Map<string, number>();
  for (const raw of asJsonArray<string>(row?.tags_rows)) {
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!Array.isArray(parsed)) continue;
      for (const tag of parsed as string[]) {
        tags.set(tag, (tags.get(tag) ?? 0) + 1);
      }
    } catch {
      /* ignore */
    }
  }

  const result = {
    featuredRoles: asJsonArray<{ id: string; title: string; location: string | null; category: string }>(row?.featured_roles),
    people: asJsonArray<{ id: string; name: string; username: string; avatar: string | null }>(row?.people).map((person) => ({
      ...person,
      avatar: publicUrl(person.avatar),
    })),
    reviews: asJsonArray<{ id: string; title: string; rating: number }>(row?.reviews),
    categories: asJsonArray<{ name: string; count: number }>(row?.categories).map((item) => ({
      name: item.name,
      count: Number(item.count),
    })),
    tags: [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count })),
    places: asJsonArray<{ name: string; count: number }>(row?.places).map((item) => ({
      name: item.name,
      count: Number(item.count),
    })),
    music: asJsonArray<{ id: string; title: string; artist: string }>(row?.music),
  };
  console.info(JSON.stringify({ msg: 'timing.explore', ms: Date.now() - started, roles: result.featuredRoles.length }));
  return result;
}

export async function listNotifications(userId: string) {
  const rows = await query(
    `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [userId],
  );
  const result = [];
  for (const row of rows) {
    const actor = row.actor_id ? await getUserRow(row.actor_id as string) : null;
    result.push({
      id: row.id,
      type: row.type,
      read: Boolean(row.read),
      actor: actor ? mapUser(actor) : null,
      message: row.message,
      link: row.link,
      createdAt: String(row.created_at),
    });
  }
  return result;
}

export async function markNotificationRead(id: string, userId: string) {
  await query(`UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`, [id, userId]);
}

export async function markAllRead(userId: string) {
  await query(`UPDATE notifications SET read = TRUE WHERE user_id = $1`, [userId]);
}

export async function unreadCount(userId: string) {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM notifications WHERE user_id = $1 AND read = FALSE`,
    [userId],
  );
  return Number(row?.count ?? 0);
}
