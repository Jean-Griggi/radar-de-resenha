/**
 * Spinner da Kina: o símbolo (L) com o ponto percorrendo o traço vertical e voltando (ciclo de 1,2 s).
 * Só aparece depois de 300 ms de espera (CSS); com movimento reduzido o ponto apenas pulsa em opacidade.
 */
export function Spinner({ label = 'Carregando', size = 'md' }: { label?: string; size?: 'md' | 'lg' }) {
  return (
    <span className={`k-spinner${size === 'lg' ? ' k-spinner--lg' : ''}`} role="status" aria-label={label}>
      <svg viewBox="0 0 120 120" aria-hidden>
        <rect x="10" y="10" width="16" height="100" fill="currentColor" />
        <rect x="10" y="94" width="100" height="16" fill="currentColor" />
        <circle className="k-spinner__dot" cx="47.2" cy="72.8" r="11" />
      </svg>
    </span>
  );
}
