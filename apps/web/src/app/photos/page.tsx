'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Album, AudioClip, Photo } from '@resenhometro/shared';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { Field, Input } from '@/components/Field';
import { MediaImage } from '@/components/MediaImage';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { IMAGE_ACCEPT, postFile } from '@/lib/upload';

export default function PhotosPage() {
  const toast = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [audios, setAudios] = useState<AudioClip[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumName, setAlbumName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const limitTimer = useRef<number | null>(null);

  function clearLimitTimer() {
    if (limitTimer.current == null) return;
    window.clearTimeout(limitTimer.current);
    limitTimer.current = null;
  }

  async function load(signal?: AbortSignal) {
    const config = signal ? { signal } : undefined;
    const [p, a, al] = await Promise.all([
      api.get<Photo[]>('/photos', config),
      api.get<AudioClip[]>('/audios', config),
      api.get<Album[]>('/albums', config),
    ]);
    setPhotos(p.data);
    setAudios(a.data);
    setAlbums(al.data);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setError('');
      })
      .catch((err) => {
        if (isApiCanceled(err)) return;
        setError(apiErrorMessage(err, 'Não foi possível carregar fotos e áudios'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      clearLimitTimer();
      if (mediaRef.current?.state === 'recording') mediaRef.current.stop();
    };
  }, []);

  async function uploadPhoto(file: File) {
    try {
      await postFile('/photos', 'photo', file, { roleId: roleId || undefined });
      toast.push('Foto adicionada');
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Falha no envio da foto'), 'error');
    }
  }

  async function uploadAudio(file: File, name = file.name, duration?: number) {
    try {
      await postFile('/audios', 'audio', file, {
        name,
        duration: duration ? String(Math.min(duration, 300)) : undefined,
        roleId: roleId || undefined,
      });
      toast.push('Áudio salvo');
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Falha no envio do áudio'), 'error');
    }
  }

  async function createAlbum(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post('/albums', { name: albumName, roleId: roleId || null });
      setAlbumName('');
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Não foi possível criar o álbum'), 'error');
    }
  }

  function stopRecording() {
    clearLimitTimer();
    const recorder = mediaRef.current;
    if (recorder && recorder.state === 'recording') recorder.stop();
    setRecording(false);
  }

  async function startRecording() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      toast.push(apiErrorMessage(err, 'Não foi possível acessar o microfone'), 'error');
      return;
    }
    const recorder = new MediaRecorder(stream);
    chunks.current = [];
    recorder.ondataavailable = (event) => chunks.current.push(event.data);
    recorder.onstop = async () => {
      const blob = new Blob(chunks.current, { type: 'audio/webm' });
      const file = new File([blob], 'historia-da-noite.webm', { type: 'audio/webm' });
      await uploadAudio(file, 'História da noite');
      stream.getTracks().forEach((track) => track.stop());
    };
    mediaRef.current = recorder;
    recorder.start();
    setRecording(true);
    limitTimer.current = window.setTimeout(() => {
      limitTimer.current = null;
      stopRecording();
    }, 300000);
  }

  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Fotos e áudios</h1>
      <div className="card mb-5 grid gap-4 p-5 sm:grid-cols-2">
        <Field label="Associar a um rolê (id opcional)">
          <Input value={roleId} onChange={(e) => setRoleId(e.target.value)} placeholder="uuid do rolê" />
        </Field>
        <Field label="Enviar foto">
          <Input type="file" accept={IMAGE_ACCEPT} onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          <p className="mt-1 text-xs text-muted">JPEG, PNG, WebP ou HEIC. No iPhone, se não abrir, envie JPEG.</p>
        </Field>
        <Field label="Enviar áudio">
          <Input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])} />
        </Field>
        <div className="flex items-end">
          <Button type="button" variant={recording ? 'danger' : 'secondary'} onClick={() => (recording ? stopRecording() : startRecording())}>
            {recording ? 'Parar gravação' : 'Gravar história'}
          </Button>
        </div>
        <form onSubmit={createAlbum} className="flex items-end gap-2 sm:col-span-2">
          <Field label="Novo álbum">
            <Input value={albumName} onChange={(e) => setAlbumName(e.target.value)} required />
          </Field>
          <Button type="submit">Criar álbum</Button>
        </form>
      </div>

      {loading ? (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : null}
      {error ? <p className="mb-5 text-[var(--danger)]">{error}</p> : null}

      {!loading && !error ? (
        <>
          <h2 className="mb-3 text-lg font-medium">Álbuns</h2>
          {!error && albums.length === 0 ? <p className="mb-6 text-sm text-muted">Nenhum álbum ainda.</p> : null}
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            {albums.map((album) => (
              <div key={album.id} className="card p-4">
                {album.cover ? (
                  <MediaImage src={album.cover} alt={album.name} className="mb-2 h-24 w-full rounded-lg object-cover" />
                ) : null}
                <p>{album.name}</p>
                <p className="text-xs text-muted">{album.photos?.length ?? 0} fotos</p>
                <button
                  type="button"
                  className="mt-2 text-xs text-[var(--danger)]"
                  onClick={async () => {
                    if (!confirm('Excluir álbum?')) return;
                    try {
                      await api.delete(`/albums/${album.id}`);
                      await load();
                    } catch (err) {
                      if (isApiCanceled(err)) return;
                      toast.push(apiErrorMessage(err, 'Não foi possível excluir o álbum'), 'error');
                    }
                  }}
                >
                  Excluir
                </button>
              </div>
            ))}
          </div>

          <h2 className="mb-3 text-lg font-medium">Galeria</h2>
          {!error && photos.length === 0 ? <EmptyState title="Nenhuma foto ainda." /> : null}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((photo) => (
              <figure key={photo.id} className="relative">
                <MediaImage src={photo.url} alt={photo.caption || 'Foto'} className="h-28 w-full rounded-xl object-cover sm:h-40" />
                <button
                  type="button"
                  className="absolute top-2 right-2 rounded-full bg-black/60 px-2 text-xs"
                  onClick={async () => {
                    try {
                      await api.delete(`/photos/${photo.id}`);
                      await load();
                    } catch (err) {
                      if (isApiCanceled(err)) return;
                      toast.push(apiErrorMessage(err, 'Não foi possível excluir a foto'), 'error');
                    }
                  }}
                >
                  ×
                </button>
              </figure>
            ))}
          </div>

          <h2 className="mt-8 mb-3 text-lg font-medium">Áudios</h2>
          {!error && audios.length === 0 ? <p className="text-sm text-muted">Nenhum áudio ainda.</p> : null}
          <div className="space-y-3">
            {audios.map((audio) => (
              <div key={audio.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p>🎙️ {audio.name}</p>
                  <button
                    type="button"
                    className="text-xs text-[var(--danger)]"
                    onClick={async () => {
                      try {
                        await api.delete(`/audios/${audio.id}`);
                        await load();
                      } catch (err) {
                        if (isApiCanceled(err)) return;
                        toast.push(apiErrorMessage(err, 'Não foi possível excluir o áudio'), 'error');
                      }
                    }}
                  >
                    Excluir
                  </button>
                </div>
                <audio controls src={audio.url} className="mt-2 w-full" />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </RequireAuth>
  );
}
