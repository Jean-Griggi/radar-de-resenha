'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MusicKind, SpotifyAccount, SpotifyPlaylist, SpotifyTrack } from '@resenhometro/shared';
import { Button } from '@/components/Button';
import { Tabs } from '@/components/Tabs';
import { TrackRow } from '@/components/TrackRow';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { plural } from '@/lib/format';

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
          <Link href="/music" className="font-semibold text-[var(--k-brand)] hover:underline">
            Conectar em Música
          </Link>
        </p>
      ) : null}

      {error ? <p className="text-sm text-[var(--k-danger)]">{error}</p> : null}

      {!loading && connected ? (
        <>
          <Tabs
            label="Tipo de busca"
            items={[
              { value: 'track', label: 'Faixas' },
              { value: 'playlist', label: 'Playlists' },
            ]}
            value={tab}
            onChange={setTab}
          />

          <ol className="k-tracks max-h-72 overflow-y-auto">
            {tab === 'track'
              ? tracks.map((item, index) => (
                  <TrackRow
                    key={item.id}
                    index={index + 1}
                    cover={item.cover}
                    title={item.title}
                    artist={item.artist}
                    disabled={disabled}
                    spotifyUrl={item.url}
                    actionLabel={`Escolher ${item.title}`}
                    onSelect={() => onPick({ kind: 'track', id: item.id, title: item.title, subtitle: item.artist, cover: item.cover })}
                  />
                ))
              : playlists.map((item, index) => (
                  <TrackRow
                    key={item.id}
                    index={index + 1}
                    cover={item.image}
                    title={item.name}
                    artist={`Playlist · ${plural(item.tracks, 'faixa', 'faixas')}`}
                    disabled={disabled}
                    spotifyUrl={item.url}
                    actionLabel={`Escolher ${item.name}`}
                    onSelect={() => onPick({ kind: 'playlist', id: item.id, title: item.name, subtitle: 'Playlist', cover: item.image })}
                  />
                ))}
          </ol>
          {tab === 'track' && tracks.length === 0 && !error ? (
            <p className="text-sm text-muted">Nenhuma música curtida na sua conta.</p>
          ) : null}
          {tab === 'playlist' && playlists.length === 0 ? <p className="text-sm text-muted">Nenhuma playlist na sua conta.</p> : null}
        </>
      ) : null}
    </div>
  );
}

