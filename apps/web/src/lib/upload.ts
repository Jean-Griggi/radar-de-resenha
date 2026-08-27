import { api } from './api';

type UploadKind = 'avatar' | 'cover' | 'photo' | 'audio';

type SignResponse = {
  mode: 'multipart' | 'signed';
  signedUrl?: string;
  relative?: string;
  confirmToken?: string;
};

const HEIC_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif';

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

export async function postFile<T>(
  endpoint: string,
  kind: UploadKind,
  file: File,
  fields: Record<string, string | undefined> = {},
) {
  const ready = kind === 'audio' ? file : await prepareImageFile(file);
  const extra = Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  const { data: signed } = await api.post<SignResponse>('/storage/sign', {
    kind,
    contentType: ready.type || 'application/octet-stream',
    filename: ready.name,
  });

  if (signed.mode === 'signed' && signed.signedUrl && signed.relative && signed.confirmToken) {
    const put = await fetch(signed.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': ready.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: ready,
    });

    if (!put.ok) {
      throw new Error('Falha no envio do arquivo');
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
