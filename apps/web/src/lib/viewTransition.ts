type ViewTransitionLike = { finished: Promise<void> };
type DocumentWithTransition = Document & {
  startViewTransition?: (update: () => Promise<void>) => ViewTransitionLike;
};

/** Há View Transitions API e a pessoa não pediu movimento reduzido. Sem isso o estado muda direto (ou em fade). */
export function canViewTransition() {
  if (typeof document === 'undefined') return false;
  return (
    'startViewTransition' in document &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Roda `update` dentro de uma View Transition quando possível; senão roda direto.
 * Devolve uma promessa que resolve quando a animação termina (ou na hora, sem suporte).
 */
export function withViewTransition(update: () => void | Promise<void>): Promise<void> {
  if (!canViewTransition()) return Promise.resolve(update());
  const transition = (document as DocumentWithTransition).startViewTransition!(() =>
    Promise.resolve(update()),
  );
  return transition.finished.catch(() => undefined);
}
