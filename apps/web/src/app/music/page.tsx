'use client';

import { useEffect, useState } from 'react';
import type { SpotifyAccount, SpotifyPlaylist } from '@resenhometro/shared';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { usePlayer } from '@/components/Player';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { setCachedSpotifyStatus, setSpotifyConnectedFlag } from '@/lib/shellCache';

type MusicTrack = { id: string; title: string; artist: string; cover?: string | null; spotifyUrl?: string | null };

export default function MusicPage() {
  const toast = useToast();
  const { setTrack } = usePlayer();
  const [status, setStatus] = useState<(SpotifyAccount & { configured?: boolean }) | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  async function load(signal?: AbortSignal) {
    const config = signal ? { signal } : undefined;
    const [{ data: account }, { data: music }] = await Promise.all([
      api.get<SpotifyAccount & { configured?: boolean }>('/spotify/status', config),
      api.get<MusicTrack[]>('/music', config),
    ]);
    setStatus(account);
    setTracks(music);
    setSpotifyConnectedFlag(Boolean(account.connected));
    setCachedSpotifyStatus(account);
    if (account.nowPlaying) setTrack(account.nowPlaying);
    if (account.connected) {
      const lists = await api.get<SpotifyPlaylist[]>('/spotify/playlists', config);
      setPlaylists(lists.data);
    } else {
      setPlaylists([]);
    }
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
        setError(apiErrorMessage(err, 'Não foi possível carregar a música'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function connect() {
    try {
      const { data } = await api.get<{ url: string }>('/spotify/connect');
      window.location.href = data.url;
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Configure SPOTIFY_CLIENT_ID no servidor'), 'error');
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      await api.delete('/spotify');
      setSpotifyConnectedFlag(false);
      await load();
      setError('');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Não foi possível desconectar o Spotify'), 'error');
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Música</h1>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      ) : null}
      {error ? <p className="mb-5 text-rose-300">{error}</p> : null}
      {!loading && !error ? (
        <>
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
                <Button variant="secondary" disabled={disconnecting} onClick={disconnect}>
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
            {tracks.length === 0 ? <p className="text-sm text-slate-400">Nenhuma música associada ainda.</p> : null}
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
        </>
      ) : null}
    </RequireAuth>
  );
}
