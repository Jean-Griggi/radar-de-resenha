'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MusicKind, SpotifyAccount, SpotifyPlaylist, SpotifyTrack } from '@resenhometro/shared';
import { Button } from '@/components/Button';
import { MediaImage } from '@/components/MediaImage';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';

export type SpotifyChoice = { kind: MusicKind; id: string; title: string; subtitle: string; cover: string | null };

type Tab = 'track' | 'playlist';

/**
 * Escolha de faixa ou playlist da conta conectada. O navegador só devolve `kind` e `id`;
 * título, capa e link são buscados de novo no servidor, que confere se o item é da conta.
 * Sem conta conectada não há o que escolher (nada de título e artista digitados).
 */
export function SpotifyPicker({
  onPick,
  onClose,
  disabled = false,
}: {
  onPick: (choice: SpotifyChoice) => void;
  onClose: () => void;
  disabled?: boolean;
}) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>('track');
  const [tracks, setTracks] = useState<SpotifyTrack[]>([]);
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      try {
        const { data: status } = await api.get<SpotifyAccount>('/spotify/status', { signal, timeout: 8_000 });
        if (signal.aborted) return;
        setConnected(Boolean(status.connected));
        if (!status.connected) return;
        const [saved, lists] = await Promise.allSettled([
          api.get<SpotifyTrack[]>('/spotify/tracks', { signal, timeout: 8_000 }),
          api.get<SpotifyPlaylist[]>('/spotify/playlists', { signal, timeout: 8_000 }),
        ]);
        if (signal.aborted) return;
        if (saved.status === 'fulfilled') setTracks(saved.value.data);
        else if (!isApiCanceled(saved.reason)) setError(apiErrorMessage(saved.reason, 'Não foi possível ler suas músicas'));
        if (lists.status === 'fulfilled') setPlaylists(lists.value.data);
      } catch (err) {
        if (!isApiCanceled(err)) setError(apiErrorMessage(err, 'Não foi possível falar com o Spotify'));
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, []);

  return (
    <div className="card space-y-3 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-medium">Escolher do Spotify</h3>
        <Button type="button" variant="ghost" onClick={onClose}>
          Fechar
        </Button>
      </div>

      {loading ? <p className="text-sm text-muted">Carregando sua conta…</p> : null}

      {!loading && connected === false ? (
        <p className="text-sm text-muted">
          Conecte sua conta do Spotify para escolher música.{' '}
          <Link href="/music" className="font-semibold text-[var(--primary)] hover:underline">
            Conectar em Música
          </Link>
        </p>
      ) : null}

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      {!loading && connected ? (
        <>
          <div className="flex gap-2" role="tablist">
            {(['track', 'playlist'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={tab === value}
                className={`chip-tab ${tab === value ? 'is-active' : ''}`}
                onClick={() => setTab(value)}
              >
                {value === 'track' ? 'Faixas' : 'Playlists'}
              </button>
            ))}
          </div>

          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {tab === 'track'
              ? tracks.map((item) => (
                  <Row
                    key={item.id}
                    cover={item.cover}
                    title={item.title}
                    subtitle={item.artist}
                    disabled={disabled}
                    onPick={() => onPick({ kind: 'track', id: item.id, title: item.title, subtitle: item.artist, cover: item.cover })}
                  />
                ))
              : playlists.map((item) => (
                  <Row
                    key={item.id}
                    cover={item.image}
                    title={item.name}
                    subtitle={`Playlist · ${item.tracks} faixas`}
                    disabled={disabled}
                    onPick={() => onPick({ kind: 'playlist', id: item.id, title: item.name, subtitle: 'Playlist', cover: item.image })}
                  />
                ))}
          </ul>
          {tab === 'track' && tracks.length === 0 && !error ? (
            <p className="text-sm text-muted">Nenhuma música curtida na sua conta.</p>
          ) : null}
          {tab === 'playlist' && playlists.length === 0 ? <p className="text-sm text-muted">Nenhuma playlist na sua conta.</p> : null}
        </>
      ) : null}
    </div>
  );
}

function Row({
  cover,
  title,
  subtitle,
  disabled,
  onPick,
}: {
  cover: string | null;
  title: string;
  subtitle: string;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-[var(--overlay)] disabled:opacity-50"
      >
        <MediaImage src={cover} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{title}</span>
          <span className="block truncate text-xs text-muted">{subtitle}</span>
        </span>
      </button>
    </li>
  );
}
