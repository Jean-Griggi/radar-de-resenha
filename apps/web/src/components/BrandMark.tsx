import { KinaLogo } from './KinaLogo';
import { Spinner } from './Spinner';

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
    <div className={`brand-loader${compact ? ' brand-loader--compact' : ''}`}>
      <Spinner label={label} size={compact ? 'md' : 'lg'} />
    </div>
  );
}
