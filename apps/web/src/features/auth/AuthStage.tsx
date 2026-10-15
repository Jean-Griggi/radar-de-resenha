import type { ReactNode } from 'react';
import { BrandWordmark } from '@/components/BrandWordmark';
import { ThemeToggle } from '@/components/Theme';
import { AuthGrid } from './AuthGrid';
import { GlassFilter } from './GlassFilter';

/**
 * Fundo das telas de conta: grade de quarteirões e dois fios de 2 px cruzando no centro.
 * A frase “Te vejo na Kina.” só entra no login (DECISOES D1).
 */
export function AuthStage({
  children,
  phrase = false,
  suppressPhrase = false,
}: {
  children: ReactNode;
  phrase?: boolean;
  /** Painel aberto: a frase sai para não cobrir o formulário. */
  suppressPhrase?: boolean;
}) {
  return (
    <main className="auth-stage">
      <GlassFilter />
      <AuthGrid className="auth-stage__grid" />
      <div className="auth-stage__h" aria-hidden />
      <div className="auth-stage__v" aria-hidden />
      <ThemeToggle className="theme-toggle-corner" />
      <div className="auth-stage__brand">
        <BrandWordmark />
      </div>
      {phrase && !suppressPhrase ? (
        <h1 className="auth-stage__phrase k-display">
          Te vejo
          <br />
          na <em>Kina.</em>
        </h1>
      ) : null}
      {children}
    </main>
  );
}
