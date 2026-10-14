import { KinaLogo } from './KinaLogo';

export function BrandSymbol({
  className = '',
  title,
}: {
  className?: string;
  title?: string;
}) {
  const labelled = Boolean(title);
  return (
    <KinaLogo
      variant="symbol"
      className={`brand-symbol ${className}`.trim()}
      decorative={!labelled}
      {...(labelled ? { role: 'img', 'aria-label': title } : {})}
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
