import { randomUUID } from 'node:crypto';
import { exec, query, queryOne } from '../../db/client.js';
import { addFeedEvent, evaluateAchievements, getReactionSummary, getUserRow, mapUser, nowIso, parseJson } from '../../lib/helpers.js';
import { forbidden, notFound } from '../../lib/http.js';
import { publicUrl } from '../../lib/storage.js';
import { nestComments } from '../roles/roles.service.js';
import type { ReviewInput } from '../common.schema.js';

type ReviewRow = {
  id: string;
  role_id: string;
  author_id: string;
  title: string;
  content: string;
  rating: number;
  ratings: string;
  tags: string;
  created_at: string;
  updated_at: string;
};

export async function serializeReview(row: ReviewRow, viewerId?: string) {
  const author = await getUserRow(row.author_id);
  const role = await queryOne<{ id: string; title: string; date: string | null; location: string | null; category: string }>(
    `SELECT id, title, date, location, category FROM roles WHERE id = $1`,
    [row.role_id],
  );
  const photos = await query(`SELECT * FROM photos WHERE role_id = $1 ORDER BY created_at DESC LIMIT 6`, [row.role_id]);
  const audios = await query(`SELECT * FROM audios WHERE review_id = $1 OR role_id = $2 ORDER BY created_at DESC LIMIT 6`, [
    row.id,
    row.role_id,
  ]);

  return {
    id: row.id,
    roleId: row.role_id,
    authorId: row.author_id,
    author: author ? mapUser(author) : null,
    title: row.title,
    content: row.content,
    rating: row.rating,
    ratings: parseJson(row.ratings, {}),
    tags: parseJson<string[]>(row.tags, []),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    role,
    comments: await nestComments('review', row.id, viewerId),
    reactions: await getReactionSummary('review', row.id, viewerId),
    photos: photos.map((photo) => ({ ...photo, url: publicUrl(photo.url as string) })),
    audios: audios.map((audio) => ({ ...audio, url: publicUrl(audio.url as string) })),
  };
}

export async function createReview(userId: string, input: ReviewInput) {
  const role = await queryOne(`SELECT id FROM roles WHERE id = $1`, [input.roleId]);
  if (!role) throw notFound('Rolê não encontrado');

  const existing = await queryOne<ReviewRow>(`SELECT * FROM reviews WHERE role_id = $1 AND author_id = $2`, [
    input.roleId,
    userId,
  ]);
  const stamp = nowIso();
  const ratings = JSON.stringify(input.ratings ?? {});
  const tags = JSON.stringify(input.tags ?? []);

  if (existing) {
    await exec(
      `UPDATE reviews SET title = $1, content = $2, rating = $3, ratings = $4, tags = $5, updated_at = $6 WHERE id = $7`,
      [input.title, input.content, input.rating, ratings, tags, stamp, existing.id],
    );
    return serializeReview({ ...existing, title: input.title, content: input.content, rating: input.rating, ratings, tags, updated_at: stamp }, userId);
  }

  const id = randomUUID();
  await exec(
    `INSERT INTO reviews (id, role_id, author_id, title, content, rating, ratings, tags, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, input.roleId, userId, input.title, input.content, input.rating, ratings, tags, stamp, stamp],
  );
  await addFeedEvent({ type: 'review_published', actorId: userId, roleId: input.roleId, reviewId: id });
  await evaluateAchievements(userId);
  const row = await queryOne<ReviewRow>(`SELECT * FROM reviews WHERE id = $1`, [id]);
  return serializeReview(row!, userId);
}

export async function getReview(id: string, viewerId?: string) {
  const row = await queryOne<ReviewRow>(`SELECT * FROM reviews WHERE id = $1`, [id]);
  if (!row) throw notFound('Resenha não encontrada');
  return serializeReview(row, viewerId);
}

export async function updateReview(id: string, userId: string, input: Partial<ReviewInput>) {
  const row = await queryOne<ReviewRow>(`SELECT * FROM reviews WHERE id = $1`, [id]);
  if (!row) throw notFound('Resenha não encontrada');
  if (row.author_id !== userId) throw forbidden();
  await exec(
    `UPDATE reviews SET title = $1, content = $2, rating = $3, ratings = $4, tags = $5, updated_at = $6 WHERE id = $7`,
    [
      input.title ?? row.title,
      input.content ?? row.content,
      input.rating ?? row.rating,
      JSON.stringify(input.ratings ?? parseJson(row.ratings, {})),
      JSON.stringify(input.tags ?? parseJson(row.tags, [])),
      nowIso(),
      id,
    ],
  );
  return getReview(id, userId);
}

export async function deleteReview(id: string, userId: string) {
  const row = await queryOne<ReviewRow>(`SELECT * FROM reviews WHERE id = $1`, [id]);
  if (!row) throw notFound('Resenha não encontrada');
  if (row.author_id !== userId) throw forbidden();
  await exec(`DELETE FROM reviews WHERE id = $1`, [id]);
}

export async function listReviews() {
  const rows = await query<ReviewRow>(`SELECT * FROM reviews ORDER BY created_at DESC LIMIT 40`);
  return Promise.all(rows.map((row) => serializeReview(row)));
}
