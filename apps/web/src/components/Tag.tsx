import type { ReactNode } from 'react';

export type TagTone = 'brand' | 'text' | 'success' | 'warning' | 'danger';

/** Ponto de 8 px na cor semântica + texto mono. Sem fundo e sem pílula: o estado está no texto, não só na cor. */
export function Tag({ tone = 'text', children, className = '' }: { tone?: TagTone; children: ReactNode; className?: string }) {
  return <span className={`k-tag k-tag--${tone} k-meta ${className}`.trim()}>{children}</span>;
}
