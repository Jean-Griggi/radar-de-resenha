import { randomUUID } from 'node:crypto';
import { STORY_MAX_ACTIVE, STORY_TTL_MS } from '@resenhometro/shared';
import { exec, query, queryOne } from '../../db/client.js';
import { getUserRow, getUsersByIds, mapUser, nowIso, notify, sqlPlaceholders } from '../../lib/helpers.js';
import { badRequest, forbidden, notFound } from '../../lib/http.js';
import { publicUrl, removeStored } from '../../lib/storage.js';

type StoryRow = {
  id: string;
  author_id: string;
  url: string;
  media_type: string;
  caption: string | null;
  expires_at: string;
  created_at: string;
};

function storyMediaType(relative: string): 'photo' | 'video' {
  return /\.(mp4|webm|mov)$/i.test(relative) ? 'video' : 'photo';
}

async function friendIds(userId: string) {
  const rows = await query<{ id: string }>(
    `SELECT CASE WHEN requester_id = $1 THEN receiver_id ELSE requester_id END AS id
     FROM friendships WHERE status = 'accepted' AND (requester_id = $1 OR receiver_id = $1)`,
    [userId],
  );
  return rows.map((row) => row.id);
}

async function areFriends(a: string, b: string) {
  if (a === b) return true;
  const row = await queryOne(
    `SELECT 1 FROM friendships
     WHERE status = 'accepted'
       AND ((requester_id = $1 AND receiver_id = $2) OR (requester_id = $2 AND receiver_id = $1))`,
    [a, b],
  );
  return Boolean(row);
}

async function getActiveStory(id: string) {
  const row = await queryOne<StoryRow>(
    `SELECT * FROM stories WHERE id = $1 AND expires_at > NOW()`,
    [id],
  );
  if (!row) throw notFound('Story não encontrado');
  return row;
}

async function assertCanSee(story: StoryRow, userId: string) {
  if (!(await areFriends(userId, story.author_id))) {
    throw forbidden('Só amigos veem este story');
  }
}

function serializeStory(
  row: StoryRow,
  author: ReturnType<typeof mapUser>,
  viewed: boolean,
  viewCount?: number,
) {
  return {
    id: row.id,
    authorId: row.author_id,
    author,
    url: publicUrl(row.url) ?? row.url,
    mediaType: row.media_type === 'video' ? ('video' as const) : ('photo' as const),
    caption: row.caption,
    expiresAt: String(row.expires_at),
    createdAt: String(row.created_at),
    viewed,
    ...(viewCount != null ? { viewCount } : {}),
  };
}

export async function listStoryRings(userId: string) {
  const me = await getUserRow(userId);
  if (!me) throw notFound('Usuário não encontrado');

  const ids = [userId, ...(await friendIds(userId))];
  const rows = await query<StoryRow>(
    `SELECT * FROM stories
     WHERE author_id IN (${sqlPlaceholders(ids.length)}) AND expires_at > NOW()
     ORDER BY created_at ASC`,
    ids,
  );

  const authors = await getUsersByIds([...new Set(rows.map((row) => row.author_id).concat(userId))]);
  const authorMap = new Map(authors.map((row) => [row.id, mapUser(row)]));

  const storyIds = rows.map((row) => row.id);
  const viewedIds = new Set<string>();
  const viewCounts = new Map<string, number>();

  if (storyIds.length > 0) {
    const mine = await query<{ story_id: string }>(
      `SELECT story_id FROM story_views WHERE user_id = $1 AND story_id IN (${sqlPlaceholders(storyIds.length, 2)})`,
      [userId, ...storyIds],
    );
    for (const row of mine) viewedIds.add(row.story_id);

    const ownIds = rows.filter((row) => row.author_id === userId).map((row) => row.id);
    if (ownIds.length > 0) {
      const counts = await query<{ story_id: string; count: string }>(
        `SELECT story_id, COUNT(*)::text AS count FROM story_views
         WHERE story_id IN (${sqlPlaceholders(ownIds.length)}) GROUP BY story_id`,
        ownIds,
      );
      for (const row of counts) viewCounts.set(row.story_id, Number(row.count));
    }
  }

  const byAuthor = new Map<string, StoryRow[]>();
  for (const row of rows) {
    const list = byAuthor.get(row.author_id) ?? [];
    list.push(row);
    byAuthor.set(row.author_id, list);
  }

  const ownStories = (byAuthor.get(userId) ?? []).map((row) =>
    serializeStory(row, authorMap.get(userId)!, viewedIds.has(row.id), viewCounts.get(row.id) ?? 0),
  );

  const friendRings = ids
    .filter((id) => id !== userId)
    .map((id) => {
      const stories = byAuthor.get(id);
      if (!stories?.length) return null;
      const author = authorMap.get(id);
      if (!author) return null;
      const mapped = stories.map((row) => serializeStory(row, author, viewedIds.has(row.id)));
      return {
        author,
        stories: mapped,
        hasUnseen: mapped.some((story) => !story.viewed),
      };
    })
    .filter((ring): ring is NonNullable<typeof ring> => Boolean(ring))
    .sort((a, b) => Number(b.hasUnseen) - Number(a.hasUnseen));

  return [
    { author: mapUser(me), stories: ownStories, hasUnseen: false },
    ...friendRings,
  ];
}

export async function createStory(userId: string, input: { url: string; caption?: string | null }) {
  const active = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM stories WHERE author_id = $1 AND expires_at > NOW()`,
    [userId],
  );
  if (Number(active?.count ?? 0) >= STORY_MAX_ACTIVE) {
    throw badRequest(`Máximo de ${STORY_MAX_ACTIVE} stories ativos`);
  }

  const caption = input.caption?.trim() ? input.caption.trim().slice(0, 200) : null;
  const id = randomUUID();
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + STORY_TTL_MS).toISOString();
  const mediaType = storyMediaType(input.url);

  await exec(
    `INSERT INTO stories (id, author_id, url, media_type, caption, expires_at, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, userId, input.url, mediaType, caption, expiresAt, createdAt],
  );

  const author = mapUser((await getUserRow(userId))!);
  return serializeStory(
    {
      id,
      author_id: userId,
      url: input.url,
      media_type: mediaType,
      caption,
      expires_at: expiresAt,
      created_at: createdAt,
    },
    author,
    false,
    0,
  );
}

export async function deleteStory(id: string, userId: string) {
  const row = await queryOne<StoryRow>(`SELECT * FROM stories WHERE id = $1`, [id]);
  if (!row) throw notFound('Story não encontrado');
  if (row.author_id !== userId) throw forbidden();
  await exec(`DELETE FROM stories WHERE id = $1`, [id]);
  await removeStored(row.url);
}

export async function markStoryViewed(id: string, userId: string) {
  const story = await getActiveStory(id);
  await assertCanSee(story, userId);
  if (story.author_id === userId) return { ok: true };
  await exec(
    `INSERT INTO story_views (story_id, user_id, viewed_at) VALUES ($1,$2,$3)
     ON CONFLICT (story_id, user_id) DO NOTHING`,
    [id, userId, nowIso()],
  );
  return { ok: true };
}

export async function listStoryViewers(id: string, userId: string) {
  const story = await getActiveStory(id);
  if (story.author_id !== userId) throw forbidden();

  const rows = await query<{ user_id: string; viewed_at: string }>(
    `SELECT user_id, viewed_at FROM story_views WHERE story_id = $1 ORDER BY viewed_at DESC`,
    [id],
  );
  if (rows.length === 0) return [];

  const users = await getUsersByIds(rows.map((row) => row.user_id));
  const map = new Map(users.map((row) => [row.id, mapUser(row)]));
  return rows
    .map((row) => {
      const user = map.get(row.user_id);
      if (!user) return null;
      return { user, viewedAt: String(row.viewed_at) };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export async function replyToStory(id: string, userId: string, content: string) {
  const story = await getActiveStory(id);
  await assertCanSee(story, userId);
  if (story.author_id === userId) throw badRequest('Não dá para responder o próprio story');

  const actor = await getUserRow(userId);
  await notify({
    userId: story.author_id,
    actorId: userId,
    type: 'story_reply',
    message: `${actor?.name ?? 'Alguém'} respondeu seu story: ${content.trim().slice(0, 80)}`,
    link: `/?story=${story.id}`,
  });
  return { ok: true };
}
