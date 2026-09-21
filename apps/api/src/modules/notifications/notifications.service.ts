import { query, queryOne } from '../../db/client.js';
import { getUserRow, mapUser } from '../../lib/helpers.js';

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
