import { query, queryOne } from '../../db/client.js';
import { getUserRow, mapUser } from '../../lib/helpers.js';
import { serializeRole } from '../roles/roles.service.js';
import { serializeReview } from '../reviews/reviews.service.js';

export async function searchAll(q: string, viewerId?: string) {
  const term = `%${q}%`;
  const people = await query(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users WHERE name ILIKE $1 OR username ILIKE $1 OR city ILIKE $1 LIMIT 8`,
    [term],
  );
  const roles = await query(`SELECT * FROM roles WHERE title ILIKE $1 OR location ILIKE $1 OR tags ILIKE $1 LIMIT 8`, [term]);
  const reviews = await query(`SELECT * FROM reviews WHERE title ILIKE $1 OR content ILIKE $1 OR tags ILIKE $1 LIMIT 8`, [term]);
  const tagsRows = await query<{ tags: string }>(`SELECT tags FROM roles UNION ALL SELECT tags FROM reviews`);
  const tags = new Set<string>();
  for (const row of tagsRows) {
    try {
      for (const tag of JSON.parse(row.tags || '[]') as string[]) {
        if (tag.toLowerCase().includes(q.toLowerCase())) tags.add(tag);
      }
    } catch {
      /* ignore */
    }
  }
  const places = await query<{ location: string }>(
    `SELECT DISTINCT location FROM roles WHERE location ILIKE $1 AND location IS NOT NULL LIMIT 8`,
    [term],
  );
  const music = await query(`SELECT * FROM music WHERE title ILIKE $1 OR artist ILIKE $1 LIMIT 8`, [term]);

  return {
    people: people.map((row) => mapUser(row as never)),
    roles: await Promise.all(roles.map((row) => serializeRole(row as never, viewerId))),
    reviews: await Promise.all(reviews.map((row) => serializeReview(row as never, viewerId))),
    tags: [...tags].slice(0, 8),
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

export async function explore(viewerId?: string) {
  const roles = await query(`SELECT * FROM roles ORDER BY created_at DESC LIMIT 8`);
  const people = await query(
    `SELECT id, name, username, email, avatar, cover, bio, city, is_public, show_followers, show_interactions, created_at, updated_at
     FROM users ORDER BY created_at DESC LIMIT 8`,
  );
  const reviews = await query(`SELECT * FROM reviews ORDER BY created_at DESC LIMIT 6`);
  const categories = await query<{ category: string; count: string }>(
    `SELECT category, COUNT(*)::text AS count FROM roles GROUP BY category ORDER BY COUNT(*) DESC`,
  );
  const places = await query<{ location: string; count: string }>(
    `SELECT location, COUNT(*)::text AS count FROM roles WHERE location IS NOT NULL AND location <> '' GROUP BY location ORDER BY COUNT(*) DESC LIMIT 8`,
  );
  const music = await query(`SELECT * FROM music ORDER BY created_at DESC LIMIT 6`);
  const tagsRows = await query<{ tags: string }>(`SELECT tags FROM roles LIMIT 40`);
  const tags = new Map<string, number>();
  for (const row of tagsRows) {
    try {
      for (const tag of JSON.parse(row.tags || '[]') as string[]) {
        tags.set(tag, (tags.get(tag) ?? 0) + 1);
      }
    } catch {
      /* ignore */
    }
  }

  return {
    featuredRoles: await Promise.all(roles.map((row) => serializeRole(row as never, viewerId))),
    people: people.map((row) => mapUser(row as never)),
    reviews: await Promise.all(reviews.map((row) => serializeReview(row as never, viewerId))),
    categories: categories.map((row) => ({ name: row.category, count: Number(row.count) })),
    tags: [...tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count]) => ({ name, count })),
    places: places.map((row) => ({ name: row.location, count: Number(row.count) })),
    music: music.map((row) => ({
      id: row.id,
      title: row.title,
      artist: row.artist,
      album: row.album,
      cover: row.cover,
      spotifyUrl: row.spotify_url,
    })),
  };
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
