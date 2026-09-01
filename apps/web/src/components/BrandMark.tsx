const SRC = '/brand/symbol-3d.png';

export function BrandSymbol({
  className = '',
  title,
}: {
  className?: string;
  title?: string;
}) {
  const labelled = Boolean(title);
  return (
    <img
      src={SRC}
      alt={labelled ? title : ''}
      className={`brand-symbol ${className}`.trim()}
      draggable={false}
      decoding="async"
      aria-hidden={labelled ? undefined : true}
    />
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
      <BrandSymbol className="brand-loader-symbol" />
      <div className="brand-loader-track">
        <span className="brand-loader-bar" />
      </div>
    </div>
  );
}
