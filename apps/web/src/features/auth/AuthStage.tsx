import type { ReactNode, RefObject } from 'react';
import { BrandWordmark } from '@/components/BrandWordmark';
import { ThemeToggle } from '@/components/Theme';
import { AuthGrid } from './AuthGrid';
import { AuthQuina } from './AuthQuina';
import { GlassFilter } from './GlassFilter';

/**
 * Fundo das telas de conta: grade de quarteirões em canvas (`AuthGrid`: blocos giram com o mouse e na troca de tema) e dois fios de 2 px cruzando no centro em SVG (`AuthQuina`).
 * A frase “Te vejo na Kina.” e o rodapé só entram no login (DECISOES D1/D19).
 */
export function AuthStage({
  children,
  phrase = false,
  phraseOut = false,
  fioHRef,
  fioVRef,
}: {
  children: ReactNode;
  phrase?: boolean;
  /** Painel aberto: a frase sai pela esquerda (transform + opacity) para não cobrir o formulário. */
  phraseOut?: boolean;
  /** Fios da quina, para o magnetismo do login curvá-los. */
  fioHRef?: RefObject<SVGPathElement | null>;
  fioVRef?: RefObject<SVGPathElement | null>;
}) {
  return (
    <main className="auth-stage">
      <GlassFilter />
      <AuthGrid className="auth-stage__grid" />
      <AuthQuina hRef={fioHRef} vRef={fioVRef} />
      <ThemeToggle className="theme-toggle-corner" />
      <div className="auth-stage__brand">
        <BrandWordmark />
      </div>
      {phrase ? (
        <h1 className="auth-stage__phrase k-display" data-out={phraseOut ? '' : undefined}>
          Te vejo
          <br />
          na <em>Kina.</em>
        </h1>
      ) : null}
      {phrase ? <p className="auth-stage__foot k-meta">Rede privada · Kina</p> : null}
      {children}
    </main>
  );
}
