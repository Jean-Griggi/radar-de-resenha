import { randomUUID } from 'node:crypto';
import { exec } from '../../db/client.js';
import { nowIso } from '../../lib/helpers.js';

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
