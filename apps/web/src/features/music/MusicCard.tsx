'use client';

import type { MusicItem } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { MediaImage } from '@/components/MediaImage';

/**
 * Card de faixa ou playlist: capa, nome e, na faixa, o artista. A playlist deixa o tipo explícito.
 * Mostra quem colocou. Não toca nada: só abre no Spotify (fora de escopo tocar no produto).
 */
export function MusicCard({
  item,
  tone = 'default',
  onSelect,
}: {
  item: MusicItem;
  /** `story` = texto claro, para ficar sobre a mídia escura do story. */
  tone?: 'default' | 'story';
  onSelect?: () => void;
}) {
  const onMedia = tone === 'story';
  const surface = onMedia ? 'bg-black/45 backdrop-blur-sm' : 'bg-[var(--overlay)]';
  const titleColor = onMedia ? 'text-white' : '';
  const mutedColor = onMedia ? 'text-white/70' : 'text-muted';

  return (
    <div className={`flex items-center gap-3 rounded-xl p-2.5 ${surface}`}>
      <MediaImage src={item.cover} alt={`Capa de ${item.title}`} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
      <button
        type="button"
        className="min-w-0 flex-1 text-left"
        onClick={onSelect}
        disabled={!onSelect}
        aria-label={onSelect ? `Mostrar ${item.title} no player` : undefined}
      >
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
      </button>
      {item.spotifyUrl ? (
        <a
          href={item.spotifyUrl}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-xs font-semibold text-[#1DB954] hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          Spotify
        </a>
      ) : null}
    </div>
  );
}
