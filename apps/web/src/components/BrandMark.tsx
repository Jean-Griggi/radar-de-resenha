const R_PATH =
  'M26 68C23 52 22 32 28 22C34 12 54 12 60 24C64 32 60 42 50 43';

export function BrandSymbol({
  className = '',
  rich = false,
  title,
}: {
  className?: string;
  rich?: boolean;
  title?: string;
}) {
  const labelled = Boolean(title);
  return (
    <svg
      viewBox="0 0 80 80"
      className={`brand-symbol ${rich ? 'brand-symbol--rich' : ''} ${className}`.trim()}
      role={labelled ? 'img' : 'presentation'}
      aria-hidden={labelled ? undefined : true}
      aria-label={title}
    >
      {rich ? (
        <defs>
          <linearGradient id="brand-r-fill" x1="18%" y1="8%" x2="88%" y2="92%">
            <stop offset="0%" stopColor="#ff5a75" />
            <stop offset="48%" stopColor="#e31d3c" />
            <stop offset="100%" stopColor="#c41832" />
          </linearGradient>
          <radialGradient id="brand-dot-fill" cx="34%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#b7abff" />
            <stop offset="55%" stopColor="#6e5bff" />
            <stop offset="100%" stopColor="#4b3ad4" />
          </radialGradient>
        </defs>
      ) : null}
      <circle
        className="brand-symbol-dot"
        cx="18"
        cy="16"
        r="8"
        fill={rich ? 'url(#brand-dot-fill)' : 'var(--accent-cool)'}
      />
      {rich ? <circle cx="15.2" cy="13.2" r="2.4" fill="white" opacity="0.45" /> : null}
      <path
        className="brand-symbol-r"
        d={R_PATH}
        fill="none"
        stroke={rich ? 'url(#brand-r-fill)' : 'var(--primary)'}
        strokeWidth={12}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {rich ? (
        <path
          d={R_PATH}
          fill="none"
          stroke="white"
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.22"
          transform="translate(-1.2 -1.6)"
        />
      ) : null}
    </svg>
  );
}

export function BrandBadge({ className = '', title }: { className?: string; title?: string }) {
  return (
    <span className={`brand-badge ${className}`.trim()}>
      <BrandSymbol title={title} />
    </span>
  );
}

export function BrandLoader({ label = 'Carregando', compact = false }: { label?: string; compact?: boolean }) {
  return (
    <div className={`brand-loader${compact ? ' brand-loader--compact' : ''}`} role="status" aria-live="polite" aria-label={label}>
      <BrandSymbol rich className="brand-loader-symbol" />
      <div className="brand-loader-track">
        <span className="brand-loader-bar" />
      </div>
    </div>
  );
}
