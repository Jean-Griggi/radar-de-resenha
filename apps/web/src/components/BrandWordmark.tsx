import Link from 'next/link';
import { KinaLogo } from './KinaLogo';

const ALT = 'Kina';

export function BrandWordmark({
  href,
  large = false,
}: {
  href?: string;
  large?: boolean;
}) {
  const inner = <KinaLogo variant="full" decorative className="brand-logo" />;
  const className = `brand-wordmark shrink-0${large ? ' brand-wordmark--lg' : ''}`;
  if (href) {
    return (
      <Link href={href} className={className} aria-label={ALT}>
        {inner}
      </Link>
    );
  }
  return (
    <p className={className} role="img" aria-label={ALT}>
      {inner}
    </p>
  );
}
