import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { MultipartFile } from '@fastify/multipart';
import type { FastifyRequest } from 'fastify';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

const IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);
const AUDIO_TYPES = new Set(['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/x-m4a']);
const VIDEO_TYPES = new Set(['video/mp4', 'video/webm', 'video/quicktime']);
const STORY_TYPES = new Set([...IMAGE_TYPES, ...VIDEO_TYPES]);

const LIMITS = {
  avatar: 5 * 1024 * 1024,
  cover: 8 * 1024 * 1024,
  photo: 8 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
  story: 12 * 1024 * 1024,
};

const MIME_FROM_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
};

export type UploadKind = keyof typeof LIMITS;

// Se as credenciais do Supabase estiverem presentes, usamos Supabase Storage
// (obrigatório em produção/Vercel, onde o disco é efêmero). Sem elas, caímos
// para o disco local — útil apenas para desenvolvimento.
const useSupabase = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = useSupabase
  ? createClient(env.SUPABASE_URL as string, env.SUPABASE_SERVICE_ROLE_KEY as string, {
      auth: { persistSession: false },
    })
  : null;

export function isSupabaseStorage() {
  return useSupabase;
}

export function storageRoot() {
  return resolve(env.STORAGE_DIR ?? join(process.cwd(), 'data', 'uploads'));
}

function assertSupabaseEnv() {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url && !key) return;
  if (!url || !key) {
    throw new Error(
      'Supabase Storage incompleto: defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY juntos.',
    );
  }
}

export async function ensureStorage() {
  assertSupabaseEnv();
  if (useSupabase) {
    // Bucket já deve existir no dashboard. listBuckets/createBucket no boot
    // atrasava todo cold start e falhava em silêncio se o env estivesse errado.
    return;
  }

  const root = storageRoot();
  for (const folder of ['avatars', 'covers', 'photos', 'audios', 'stories']) {
    await mkdir(join(root, folder), { recursive: true });
  }
}

function folderFor(kind: UploadKind) {
  if (kind === 'avatar') return 'avatars';
  if (kind === 'cover') return 'covers';
  if (kind === 'audio') return 'audios';
  if (kind === 'story') return 'stories';
  return 'photos';
}

function isVideoMime(contentType: string) {
  return VIDEO_TYPES.has(contentType);
}

function normalizeMime(contentType: string, filename?: string) {
  if (IMAGE_TYPES.has(contentType) || AUDIO_TYPES.has(contentType) || VIDEO_TYPES.has(contentType)) {
    return contentType;
  }
  const fromExt = MIME_FROM_EXT[extname(filename || '').toLowerCase()];
  return fromExt ?? contentType;
}

function extensionFor(filename: string | undefined, mimetype: string, fallback: string) {
  const fromName = extname(filename || '').toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (mimetype === 'image/png') return '.png';
  if (mimetype === 'image/webp') return '.webp';
  if (mimetype === 'image/gif') return '.gif';
  if (mimetype === 'image/heic' || mimetype === 'image/heic-sequence') return '.heic';
  if (mimetype === 'image/heif' || mimetype === 'image/heif-sequence') return '.heif';
  if (mimetype === 'audio/wav') return '.wav';
  if (mimetype === 'audio/webm') return '.webm';
  if (mimetype === 'audio/ogg') return '.ogg';
  if (mimetype === 'audio/mp4' || mimetype === 'audio/x-m4a') return '.m4a';
  if (mimetype === 'video/webm') return '.webm';
  if (mimetype === 'video/quicktime') return '.mov';
  if (mimetype === 'video/mp4') return '.mp4';
  return fallback;
}

function defaultExtension(kind: UploadKind, mime: string) {
  if (kind === 'audio') return '.mp3';
  if (kind === 'story' && isVideoMime(mime)) return '.mp4';
  return '.jpg';
}

function assertAllowed(kind: UploadKind, contentType: string) {
  const allowed = kind === 'audio' ? AUDIO_TYPES : kind === 'story' ? STORY_TYPES : IMAGE_TYPES;
  if (!allowed.has(contentType)) {
    throw new Error('UNSUPPORTED_MEDIA');
  }
}

function issueConfirmToken(relative: string, userId: string, kind: UploadKind) {
  const exp = Date.now() + 15 * 60 * 1000;
  const payload = `${relative}.${userId}.${kind}.${exp}`;
  const sig = createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
  return `${exp}.${sig}`;
}

function assertConfirmToken(relative: string, token: string, userId: string, kind: UploadKind) {
  const safePath =
    /^(avatars|covers|photos|audios|stories)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/i;
  if (!safePath.test(relative)) {
    throw new Error('INVALID_UPLOAD_TOKEN');
  }

  const dot = token.indexOf('.');
  const expRaw = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const exp = Number(expRaw);
  if (dot < 0 || !sig || Number.isNaN(exp) || Date.now() > exp) {
    throw new Error('INVALID_UPLOAD_TOKEN');
  }

  const payload = `${relative}.${userId}.${kind}.${exp}`;
  const expected = createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error('INVALID_UPLOAD_TOKEN');
  }
}

function multipartFields(file: MultipartFile) {
  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(file.fields ?? {})) {
    const field = Array.isArray(value) ? value[0] : value;
    if (field && typeof field === 'object' && 'value' in field && typeof field.value === 'string') {
      fields[key] = field.value;
    }
  }
  return fields;
}

export async function signUpload(
  kind: UploadKind,
  contentType: string,
  filename: string | undefined,
  userId: string,
) {
  const mime = normalizeMime(contentType, filename);
  assertAllowed(kind, mime);

  if (!useSupabase) {
    return { mode: 'multipart' as const };
  }

  const relative = `${folderFor(kind)}/${randomUUID()}${extensionFor(filename, mime, defaultExtension(kind, mime))}`;
  const { data, error } = await supabase!.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .createSignedUploadUrl(relative);

  if (error || !data?.signedUrl) {
    throw new Error(`UPLOAD_FAILED: ${error?.message ?? 'sign'}`);
  }

  return {
    mode: 'signed' as const,
    signedUrl: data.signedUrl,
    relative,
    confirmToken: issueConfirmToken(relative, userId, kind),
  };
}

export async function takeUpload(request: FastifyRequest, kind: UploadKind) {
  const userId = request.user.sub;

  if (request.isMultipart()) {
    const file = await request.file();
    if (!file) throw new Error('NO_FILE');
    const saved = await saveUpload(file, kind);
    return { ...saved, fields: multipartFields(file) };
  }

  const body = (request.body ?? {}) as Record<string, unknown>;
  const relative = typeof body.relative === 'string' ? body.relative : '';
  const confirmToken = typeof body.confirmToken === 'string' ? body.confirmToken : '';
  if (!relative || !confirmToken) throw new Error('NO_FILE');
  assertConfirmToken(relative, confirmToken, userId, kind);

  const fields: Record<string, string> = {};
  for (const [key, value] of Object.entries(body)) {
    if (key === 'relative' || key === 'confirmToken') continue;
    if (typeof value === 'string' || typeof value === 'number') fields[key] = String(value);
  }

  return { relative, url: publicUrl(relative) ?? relative, fields };
}

export async function saveUpload(
  file: MultipartFile,
  kind: UploadKind,
): Promise<{ url: string; relative: string }> {
  const mime = normalizeMime(file.mimetype, file.filename);
  assertAllowed(kind, mime);

  const filename = `${randomUUID()}${extensionFor(file.filename, mime, defaultExtension(kind, mime))}`;
  const relative = `${folderFor(kind)}/${filename}`;
  const buffer = await file.toBuffer();

  if (buffer.byteLength > LIMITS[kind]) {
    throw new Error('FILE_TOO_LARGE');
  }

  if (useSupabase) {
    const { error } = await supabase!.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(relative, buffer, { contentType: mime, upsert: false });

    if (error) {
      throw new Error(`UPLOAD_FAILED: ${error.message}`);
    }

    return { relative, url: publicUrl(relative) ?? relative };
  }

  const fullPath = join(storageRoot(), relative);
  await mkdir(join(storageRoot(), folderFor(kind)), { recursive: true });
  await pipeline(Readable.from(buffer), createWriteStream(fullPath));

  return { relative, url: publicUrl(relative) ?? relative };
}

function storedPath(value: string | null | undefined) {
  if (!value) return null;
  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return value.replace(/^\/+/, '');
  }
  try {
    const pathname = new URL(value).pathname;
    const uploads = pathname.indexOf('/uploads/');
    if (uploads >= 0) return decodeURIComponent(pathname.slice(uploads + '/uploads/'.length));
    const bucket = `/${env.SUPABASE_STORAGE_BUCKET}/`;
    const idx = pathname.indexOf(bucket);
    if (idx >= 0) return decodeURIComponent(pathname.slice(idx + bucket.length));
  } catch {
    return null;
  }
  return null;
}

export function publicUrl(relative: string | null | undefined) {
  if (!relative) return null;
  if (relative.startsWith('http://') || relative.startsWith('https://')) return relative;
  const path = relative.replace(/^\/+/, '');
  if (useSupabase) {
    const { data } = supabase!.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }
  return `${env.PUBLIC_API_URL}/uploads/${path}`;
}

export async function removeStored(relative: string | null | undefined) {
  const path = storedPath(relative);
  if (!path) return;
  if (useSupabase) {
    await supabase!.storage.from(env.SUPABASE_STORAGE_BUCKET).remove([path]).catch(() => undefined);
    return;
  }
  await unlink(join(storageRoot(), path)).catch(() => undefined);
}
