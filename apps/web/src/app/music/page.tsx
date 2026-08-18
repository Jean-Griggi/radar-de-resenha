'use client';

import { useEffect, useState } from 'react';
import type { SpotifyAccount, SpotifyPlaylist } from '@resenhometro/shared';
import { Button } from '@/components/Button';
import { RequireAuth } from '@/components/RequireAuth';
import { usePlayer } from '@/components/Player';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';

export default function MusicPage() {
  const toast = useToast();
  const { setTrack } = usePlayer();
  const [status, setStatus] = useState<(SpotifyAccount & { configured?: boolean }) | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [tracks, setTracks] = useState<{ id: string; title: string; artist: string; cover?: string | null; spotifyUrl?: string | null }[]>([]);

  async function load() {
    const [{ data: account }, { data: music }] = await Promise.all([
      api.get<SpotifyAccount & { configured?: boolean }>('/spotify/status'),
      api.get('/music'),
    ]);
    setStatus(account);
    setTracks(music);
    if (account.nowPlaying) setTrack(account.nowPlaying);
    if (account.connected) {
      const lists = await api.get<SpotifyPlaylist[]>('/spotify/playlists');
      setPlaylists(lists.data);
    }
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function connect() {
    try {
      const { data } = await api.get<{ url: string }>('/spotify/connect');
      window.location.href = data.url;
    } catch (err) {
      toast.push(apiErrorMessage(err, 'Configure SPOTIFY_CLIENT_ID no servidor'), 'error');
    }
  }

  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Música</h1>
      <section className="card p-6">
        <h2 className="text-lg font-medium">Spotify</h2>
        {status?.connected ? (
          <div className="mt-3 space-y-3">
            <p>Conectado como {status.displayName}</p>
            {status.nowPlaying ? (
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl bg-white/5 p-3 text-left"
                onClick={() => setTrack(status.nowPlaying!)}
              >
                {status.nowPlaying.cover ? (
                  <img src={status.nowPlaying.cover} alt="" className="h-12 w-12 rounded-lg object-cover" />
                ) : null}
                <div>
                  <p>{status.nowPlaying.title}</p>
                  <p className="text-sm text-slate-400">{status.nowPlaying.artist}</p>
                </div>
              </button>
            ) : (
              <p className="text-sm text-slate-400">Nenhuma faixa tocando agora.</p>
            )}
            <Button variant="secondary" onClick={() => api.delete('/spotify').then(load)}>
              Desconectar
            </Button>
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-slate-400">Conecte sua conta para ver a música atual, playlists e abrir no Spotify.</p>
            <Button className="mt-3" onClick={connect}>
              Conectar Spotify
            </Button>
          </div>
        )}
      </section>

      {playlists.length > 0 ? (
        <section className="mt-5 card p-6">
          <h2 className="mb-3 font-medium">Playlists</h2>
          <ul className="space-y-2">
            {playlists.map((list) => (
              <li key={list.id}>
                <a href={list.url} target="_blank" rel="noreferrer" className="text-sm hover:text-violet-300">
                  {list.name} · {list.tracks} faixas
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-5 card p-6">
        <h2 className="mb-3 font-medium">Músicas associadas a rolês</h2>
        <ul className="space-y-2">
          {tracks.map((track) => (
            <li key={track.id}>
              <button type="button" onClick={() => setTrack(track)}>
                {track.title} — {track.artist}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}
