import type { ReactNode } from 'react';

/**
 * Espaço + fio de 1 px (sem sombra, sem raio). `corners` é para memórias (publicação, rolê passado):
 * acrescenta as cantoneiras, que precisam de ≥ 8 px de espaço ao redor.
 */
export function Card({ children, className = '', corners = false }: { children: ReactNode; className?: string; corners?: boolean }) {
  return <div className={`card${corners ? ' k-corners' : ''} p-5 ${className}`}>{children}</div>;
}

/** Estado vazio: uma frase em Fraunces e, se houver, uma ação. Ex.: "Ninguém marcou nada ainda." */
export function EmptyState({
  title,
  description,
  action,
  line = false,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Variante sem fundo, alinhada à esquerda e com fio de 1 px acima (listas de uma página de seções). */
  line?: boolean;
}) {
  return (
    <div className={line ? 'k-empty k-empty--line' : 'k-empty'}>
      <h3 className="k-empty__title">{title}</h3>
      {description ? <p className="k-empty__text">{description}</p> : null}
      {action ? <div className="k-empty__action">{action}</div> : null}
    </div>
  );
}

/**
 * Esqueleto: fios (`line`) e pontos (`dot`) imitando o layout real; `block` (padrão) é só o contorno de 1 px.
 * Pulso de opacidade, estático com movimento reduzido. Sem gradiente.
 */
export function Skeleton({ className = '', variant = 'block' }: { className?: string; variant?: 'block' | 'line' | 'dot' }) {
  return <div className={`skeleton${variant === 'block' ? '' : ` skeleton--${variant}`} ${className}`.trim()} aria-hidden />;
}
