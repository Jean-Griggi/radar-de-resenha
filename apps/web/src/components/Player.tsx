'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

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

export function MiniPlayer() {
  const { track } = usePlayer();
  if (!track) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[var(--header)] px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4">
        {track.cover ? (
          <img src={track.cover} alt="" className="h-10 w-10 rounded-lg object-cover" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/30">♪</div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-fg">{track.title}</p>
          <p className="truncate text-xs text-muted">{track.artist}</p>
        </div>
        {track.spotifyUrl ? (
          <a
            href={track.spotifyUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-full bg-[#1DB954] px-3 py-1.5 text-xs font-semibold text-black"
          >
            Abrir Spotify
          </a>
        ) : null}
      </div>
    </div>
  );
}
