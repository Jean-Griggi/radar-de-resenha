import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';

/** Contêiner das linhas de ficha (rótulo mono / valor / fio). */
export function Ficha({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`k-ficha ${className}`.trim()}>{children}</div>;
}

/**
 * Linha de ficha: `[marcador] [rótulo .k-meta] [valor] [chevron]`, fio embaixo.
 * Com `onClick` a linha inteira é um `<button>` (alvo ≥ 44 px). `mark` só na criação de rolê:
 * `done` acende o ponto na marca, `empty` mostra o círculo contornado.
 */
export function FichaRow({
  label,
  children,
  mono = false,
  empty = false,
  mark,
  onClick,
  href,
  disabled,
}: {
  label: string;
  children: ReactNode;
  /** Datas e horas no valor usam Plex Mono. */
  mono?: boolean;
  /** Valor ainda não preenchido ("Escolher amigos"): texto atenuado. */
  empty?: boolean;
  mark?: 'done' | 'empty';
  onClick?: () => void;
  /** Linha-link: navega com `next/link` (a linha inteira é o alvo). */
  href?: string;
  disabled?: boolean;
}) {
  const interactive = Boolean(onClick || href);
  const className = `k-ficha-row${mark ? ' k-ficha-row--mark' : ''}${interactive ? ' k-ficha-row--chevron' : ''}`;
  const content = (
    <>
      {mark ? <span className={`k-ficha-row__mark${mark === 'done' ? ' k-ficha-row__mark--done' : ''}`} aria-hidden /> : null}
      <span className="k-meta">{label}</span>
      <span className={`${mono ? 'k-ficha-row__value--mono' : ''} ${empty ? 'k-ficha-row__value--empty' : ''}`.trim()}>
        {children}
      </span>
      {interactive ? <ChevronRight size={16} aria-hidden /> : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }
  if (interactive) {
    return (
      <button type="button" className={className} onClick={onClick} disabled={disabled}>
        {content}
      </button>
    );
  }
  return <div className={className}>{content}</div>;
}
