import Link from 'next/link';
import { BrandSymbol } from './BrandMark';

const ALT = 'Redesinha';

export function BrandWordmark({
  href,
  large = false,
}: {
  href?: string;
  large?: boolean;
}) {
  const inner = (
    <>
      <BrandSymbol className="brand-wordmark-mark" />
      <span className="brand-wordmark-text" aria-hidden>
        edesinha
      </span>
    </>
  );
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
