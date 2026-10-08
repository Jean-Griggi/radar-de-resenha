'use client';

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, Music, X } from 'lucide-react';
import { parseSpotifyUrl, spotifyEmbedHeight, spotifyEmbedSrc } from '@/lib/spotifyEmbed';

export type PlayerTrack = {
  title: string;
  artist: string;
  cover?: string | null;
  spotifyUrl?: string | null;
};

const PlayerContext = createContext<{
  track: PlayerTrack | null;
  setTrack: (track: PlayerTrack | null) => void;
} | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [track, setTrack] = useState<PlayerTrack | null>(null);
  const value = useMemo(() => ({ track, setTrack }), [track]);
  return (
    <PlayerContext.Provider value={value}>
      {children}
      {/* No layout raiz: não desmonta ao trocar de página, então o iframe não reinicia. */}
      <MiniPlayer />
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) return { track: null, setTrack: () => undefined };
  return ctx;
}

type LyricsState = { status: 'idle' | 'loading' | 'found' | 'missing'; text: string };

/** Tira "(feat. ...)", "- Remastered" etc. e fica só com o primeiro artista: o serviço de letras acha melhor assim. */
function lyricsQuery(track: PlayerTrack) {
  const title = track.title.replace(/s*[([].*?[)]]/g, '').replace(/s+-s+.*$/, '').trim();
  const artist = track.artist.split(/,|&| feat.?/i)[0]!.trim();
  return { title, artist };
}

/**
 * Player no canto: um ícone de música que expande e mostra capa, nome, cantor, link para o Spotify e a letra.
 * O player do Spotify fica sempre montado (fora da tela quando recolhido) para a música não parar.
 * Letras vêm do LRCLIB (grátis, sem chave, nem toda música tem). A faixa só toca inteira para quem está
 * logado no Spotify neste navegador; sem login o Spotify toca prévias de 30 s.
 */
export function MiniPlayer() {
  const { track, setTrack } = usePlayer();
  const [open, setOpen] = useState(false);
  const [lyrics, setLyrics] = useState<LyricsState>({ status: 'idle', text: '' });
  const [showLyrics, setShowLyrics] = useState(false);

  // Faixa nova: abre o painel (a pessoa precisa apertar play dentro do player do Spotify) e zera a letra.
  useEffect(() => {
    setOpen(Boolean(track));
    setShowLyrics(false);
    setLyrics({ status: 'idle', text: '' });
  }, [track?.spotifyUrl, track?.title]);

  const ref = track ? parseSpotifyUrl(track.spotifyUrl) : null;
  const isPlaylist = ref?.kind === 'playlist';

  useEffect(() => {
    if (!track || !showLyrics || isPlaylist || lyrics.status !== 'idle') return;
    const controller = new AbortController();
    const { title, artist } = lyricsQuery(track);
    setLyrics({ status: 'loading', text: '' });
    const params = new URLSearchParams({ track_name: title, artist_name: artist });
    fetch(`https://lrclib.net/api/search?${params.toString()}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: Array<{ plainLyrics?: string | null; instrumental?: boolean }> | null) => {
        const text = data?.find((item) => item.plainLyrics?.trim())?.plainLyrics?.trim() ?? '';
        setLyrics(text ? { status: 'found', text } : { status: 'missing', text: '' });
      })
      .catch(() => {
        if (!controller.signal.aborted) setLyrics({ status: 'missing', text: '' });
      });
    return () => controller.abort();
  }, [track, showLyrics, isPlaylist, lyrics.status]);

  if (!track) return null;

  return (
    <div className="pointer-events-none fixed right-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-end gap-2 lg:right-5 lg:bottom-5">
      <div
        className={
          open
            ? 'pointer-events-auto w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-lg)]'
            : 'pointer-events-none fixed top-0 -left-[9999px] w-[22rem]'
        }
        aria-hidden={!open}
      >
        <div className="flex items-center gap-3 p-3">
          {track.cover ? (
            <img src={track.cover} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
              <Music size={22} aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{track.title}</p>
            <p className="truncate text-sm text-muted">{track.artist}</p>
            {track.spotifyUrl ? (
              <a href={track.spotifyUrl} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent)] hover:underline">
                Abrir no Spotify
              </a>
            ) : null}
          </div>
          <button
            type="button"
            className="icon-btn"
            aria-label="Recolher player"
            onClick={() => setOpen(false)}
          >
            <ChevronDown size={20} aria-hidden />
          </button>
          <button type="button" className="icon-btn" aria-label="Fechar player" onClick={() => setTrack(null)}>
            <X size={20} aria-hidden />
          </button>
        </div>

        {ref ? (
          <iframe
            key={`${ref.kind}:${ref.id}`}
            title={`Tocando: ${track.title}`}
            src={spotifyEmbedSrc(ref)}
            height={spotifyEmbedHeight(ref.kind)}
            className="block w-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="eager"
          />
        ) : null}

        {!isPlaylist ? (
          <div className="border-t border-[var(--border)]">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-[var(--overlay)]"
              aria-expanded={showLyrics}
              onClick={() => setShowLyrics((value) => !value)}
            >
              Letra
              <ChevronDown size={16} className={showLyrics ? 'rotate-180' : ''} aria-hidden />
            </button>
            {showLyrics ? (
              <div className="max-h-64 overflow-y-auto px-3 pb-3 text-sm whitespace-pre-line">
                {lyrics.status === 'loading' ? <p className="text-muted">Procurando a letra…</p> : null}
                {lyrics.status === 'missing' ? <p className="text-muted">Não encontrei a letra desta música.</p> : null}
                {lyrics.status === 'found' ? lyrics.text : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#1DB954] text-black shadow-[var(--shadow-lg)] hover:brightness-110"
        aria-label={open ? 'Recolher player de música' : `Abrir player de música: ${track.title}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Music size={22} aria-hidden />
      </button>
    </div>
  );
}
