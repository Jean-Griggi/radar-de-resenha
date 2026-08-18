import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import { env } from '../config/env.js';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a']);

const LIMITS = {
  avatar: 5 * 1024 * 1024,
  cover: 8 * 1024 * 1024,
  photo: 8 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
};

export function storageRoot() {
  return resolve(env.STORAGE_DIR ?? join(process.cwd(), 'data', 'uploads'));
}

export async function ensureStorage() {
  const root = storageRoot();
  for (const folder of ['avatars', 'covers', 'photos', 'audios']) {
    await mkdir(join(root, folder), { recursive: true });
  }
}

function extensionFor(file: MultipartFile, fallback: string) {
  const fromName = extname(file.filename || '').toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.mimetype === 'image/png') return '.png';
  if (file.mimetype === 'image/webp') return '.webp';
  if (file.mimetype === 'image/gif') return '.gif';
  if (file.mimetype === 'audio/wav') return '.wav';
  if (file.mimetype === 'audio/webm') return '.webm';
  if (file.mimetype === 'audio/ogg') return '.ogg';
  return fallback;
}

export async function saveUpload(
  file: MultipartFile,
  kind: keyof typeof LIMITS,
): Promise<{ url: string; relative: string }> {
  const isAudio = kind === 'audio';
  const allowed = isAudio ? AUDIO_TYPES : IMAGE_TYPES;

  if (!allowed.has(file.mimetype)) {
    throw new Error('UNSUPPORTED_MEDIA');
  }

  const folder = kind === 'avatar' ? 'avatars' : kind === 'cover' ? 'covers' : isAudio ? 'audios' : 'photos';
  const filename = `${randomUUID()}${extensionFor(file, isAudio ? '.mp3' : '.jpg')}`;
  const relative = `${folder}/${filename}`;
  const fullPath = join(storageRoot(), relative);

  await mkdir(join(storageRoot(), folder), { recursive: true });
  await pipeline(file.file, createWriteStream(fullPath));

  if (file.file.truncated) {
    await unlink(fullPath).catch(() => undefined);
    throw new Error('FILE_TOO_LARGE');
  }

  return {
    relative,
    url: `${env.PUBLIC_API_URL}/uploads/${relative}`,
  };
}

export function publicUrl(relative: string | null | undefined) {
  if (!relative) return null;
  if (relative.startsWith('http://') || relative.startsWith('https://')) return relative;
  return `${env.PUBLIC_API_URL}/uploads/${relative.replace(/^\/+/, '')}`;
}

export async function removeStored(relative: string | null | undefined) {
  if (!relative || relative.startsWith('http')) return;
  await unlink(join(storageRoot(), relative)).catch(() => undefined);
}
