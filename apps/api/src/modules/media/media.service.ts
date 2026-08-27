import { randomUUID } from 'node:crypto';
import { exec, query, queryOne } from '../../db/client.js';
import { addFeedEvent, nowIso, sqlPlaceholders } from '../../lib/helpers.js';
import { forbidden, notFound } from '../../lib/http.js';
import { publicUrl, removeStored } from '../../lib/storage.js';

export async function createAlbum(userId: string, input: { name: string; description?: string | null; roleId?: string | null }) {
  const id = randomUUID();
  await exec(
    `INSERT INTO albums (id, name, description, role_id, author_id, created_at) VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, input.name, input.description ?? null, input.roleId ?? null, userId, nowIso()],
  );
  return getAlbum(id);
}

export async function getAlbum(id: string) {
  const row = await queryOne(`SELECT * FROM albums WHERE id = $1`, [id]);
  if (!row) throw notFound('Álbum não encontrado');
  const photos = await query(`SELECT * FROM photos WHERE album_id = $1 ORDER BY created_at DESC`, [id]);
  return {
    ...row,
    cover: publicUrl((row.cover as string) ?? (photos[0]?.url as string) ?? null),
    photos: photos.map((photo) => ({ ...photo, url: publicUrl(photo.url as string) })),
  };
}

export async function listAlbums(userId: string) {
  const rows = await query(`SELECT * FROM albums WHERE author_id = $1 ORDER BY created_at DESC`, [userId]);
  if (rows.length === 0) return [];

  const ids = rows.map((row) => row.id as string);
  const photos = await query(
    `SELECT * FROM photos WHERE album_id IN (${sqlPlaceholders(ids.length)}) ORDER BY created_at DESC`,
    ids,
  );

  const byAlbum = new Map<string, typeof photos>();
  for (const photo of photos) {
    const albumId = photo.album_id as string;
    const list = byAlbum.get(albumId) ?? [];
    list.push(photo);
    byAlbum.set(albumId, list);
  }

  return rows.map((row) => {
    const albumPhotos = byAlbum.get(row.id as string) ?? [];
    const mapped = albumPhotos.map((photo) => ({ ...photo, url: publicUrl(photo.url as string) }));
    return {
      ...row,
      cover: publicUrl((row.cover as string) ?? (albumPhotos[0]?.url as string) ?? null),
      photos: mapped,
    };
  });
}

export async function deleteAlbum(id: string, userId: string) {
  const row = await queryOne<{ author_id: string; cover: string | null }>(
    `SELECT author_id, cover FROM albums WHERE id = $1`,
    [id],
  );
  if (!row) throw notFound('Álbum não encontrado');
  if (row.author_id !== userId) throw forbidden();
  await exec(`DELETE FROM albums WHERE id = $1`, [id]);
  await removeStored(row.cover);
}

export async function addPhoto(
  userId: string,
  input: { url: string; caption?: string | null; albumId?: string | null; roleId?: string | null },
) {
  const id = randomUUID();
  await exec(
    `INSERT INTO photos (id, url, caption, album_id, role_id, author_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, input.url, input.caption ?? null, input.albumId ?? null, input.roleId ?? null, userId, nowIso()],
  );
  await addFeedEvent({ type: 'photo_added', actorId: userId, photoId: id, roleId: input.roleId ?? null });
  return { id, url: publicUrl(input.url), caption: input.caption ?? null, albumId: input.albumId ?? null, roleId: input.roleId ?? null, authorId: userId };
}

export async function listPhotos(userId?: string) {
  const rows = userId
    ? await query(`SELECT * FROM photos WHERE author_id = $1 ORDER BY created_at DESC`, [userId])
    : await query(`SELECT * FROM photos ORDER BY created_at DESC LIMIT 60`);
  return rows.map((photo) => ({ ...photo, url: publicUrl(photo.url as string) }));
}

export async function deletePhoto(id: string, userId: string) {
  const row = await queryOne<{ author_id: string; url: string }>(`SELECT author_id, url FROM photos WHERE id = $1`, [id]);
  if (!row) throw notFound('Foto não encontrada');
  if (row.author_id !== userId) throw forbidden();
  await exec(`DELETE FROM photos WHERE id = $1`, [id]);
  await removeStored(row.url);
}

export async function addAudio(
  userId: string,
  input: { url: string; name: string; duration?: number | null; roleId?: string | null; reviewId?: string | null },
) {
  if ((input.duration ?? 0) > 300) throw new Error('AUDIO_TOO_LONG');
  const id = randomUUID();
  await exec(
    `INSERT INTO audios (id, url, name, duration, role_id, review_id, author_id, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, input.url, input.name, input.duration ?? null, input.roleId ?? null, input.reviewId ?? null, userId, nowIso()],
  );
  await addFeedEvent({ type: 'audio_added', actorId: userId, audioId: id, roleId: input.roleId ?? null });
  return { id, url: publicUrl(input.url), name: input.name, duration: input.duration ?? null, roleId: input.roleId ?? null, reviewId: input.reviewId ?? null, authorId: userId };
}

export async function listAudios(userId?: string) {
  const rows = userId
    ? await query(`SELECT * FROM audios WHERE author_id = $1 ORDER BY created_at DESC`, [userId])
    : await query(`SELECT * FROM audios ORDER BY created_at DESC LIMIT 40`);
  return rows.map((audio) => ({ ...audio, url: publicUrl(audio.url as string) }));
}

export async function deleteAudio(id: string, userId: string) {
  const row = await queryOne<{ author_id: string; url: string }>(`SELECT author_id, url FROM audios WHERE id = $1`, [id]);
  if (!row) throw notFound('Áudio não encontrado');
  if (row.author_id !== userId) throw forbidden();
  await exec(`DELETE FROM audios WHERE id = $1`, [id]);
  await removeStored(row.url);
}
