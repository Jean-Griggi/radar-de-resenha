import { randomUUID } from 'node:crypto';
import { exec, query, queryOne } from '../../db/client.js';
import { nowIso } from '../../lib/helpers.js';
import { getUserRow, mapUser } from '../users/users.map.js';

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
