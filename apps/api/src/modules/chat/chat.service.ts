import { randomUUID } from 'node:crypto';
import { exec, query, queryOne } from '../../db/client.js';
import { forbidden, HttpError, notFound } from '../../lib/http.js';
import { nowIso } from '../../lib/helpers.js';
import { publicUrl } from '../../lib/storage.js';
import { getUserRow, mapUser } from '../users/users.map.js';
import { notify } from '../notifications/notifications.service.js';

export const MESSAGE_MAX = 1000;

function tooManyRequests() {
  return new HttpError(429, 'Muitas mensagens em pouco tempo. Aguarde um instante.');
}
const PAGE = 200;

type MessageRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image?: string | null;
  created_at: unknown;
  read_at: unknown;
};

function mapMessage(row: MessageRow) {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    image: publicUrl(row.image),
    createdAt: new Date(String(row.created_at)).toISOString(),
    read: row.read_at != null,
  };
}

async function findPeer(username: string) {
  const row = await queryOne<{ id: string }>(`SELECT id FROM users WHERE username = $1`, [username.toLowerCase()]);
  if (!row) throw notFound('Usuário não encontrado');
  return row.id;
}

/** Teto de mensagens por minuto de cada pessoa, para o chat aberto não virar spam. */
const SENDS_PER_MINUTE = 30;

async function assertNotFlooding(userId: string) {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM messages WHERE sender_id = $1 AND created_at > $2`,
    [userId, new Date(Date.now() - 60_000).toISOString()],
  );
  if (Number(row?.count ?? 0) >= SENDS_PER_MINUTE) throw tooManyRequests();
}

export async function listConversations(userId: string) {
  const rows = await query<MessageRow & { peer_id: string; unread: string }>(
    `SELECT DISTINCT ON (peer_id) m.*, peer_id,
       (SELECT COUNT(*) FROM messages u
         WHERE u.sender_id = peer_id AND u.receiver_id = $1 AND u.read_at IS NULL)::text AS unread
     FROM (
       SELECT *, CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS peer_id
       FROM messages WHERE sender_id = $1 OR receiver_id = $1
     ) m
     ORDER BY peer_id, created_at DESC`,
    [userId],
  );
  const result = [];
  for (const row of rows) {
    const peer = await getUserRow(row.peer_id);
    if (!peer) continue;
    result.push({ user: mapUser(peer), last: mapMessage(row), unread: Number(row.unread) });
  }
  return result.sort((x, y) => y.last.createdAt.localeCompare(x.last.createdAt));
}

/** Mensagens da conversa, da mais antiga para a mais nova. `after` devolve só as novas (polling). */
export async function listMessages(userId: string, username: string, after?: string) {
  const peerId = await findPeer(username);
  const rows = await query<MessageRow>(
    `SELECT * FROM (
       SELECT * FROM messages
       WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
         AND ($3::timestamptz IS NULL OR created_at > $3::timestamptz)
       ORDER BY created_at DESC LIMIT ${PAGE}
     ) recent ORDER BY created_at ASC`,
    [userId, peerId, after ?? null],
  );
  await exec(
    `UPDATE messages SET read_at = $1 WHERE sender_id = $2 AND receiver_id = $3 AND read_at IS NULL`,
    [nowIso(), peerId, userId],
  );
  const peer = await getUserRow(peerId);
  return { user: peer ? mapUser(peer) : null, messages: rows.map(mapMessage) };
}

/** Mensagem de texto, de foto (`image` = caminho já enviado) ou as duas juntas (a legenda). */
export async function sendMessage(userId: string, username: string, content: string, image: string | null = null) {
  const peerId = await findPeer(username);
  if (peerId === userId) throw forbidden('Não dá para enviar mensagem para você mesmo');
  await assertNotFlooding(userId);
  // Notifica só na primeira mensagem não lida, para quem recebe não ser inundado de avisos.
  const pending = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM messages WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL`,
    [userId, peerId],
  );
  const id = randomUUID();
  const createdAt = nowIso();
  await exec(
    `INSERT INTO messages (id, sender_id, receiver_id, content, image, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, userId, peerId, content, image, createdAt],
  );
  const sender = await getUserRow(userId);
  if (Number(pending?.count ?? 0) === 0) await notify({
    userId: peerId,
    actorId: userId,
    type: 'message',
    message: `${sender?.name ?? 'Alguém'} enviou ${image ? 'uma foto' : 'uma mensagem'}`,
    link: `/chat/${sender?.username ?? ''}`,
  });
  return mapMessage({ id, sender_id: userId, receiver_id: peerId, content, image, created_at: createdAt, read_at: null });
}

export async function chatUnreadCount(userId: string) {
  const row = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM messages WHERE receiver_id = $1 AND read_at IS NULL`,
    [userId],
  );
  return Number(row?.count ?? 0);
}
