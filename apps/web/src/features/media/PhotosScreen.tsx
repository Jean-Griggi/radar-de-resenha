'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Album, AudioClip, Photo } from '@resenhometro/shared';
import { X } from 'lucide-react';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { Field, Input } from '@/components/Field';
import { Mesa, useMesaViewer, MesaViewer, type MesaEntry } from '@/components/Mesa';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { formatMeta, plural } from '@/lib/format';
import { PhotoViewer, type ViewerPhoto } from './PhotoViewer';
import { IMAGE_ACCEPT, postFile } from '@/lib/upload';

export function PhotosScreen() {
  const toast = useToast();
  const mesa = useMesaViewer();
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

  async function deleteAlbum(albumId: string) {
    if (!confirm('Excluir álbum?')) return;
    try {
      await api.delete(`/albums/${albumId}`);
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Não foi possível excluir o álbum'), 'error');
    }
  }

  async function deletePhoto(photoId: string) {
    try {
      await api.delete(`/photos/${photoId}`);
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Não foi possível excluir a foto'), 'error');
    }
  }

  function albumEntry(album: Album): MesaEntry {
    return {
      id: `album-${album.id}`,
      label: `Álbum ${album.name}, ${plural(album.photos?.length ?? 0, 'foto', 'fotos')}`,
      image: album.cover ?? album.photos?.[0]?.url ?? null,
      text: album.name,
      meta: plural(album.photos?.length ?? 0, 'foto', 'fotos'),
    };
  }

  function photoEntry(photo: Photo): MesaEntry {
    return {
      id: `photo-${photo.id}`,
      label: photo.author?.name ? `Foto de ${photo.author.name}` : 'Foto',
      image: photo.url,
      text: photo.caption || undefined,
      avatar: photo.author ? { src: photo.author.avatar, name: photo.author.name } : undefined,
      meta: formatMeta(photo.createdAt),
      dateTime: photo.createdAt,
    };
  }

  function toViewerPhoto(photo: Photo): ViewerPhoto {
    return {
      id: photo.id,
      url: photo.url,
      caption: photo.caption,
      authorName: photo.author?.name,
      createdAt: photo.createdAt,
    };
  }

  const openAlbum = mesa.openId?.startsWith('album-') ? albums.find((album) => `album-${album.id}` === mesa.openId) : undefined;
  const openPhoto = mesa.openId?.startsWith('photo-') ? photos.find((photo) => `photo-${photo.id}` === mesa.openId) : undefined;

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
    <>
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
      {error ? <p className="mb-5 text-[var(--k-danger)]">{error}</p> : null}

      {!loading && !error ? (
        <>
          <h2 className="mb-3 text-lg font-medium">Álbuns</h2>
          {!error && albums.length === 0 ? <p className="mb-6 text-sm text-muted">Nenhum álbum ainda.</p> : null}
          {albums.length > 0 ? (
            <div className="mb-6">
              <Mesa
                label="Álbuns"
                entries={albums.map(albumEntry)}
                onOpen={mesa.open}
                renderExtra={(id) => (
                  <button
                    type="button"
                    className="k-mesa__action"
                    aria-label="Excluir álbum"
                    onClick={() => deleteAlbum(id.replace(/^album-/, ''))}
                  >
                    <X size={18} aria-hidden />
                  </button>
                )}
              />
            </div>
          ) : null}

          <h2 className="mb-3 text-lg font-medium">Galeria</h2>
          {!error && photos.length === 0 ? <EmptyState title="Nenhuma foto ainda." /> : null}
          {photos.length > 0 ? (
            <Mesa
              label="Galeria"
              entries={photos.map(photoEntry)}
              onOpen={mesa.open}
              renderExtra={(id) => (
                <button
                  type="button"
                  className="k-mesa__action"
                  aria-label="Excluir foto"
                  onClick={() => deletePhoto(id.replace(/^photo-/, ''))}
                >
                  <X size={18} aria-hidden />
                </button>
              )}
            />
          ) : null}

          <h2 className="mt-8 mb-3 text-lg font-medium">Áudios</h2>
          {!error && audios.length === 0 ? <p className="text-sm text-muted">Nenhum áudio ainda.</p> : null}
          <div className="space-y-3">
            {audios.map((audio) => (
              <div key={audio.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p>🎙️ {audio.name}</p>
                  <button
                    type="button"
                    className="text-xs text-[var(--k-danger)]"
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

      <MesaViewer
        open={Boolean(openAlbum || openPhoto)}
        onClose={mesa.close}
        label={openAlbum ? `Álbum ${openAlbum.name}` : 'Galeria de fotos'}
      >
        {openAlbum ? (
          <PhotoViewer
            title={openAlbum.name}
            photos={(openAlbum.photos ?? []).map(toViewerPhoto)}
            transitionId={mesa.openId ?? ''}
          />
        ) : openPhoto ? (
          <PhotoViewer
            title="Galeria"
            photos={photos.map(toViewerPhoto)}
            startId={openPhoto.id}
            transitionId={mesa.openId ?? ''}
          />
        ) : null}
      </MesaViewer>
    </>
  );
}
