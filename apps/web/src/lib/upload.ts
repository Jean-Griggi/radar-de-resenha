import { api } from './api';

type UploadKind = 'avatar' | 'cover' | 'photo' | 'audio' | 'story' | 'chat';

type SignResponse = {
  mode: 'multipart' | 'signed';
  signedUrl?: string;
  relative?: string;
  confirmToken?: string;
};

const HEIC_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif';
export const STORY_ACCEPT = `${IMAGE_ACCEPT},video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov`;
export const STORY_VIDEO_MAX_SECONDS = 15;

export function isHeicFile(file: File) {
  const type = file.type.toLowerCase();
  if (HEIC_TYPES.has(type)) return true;
  return /\.(heic|heif)$/i.test(file.name);
}

export async function prepareImageFile(file: File) {
  if (!isHeicFile(file)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('blob');
    const base = file.name.replace(/\.(heic|heif)$/i, '') || 'foto';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    throw new Error(
      'Este formato (HEIC) não abre neste aparelho. Exporte a foto como JPEG ou PNG e envie de novo.',
    );
  }
}

export async function getVideoDuration(file: File) {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number>((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => resolve(video.duration || 0);
      video.onerror = () => reject(new Error('Não foi possível ler o vídeo'));
      video.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function prepareStoryFile(file: File) {
  if (file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name)) {
    const duration = await getVideoDuration(file);
    if (duration > STORY_VIDEO_MAX_SECONDS + 0.5) {
      throw new Error(`O vídeo pode ter no máximo ${STORY_VIDEO_MAX_SECONDS} segundos`);
    }
    return file;
  }
  return prepareImageFile(file);
}

export async function postFile<T>(
  endpoint: string,
  kind: UploadKind,
  file: File,
  fields: Record<string, string | undefined> = {},
) {
  const ready = kind === 'audio' ? file : kind === 'story' ? await prepareStoryFile(file) : await prepareImageFile(file);
  const extra = Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  const { data: signed } = await api.post<SignResponse>('/storage/sign', {
    kind,
    contentType: ready.type || 'application/octet-stream',
    filename: ready.name,
  });

  if (signed.mode === 'signed' && signed.signedUrl && signed.relative && signed.confirmToken) {
    let put: Response;
    try {
      put = await fetch(signed.signedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': ready.type || 'application/octet-stream',
          'x-upsert': 'false',
        },
        body: ready,
      });
    } catch {
      throw new Error('Não foi possível enviar o arquivo ao armazenamento (rede ou bloqueio do navegador).');
    }

    if (!put.ok) {
      const detail = (await put.text().catch(() => '')).slice(0, 140);
      throw new Error(`O armazenamento recusou o arquivo (erro ${put.status}). ${detail}`.trim());
    }

    const { data } = await api.post<T>(endpoint, {
      relative: signed.relative,
      confirmToken: signed.confirmToken,
      ...extra,
    });
    return data;
  }

  const body = new FormData();
  body.append('file', ready);
  for (const [key, value] of Object.entries(extra)) {
    body.append(key, value);
  }
  const { data } = await api.post<T>(endpoint, body);
  return data;
}

/**
 * Reduz a imagem (lado maior = `maxSide`) e salva como JPEG. Foto de celular passa fácil do limite
 * de 5 MB (foto de perfil) e 8 MB (capa) do servidor; reduzida, sempre cabe e carrega mais rápido.
 */
export async function shrinkImage(file: File, maxSide: number) {
  const ready = await prepareImageFile(file);
  if (ready.type === 'image/gif') return ready;
  try {
    const bitmap = await createImageBitmap(ready);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return ready;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    if (!blob) return ready;
    const base = ready.name.replace(/\.[^.]+$/, '') || 'foto';
    return new File([blob], `${base}.jpg`, { type: 'image/jpeg' });
  } catch {
    return ready;
  }
}
