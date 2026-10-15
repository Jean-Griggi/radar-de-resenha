import type { CSSProperties, ElementType, HTMLAttributes } from 'react';

type CornersProps = HTMLAttributes<HTMLElement> & {
  /** Elemento renderizado (`div`, `a`, `article`, `li`…). */
  as?: ElementType;
  /** Tamanho do canto (padrão 12 px; 16–22 px em blocos grandes). */
  size?: number;
  /** Cantos que "fecham" no hover/foco, para memórias clicáveis. */
  interactive?: boolean;
  /** Repassados quando `as="a"`. */
  href?: string;
  target?: string;
  rel?: string;
};

/**
 * Cantoneiras: memória tem moldura, presente não tem. Só aplica `.k-corners` (tokens.css);
 * o elemento precisa de ≥ 8 px de espaço ao redor. Nunca sobre capas de álbum do Spotify.
 */
export function Corners({ as, size, interactive, className = '', style, ...props }: CornersProps) {
  const Component: ElementType = as ?? 'div';
  const cornerStyle = size ? ({ '--k-corner-size': `${size}px`, ...style } as CSSProperties) : style;
  return (
    <Component
      {...props}
      className={`k-corners ${className}`.trim()}
      data-interactive={interactive ? '' : undefined}
      style={cornerStyle}
    />
  );
}
