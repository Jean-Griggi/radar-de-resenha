'use client';

import { useEffect, useState } from 'react';
import type { RoleMusic, SpotifyAccount, SpotifyPlaylist, SpotifyTrack } from '@resenhometro/shared';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Card';
import { MediaImage } from '@/components/MediaImage';
import { usePlayer, type PlayerTrack } from '@/components/Player';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { setCachedSpotifyStatus, setSpotifyConnectedFlag } from '@/lib/shellCache';
import { MusicCard } from './MusicCard';

type Status = SpotifyAccount & { configured?: boolean };

export function MusicScreen() {
  const toast = useToast();
  const { track: playing, setTrack } = usePlayer();
  const [status, setStatus] = useState<Status | null>(null);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [saved, setSaved] = useState<SpotifyTrack[]>([]);
  const [savedError, setSavedError] = useState('');
  const [tracks, setTracks] = useState<RoleMusic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [disconnecting, setDisconnecting] = useState(false);

  async function load(signal?: AbortSignal) {
    const config = signal ? { signal } : undefined;
    const [accountResult, musicResult] = await Promise.allSettled([
      api.get<Status>('/spotify/status', { ...config, timeout: 8_000 }),
      api.get<RoleMusic[]>('/music', config),
    ]);

    if (accountResult.status === 'fulfilled') {
      const account = accountResult.value.data;
      setStatus(account);
      setSpotifyConnectedFlag(Boolean(account.connected));
      setCachedSpotifyStatus(account);
      if (account.nowPlaying) setTrack(account.nowPlaying);
      if (account.connected) {
        const [lists, library] = await Promise.allSettled([
          api.get<SpotifyPlaylist[]>('/spotify/playlists', { ...config, timeout: 8_000 }),
          api.get<SpotifyTrack[]>('/spotify/tracks', { ...config, timeout: 8_000 }),
        ]);
        setPlaylists(lists.status === 'fulfilled' ? lists.value.data : []);
        if (library.status === 'fulfilled') {
          setSaved(library.value.data);
          setSavedError('');
        } else if (!isApiCanceled(library.reason)) {
          setSaved([]);
          setSavedError(apiErrorMessage(library.reason, 'Não foi possível ler suas músicas curtidas'));
        }
      } else {
        setPlaylists([]);
        setSaved([]);
        setSavedError('');
      }
    }

    if (musicResult.status === 'fulfilled') {
      setTracks(musicResult.value.data);
    }

    const accountFailed = accountResult.status === 'rejected' && !isApiCanceled(accountResult.reason);
    const musicFailed = musicResult.status === 'rejected' && !isApiCanceled(musicResult.reason);
    if (accountFailed && musicFailed) {
      throw accountResult.status === 'rejected' ? accountResult.reason : musicResult.reason;
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
    <>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Música</h1>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40" />
          <Skeleton className="h-32" />
        </div>
      ) : null}
      {error ? <p className="mb-5 text-[var(--danger)]">{error}</p> : null}
      {!loading && !error ? (
        <>
          <section className="card p-6">
            <h2 className="text-lg font-medium">Spotify</h2>
            {status?.connected ? (
              <div className="mt-3 space-y-3">
                <p>Conectado como {status.displayName}</p>
                {status.nowPlaying ? (
                  <Tile
                    cover={status.nowPlaying.cover}
                    title={status.nowPlaying.title}
                    subtitle={`${status.nowPlaying.artist} · tocando agora no Spotify`}
                    active={isPlaying(playing, status.nowPlaying.spotifyUrl)}
                    onPlay={() => setTrack(status.nowPlaying!)}
                  />
                ) : (
                  <p className="text-sm text-muted">Nenhuma faixa tocando agora.</p>
                )}
                <Button variant="secondary" disabled={disconnecting} onClick={disconnect}>
                  Desconectar
                </Button>
              </div>
            ) : (
              <div className="mt-3">
                {status?.configured === false ? (
                  <p className="text-sm text-muted">
                    Spotify não está configurado no servidor. Defina SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET e
                    SPOTIFY_REDIRECT_URI apontando para a URL pública da API.
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-muted">
                      Conecte sua conta para ouvir suas músicas e playlists aqui e colocá-las nos seus rolês e stories.
                    </p>
                    <Button className="mt-3" onClick={connect}>
                      Conectar Spotify
                    </Button>
                  </>
                )}
              </div>
            )}
          </section>

          {status?.connected ? (
            <>
              <section className="mt-5 card p-6">
                <h2 className="mb-1 font-medium">Suas músicas</h2>
                <p className="mb-3 text-sm text-muted">Escolha uma para tocar aqui, sem sair do Resenhômetro.</p>
                {savedError ? (
                  <div className="space-y-2">
                    <p className="text-sm text-[var(--danger)]">{savedError}</p>
                    <Button variant="secondary" onClick={connect}>
                      Reconectar Spotify
                    </Button>
                  </div>
                ) : null}
                {!savedError && saved.length === 0 ? (
                  <p className="text-sm text-muted">Nenhuma música curtida na sua conta.</p>
                ) : null}
                <ul className="grid gap-2 sm:grid-cols-2">
                  {saved.map((item) => (
                    <li key={item.id}>
                      <Tile
                        cover={item.cover}
                        title={item.title}
                        subtitle={item.artist}
                        active={isPlaying(playing, item.url)}
                        onPlay={() => setTrack({ title: item.title, artist: item.artist, cover: item.cover, spotifyUrl: item.url })}
                      />
                    </li>
                  ))}
                </ul>
              </section>

              <section className="mt-5 card p-6">
                <h2 className="mb-3 font-medium">Playlists</h2>
                {playlists.length === 0 ? <p className="text-sm text-muted">Nenhuma playlist na sua conta.</p> : null}
                <ul className="grid gap-2 sm:grid-cols-2">
                  {playlists.map((list) => (
                    <li key={list.id}>
                      <Tile
                        cover={list.image}
                        title={list.name}
                        subtitle={`Playlist · ${list.tracks} faixas`}
                        active={isPlaying(playing, list.url)}
                        onPlay={() => setTrack({ title: list.name, artist: 'Playlist', cover: list.image, spotifyUrl: list.url })}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            </>
          ) : null}

          <section className="mt-5 card p-6">
            <h2 className="mb-3 font-medium">Músicas associadas a rolês</h2>
            {tracks.length === 0 ? <p className="text-sm text-muted">Nenhuma música associada ainda.</p> : null}
            <ul className="space-y-2">
              {tracks.map((track) => (
                <li key={track.id}>
                  <MusicCard
                    item={track}
                    onSelect={() =>
                      setTrack({ title: track.title, artist: track.artist ?? 'Playlist', cover: track.cover, spotifyUrl: track.spotifyUrl })
                    }
                  />
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </>
  );
}

function isPlaying(current: PlayerTrack | null, url: string | null | undefined) {
  return Boolean(current?.spotifyUrl && url && current.spotifyUrl === url);
}

/** Linha clicável com capa: escolher = tocar no player do rodapé. */
function Tile({
  cover,
  title,
  subtitle,
  active,
  onPlay,
}: {
  cover: string | null | undefined;
  title: string;
  subtitle: string;
  active: boolean;
  onPlay: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPlay}
      aria-label={`Tocar ${title}`}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[var(--overlay)] ${
        active ? 'bg-[var(--overlay)] ring-2 ring-[#1DB954]' : ''
      }`}
    >
      <MediaImage src={cover} alt={`Capa de ${title}`} className="h-14 w-14 shrink-0 rounded-lg object-cover" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted">{subtitle}</span>
      </span>
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1DB954] text-black"
      >
        {active ? '♪' : '▶'}
      </span>
    </button>
  );
}
