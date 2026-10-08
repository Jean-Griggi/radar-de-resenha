'use client';

import { useEffect, useRef, useState } from 'react';
import type { MusicItem } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { MediaImage } from '@/components/MediaImage';
import { parseSpotifyUrl, spotifyEmbedHeight, spotifyEmbedSrc } from '@/lib/spotifyEmbed';
import { mountAutoplayEmbed } from '@/lib/spotifyIframeApi';

/**
 * Card de faixa ou playlist: capa, nome e, na faixa, o artista. A playlist deixa o tipo explícito.
 * Mostra quem colocou. Toca dentro do sistema (player incorporado do Spotify), sem redirecionar.
 *
 * - `onSelect`: entrega a faixa ao player global do rodapé (rolê e tela de Música).
 * - `inline`: abre o player dentro do próprio card (story, que fica por cima do player global).
 */
export function MusicCard({
  item,
  tone = 'default',
  onSelect,
  inline = false,
  onOpenChange,
}: {
  item: MusicItem;
  /** `story` = texto claro, para ficar sobre a mídia escura do story. */
  tone?: 'default' | 'story';
  onSelect?: () => void;
  inline?: boolean;
  /** Avisa quando o player inline abre ou fecha (o story pausa enquanto toca). */
  onOpenChange?: (open: boolean) => void;
}) {
  const ref = parseSpotifyUrl(item.spotifyUrl);
  // No story a música abre sozinha e já toca; nas demais telas só quando a pessoa pede.
  const autoplay = inline && tone === 'story' && Boolean(ref);
  const [open, setOpen] = useState(autoplay);
  const hostRef = useRef<HTMLDivElement>(null);
  const [embedFailed, setEmbedFailed] = useState(false);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (autoplay) onOpenChangeRef.current?.(true);
  }, [autoplay]);

  useEffect(() => {
    const host = hostRef.current;
    if (!autoplay || !open || !ref || !host) return;
    let cancelled = false;
    let destroy: (() => void) | null = null;
    mountAutoplayEmbed(host, ref, spotifyEmbedHeight(ref.kind))
      .then((fn) => {
        if (cancelled) fn();
        else destroy = fn;
      })
      .catch(() => {
        if (!cancelled) setEmbedFailed(true);
      });
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [autoplay, open, ref?.kind, ref?.id]);
  const canPlay = Boolean(onSelect) || (inline && Boolean(ref));
  const onMedia = tone === 'story';
  const surface = onMedia ? 'bg-black/45 backdrop-blur-sm' : 'bg-[var(--overlay)]';
  const titleColor = onMedia ? 'text-white' : '';
  const mutedColor = onMedia ? 'text-white/70' : 'text-muted';

  function play() {
    if (inline) {
      const next = !open;
      setOpen(next);
      onOpenChange?.(next);
    } else onSelect?.();
  }

  return (
    <div className={`rounded-xl p-2.5 ${surface}`}>
      <div className="flex items-center gap-3">
        <MediaImage src={item.cover} alt={`Capa de ${item.title}`} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${titleColor}`}>{item.title}</p>
          <p className={`truncate text-xs ${mutedColor}`}>
            {item.kind === 'playlist' ? (
              <span className="rounded-full border border-current px-1.5 py-px text-[11px] uppercase tracking-wide">Playlist</span>
            ) : (
              item.artist
            )}
          </p>
          <p className={`mt-1 flex items-center gap-1.5 text-xs ${mutedColor}`}>
            <Avatar src={item.addedBy.avatar} name={item.addedBy.name} size="sm" />
            <span className="truncate">Colocada por {item.addedBy.name}</span>
          </p>
        </div>
        {canPlay ? (
          <button
            type="button"
            onClick={play}
            aria-label={open ? `Fechar ${item.title}` : `Tocar ${item.title}`}
            aria-pressed={inline ? open : undefined}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1DB954] text-lg text-black"
          >
            {open ? '✕' : '▶'}
          </button>
        ) : null}
      </div>
      {autoplay && open && !embedFailed ? <div ref={hostRef} className="mt-2 w-full overflow-hidden rounded-xl" /> : null}
      {inline && open && ref && (!autoplay || embedFailed) ? (
        <iframe
          title={`Tocando: ${item.title}`}
          src={spotifyEmbedSrc(ref)}
          height={spotifyEmbedHeight(ref.kind)}
          className="mt-2 w-full rounded-xl border-0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      ) : null}
    </div>
  );
}
