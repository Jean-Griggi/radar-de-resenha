'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { Album, AudioClip, Photo } from '@resenhometro/shared';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { Field, Input } from '@/components/Field';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { postFile } from '@/lib/upload';

export default function PhotosPage() {
  const toast = useToast();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [audios, setAudios] = useState<AudioClip[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumName, setAlbumName] = useState('');
  const [roleId, setRoleId] = useState('');
  const [recording, setRecording] = useState(false);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  async function load() {
    const [p, a, al] = await Promise.all([api.get<Photo[]>('/photos'), api.get<AudioClip[]>('/audios'), api.get<Album[]>('/albums')]);
    setPhotos(p.data);
    setAudios(a.data);
    setAlbums(al.data);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function uploadPhoto(file: File) {
    try {
      await postFile('/photos', 'photo', file, { roleId: roleId || undefined });
      toast.push('Foto adicionada');
      load();
    } catch (err) {
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
      load();
    } catch (err) {
      toast.push(apiErrorMessage(err, 'Falha no envio do áudio'), 'error');
    }
  }

  async function createAlbum(event: FormEvent) {
    event.preventDefault();
    await api.post('/albums', { name: albumName, roleId: roleId || null });
    setAlbumName('');
    load();
  }

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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
    window.setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop();
      setRecording(false);
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
          <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
        </Field>
        <Field label="Enviar áudio">
          <Input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])} />
        </Field>
        <div className="flex items-end">
          <Button type="button" variant={recording ? 'danger' : 'secondary'} onClick={() => (recording ? (mediaRef.current?.stop(), setRecording(false)) : startRecording())}>
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

      <h2 className="mb-3 text-lg font-medium">Álbuns</h2>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {albums.map((album) => (
          <div key={album.id} className="card p-4">
            <p>{album.name}</p>
            <p className="text-xs text-slate-400">{album.photos?.length ?? 0} fotos</p>
            <button
              type="button"
              className="mt-2 text-xs text-rose-300"
              onClick={async () => {
                if (!confirm('Excluir álbum?')) return;
                await api.delete(`/albums/${album.id}`);
                load();
              }}
            >
              Excluir
            </button>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-lg font-medium">Galeria</h2>
      {photos.length === 0 ? <EmptyState title="Nenhuma foto ainda." /> : null}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((photo) => (
          <figure key={photo.id} className="relative">
            <img src={photo.url} alt={photo.caption || 'Foto'} className="h-28 w-full rounded-xl object-cover sm:h-40" />
            <button
              type="button"
              className="absolute top-2 right-2 rounded-full bg-black/60 px-2 text-xs"
              onClick={async () => {
                await api.delete(`/photos/${photo.id}`).catch((err) => toast.push(apiErrorMessage(err), 'error'));
                load();
              }}
            >
              ×
            </button>
          </figure>
        ))}
      </div>

      <h2 className="mt-8 mb-3 text-lg font-medium">Áudios</h2>
      <div className="space-y-3">
        {audios.map((audio) => (
          <div key={audio.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p>🎙️ {audio.name}</p>
              <button type="button" className="text-xs text-rose-300" onClick={() => api.delete(`/audios/${audio.id}`).then(load)}>
                Excluir
              </button>
            </div>
            <audio controls src={audio.url} className="mt-2 w-full" />
          </div>
        ))}
      </div>
    </RequireAuth>
  );
}
