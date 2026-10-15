'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { ChevronDown, Music, X } from 'lucide-react';
import { Corners } from '@/components/Corners';
import { Spinner } from '@/components/Spinner';
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
  const title = track.title
    .replace(/\s*[([].*?[)\]]/g, '')
    .replace(/\s+-\s+.*$/, '')
    .trim();
  const artist = track.artist.split(/,|&|\sfeat\.?\s/i)[0]!.trim();
  return { title, artist };
}

type LrclibItem = { plainLyrics?: string | null };

/** Letra no LRCLIB: primeiro por título + artista; se não achar, por busca livre (`q`). */
async function findLyrics(track: PlayerTrack, signal: AbortSignal): Promise<string> {
  const { title, artist } = lyricsQuery(track);
  const attempts = [
    new URLSearchParams({ track_name: title, artist_name: artist }),
    new URLSearchParams({ q: `${artist} ${title}` }),
    new URLSearchParams({ q: title }),
  ];
  for (const params of attempts) {
    const response = await fetch(`https://lrclib.net/api/search?${params.toString()}`, { signal });
    if (!response.ok) continue;
    const data = (await response.json()) as LrclibItem[];
    const text = data.find((item) => item.plainLyrics?.trim())?.plainLyrics?.trim();
    if (text) return text;
  }
  return '';
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
  const [frameReady, setFrameReady] = useState(false);

  // Faixa nova: abre o painel (a pessoa precisa apertar play dentro do player do Spotify) e zera a letra.
  useEffect(() => {
    setOpen(Boolean(track));
    setShowLyrics(false);
    setFrameReady(false);
    setLyrics({ status: 'idle', text: '' });
    fetchedFor.current = '';
  }, [track?.spotifyUrl, track?.title]);

  const ref = track ? parseSpotifyUrl(track.spotifyUrl) : null;
  const isPlaylist = ref?.kind === 'playlist';

  // Busca a letra quando o painel de letra abre. `fetchedFor` evita buscar de novo a mesma faixa; se a busca
  // for cancelada no meio (fechou a letra, trocou de faixa), libera para tentar de novo.
  const fetchedFor = useRef('');
  useEffect(() => {
    if (!track || !showLyrics || isPlaylist) return;
    const key = `${track.title}|${track.artist}`;
    if (fetchedFor.current === key) return;
    fetchedFor.current = key;
    const controller = new AbortController();
    setLyrics({ status: 'loading', text: '' });
    findLyrics(track, controller.signal)
      .then((text) => setLyrics(text ? { status: 'found', text } : { status: 'missing', text: '' }))
      .catch(() => {
        if (controller.signal.aborted) return;
        setLyrics({ status: 'missing', text: '' });
      });
    return () => {
      if (controller.signal.aborted) return;
      controller.abort();
      fetchedFor.current = '';
    };
  }, [track, showLyrics, isPlaylist]);

  if (!track) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-end gap-2 px-3 lg:inset-x-auto lg:right-5 lg:bottom-5 lg:px-0">
      <div
        className={
          open
            ? 'pointer-events-auto w-full overflow-hidden border border-[var(--k-line)] bg-[var(--k-surface-raised)] lg:w-[24rem]'
            : 'pointer-events-none fixed top-0 -left-[9999px] w-[22rem]'
        }
        aria-hidden={!open}
      >
        <div className="k-ficha-faixa">
          <Corners
            className="k-ficha-faixa__cover"
            style={{ '--k-corner-offset': '0px' } as CSSProperties}
          >
            {track.cover ? (
              <img src={track.cover} alt="" className="k-cover" width={112} height={112} />
            ) : (
              <span className="k-ficha-faixa__nocover" aria-hidden>
                <Music size={28} />
              </span>
            )}
          </Corners>
          <div className="k-ficha-faixa__text">
            <p className="k-ficha-faixa__title k-display">{track.title}</p>
            <p className="k-ficha-faixa__artist">{track.artist}</p>
            {track.spotifyUrl ? (
              <a
                href={track.spotifyUrl}
                target="_blank"
                rel="noreferrer"
                className="k-ficha-faixa__link"
              >
                <span className="k-ficha-faixa__dot" aria-hidden />
                Ouvir no Spotify
              </a>
            ) : null}
          </div>
          <div className="k-ficha-faixa__actions">
            <button
              type="button"
              className="icon-btn"
              aria-label="Recolher player"
              onClick={() => setOpen(false)}
            >
              <ChevronDown size={20} aria-hidden />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Fechar player"
              onClick={() => setTrack(null)}
            >
              <X size={20} aria-hidden />
            </button>
          </div>
        </div>

        {ref ? (
          <div className="k-ficha-faixa__frame" style={{ minHeight: spotifyEmbedHeight(ref.kind) }}>
            {frameReady ? null : (
              <span className="k-ficha-faixa__loading">
                <Spinner />
              </span>
            )}
            <iframe
              key={`${ref.kind}:${ref.id}`}
              title={`Tocando: ${track.title}`}
              src={spotifyEmbedSrc(ref)}
              height={spotifyEmbedHeight(ref.kind)}
              className="block w-full border-0"
              style={{ colorScheme: 'normal' }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="eager"
              onLoad={() => setFrameReady(true)}
            />
          </div>
        ) : null}

        {!isPlaylist ? (
          <div className="border-t border-[var(--k-line)]">
            <button
              type="button"
              className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium hover:bg-[color-mix(in_srgb,var(--k-text)_5%,transparent)]"
              aria-expanded={showLyrics}
              onClick={() => setShowLyrics((value) => !value)}
            >
              Letra
              <ChevronDown size={16} className={showLyrics ? 'rotate-180' : ''} aria-hidden />
            </button>
            {showLyrics ? (
              <div className="max-h-64 overflow-y-auto px-3 pb-3 text-sm whitespace-pre-line">
                {lyrics.status === 'loading' ? (
                  <p className="text-muted">Procurando a letra…</p>
                ) : null}
                {lyrics.status === 'missing' ? (
                  <p className="text-muted">Não encontrei a letra desta música.</p>
                ) : null}
                {lyrics.status === 'found' ? lyrics.text : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <button
        type="button"
        className="k-spotify-play pointer-events-auto h-12 w-12"
        aria-label={open ? 'Recolher player de música' : `Abrir player de música: ${track.title}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Music size={22} aria-hidden />
      </button>
    </div>
  );
}
