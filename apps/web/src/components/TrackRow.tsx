import type { ReactNode } from 'react';
import { Music } from 'lucide-react';

/** Lista de faixas: começa com fio superior de 1 px na cor do texto (linha de encarte). */
export function TrackList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <ol className={`k-tracks ${className}`.trim()}>{children}</ol>;
}

/**
 * Linha de encarte: `[nº mono] [capa 40 px] [título + artista] [duração mono]`.
 * A capa é quadrada, sem raio e sem filtro. Faixa tocando/selecionada: título em 600 na cor da marca.
 * `compact` (dentro de Post/Perfil): sem número, com o rótulo "Trilha do rolê" à direita.
 * A atribuição ao Spotify segue as diretrizes e fica a cargo de quem usa (Fase 4.3).
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
}: {
  index?: number;
  cover?: string | null;
  title: string;
  artist: string;
  duration?: string;
  current?: boolean;
  compact?: boolean;
  label?: string;
}) {
  const cls = `k-track${current ? ' k-track--current' : ''}${compact ? ' k-track--compact' : ''}`;
  return (
    <li className={cls} aria-current={current ? 'true' : undefined}>
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
      {compact ? <span className="k-meta">{label}</span> : duration ? <span className="k-track__d">{duration}</span> : <span />}
    </li>
  );
}
