import type { ReactNode } from 'react';
import { Music, Play } from 'lucide-react';

/** Lista de faixas: começa com fio superior de 1 px na cor do texto (linha de encarte). */
export function TrackList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <ol className={`k-tracks ${className}`.trim()}>{children}</ol>;
}

/**
 * Linha de encarte: `[nº mono] [capa 40 px] [título + artista] [duração mono]`.
 * A capa é quadrada, sem raio e sem filtro. Faixa tocando/selecionada: título em 600 na cor da marca.
 * `compact` (dentro de Post/Perfil): sem número, com o rótulo "Trilha do rolê" à direita.
 * `spotifyUrl` é o link de atribuição (a capa não leva para fora; o toque continua o de quem chama).
 */
export function TrackRow({
  index,
  cover,
  title,
  artist,
  duration,
  current = false,
  compact = false,
  label = 'Trilha do rolê',
  onSelect,
  actionLabel,
  disabled = false,
  showPlay = false,
  spotifyUrl,
}: {
  index?: number;
  cover?: string | null;
  title: string;
  artist: string;
  duration?: string;
  current?: boolean;
  compact?: boolean;
  label?: string;
  /** Quando existe, a linha vira o botão de tocar (o player continua o de quem chama). */
  onSelect?: () => void;
  actionLabel?: string;
  disabled?: boolean;
  /** Marca verde do Spotify à direita, no lugar da duração. */
  showPlay?: boolean;
  spotifyUrl?: string | null;
}) {
  const cls = `k-track${current ? ' k-track--current' : ''}${compact ? ' k-track--compact' : ''}`;
  const cells = (
    <>
      {compact ? null : <span className="k-track__n">{index != null ? String(index).padStart(2, '0') : ''}</span>}
      {cover ? (
        <img className="k-track__cover" src={cover} alt="" width={40} height={40} loading="lazy" />
      ) : (
        <span className="k-track__cover" aria-hidden>
          <Music size={18} />
        </span>
      )}
      <span className="min-w-0">
        <span className="k-track__title block truncate">{title}</span>
        <span className="k-track__artist block truncate">{artist}</span>
      </span>
      {compact ? (
        <span className="k-meta">{label}</span>
      ) : showPlay ? (
        <span className="k-spotify-play" aria-hidden>
          {current ? <Music size={16} /> : <Play size={16} />}
        </span>
      ) : duration ? (
        <span className="k-track__d">{duration}</span>
      ) : (
        <span />
      )}
    </>
  );
  const body = onSelect ? (
    <button type="button" className="k-track__play" onClick={onSelect} disabled={disabled} aria-label={actionLabel ?? `Tocar ${title}`}>
      {cells}
    </button>
  ) : (
    cells
  );
  return (
    <li className={cls} aria-current={current ? 'true' : undefined}>
      {body}
      {spotifyUrl ? (
        <a className="k-spotify-credit" href={spotifyUrl} target="_blank" rel="noreferrer">
          Spotify
        </a>
      ) : null}
    </li>
  );
}
