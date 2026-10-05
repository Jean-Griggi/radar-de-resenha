'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
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
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) return { track: null, setTrack: () => undefined };
  return ctx;
}

/**
 * Player fixo no rodapé. Toca dentro da página com o player incorporado do Spotify (sem redirecionar).
 * A faixa só é tocada por quem está logado no Spotify neste navegador; sem login o Spotify toca prévias de 30 s.
 */
export function MiniPlayer() {
  const { track, setTrack } = usePlayer();
  if (!track) return null;

  const ref = parseSpotifyUrl(track.spotifyUrl);

  return (
    <div className="shell-chrome fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 border-t border-line px-3 py-2 lg:bottom-0 lg:pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:px-4">
      <div className="mx-auto flex max-w-6xl items-center gap-3 sm:gap-4">
        {ref ? (
          <iframe
            key={`${ref.kind}:${ref.id}`}
            title={`Tocando: ${track.title}`}
            src={spotifyEmbedSrc(ref)}
            height={spotifyEmbedHeight(ref.kind)}
            className="min-w-0 flex-1 rounded-xl border-0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
          />
        ) : (
          <>
            {track.cover ? (
              <img src={track.cover} alt="" className="h-10 w-10 rounded-lg object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-soft)]">♪</div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">{track.title}</p>
              <p className="truncate text-xs text-muted">{track.artist}</p>
            </div>
          </>
        )}
        <button
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-fg"
          aria-label="Fechar player"
          onClick={() => setTrack(null)}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
