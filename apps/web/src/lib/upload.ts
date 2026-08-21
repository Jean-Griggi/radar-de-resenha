import { api } from './api';

type UploadKind = 'avatar' | 'cover' | 'photo' | 'audio';

type SignResponse = {
  mode: 'multipart' | 'signed';
  signedUrl?: string;
  relative?: string;
  confirmToken?: string;
};

export async function postFile<T>(
  endpoint: string,
  kind: UploadKind,
  file: File,
  fields: Record<string, string | undefined> = {},
) {
  const extra = Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );

  const { data: signed } = await api.post<SignResponse>('/storage/sign', {
    kind,
    contentType: file.type || 'application/octet-stream',
    filename: file.name,
  });

  if (signed.mode === 'signed' && signed.signedUrl && signed.relative && signed.confirmToken) {
    const put = await fetch(signed.signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false',
      },
      body: file,
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
  body.append('file', file);
  for (const [key, value] of Object.entries(extra)) {
    body.append(key, value);
  }
  const { data } = await api.post<T>(endpoint, body);
  return data;
}
