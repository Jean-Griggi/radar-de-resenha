import type { ReactNode } from 'react';
import { BrandWordmark } from '@/components/BrandWordmark';
import { ThemeToggle } from '@/components/Theme';

/**
 * Fundo das telas de conta: grade de quarteirões e dois fios de 2 px cruzando no centro.
 * A frase “Te vejo na Kina.” só entra no login (DECISOES D1).
 */
export function AuthStage({ children, phrase = false }: { children: ReactNode; phrase?: boolean }) {
  return (
    <main className="auth-stage">
      <div className="k-street-grid auth-stage__grid" aria-hidden />
      <div className="auth-stage__h" aria-hidden />
      <div className="auth-stage__v" aria-hidden />
      <ThemeToggle className="theme-toggle-corner" />
      <div className="auth-stage__brand">
        <BrandWordmark />
      </div>
      {phrase ? (
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
