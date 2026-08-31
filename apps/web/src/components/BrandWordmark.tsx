import Link from 'next/link';

const WORDMARK = {
  src: '/brand/wordmark-bomb.png',
  alt: 'Redesenha',
  width: 800,
  height: 309,
};

export function BrandWordmark({ href, large = false }: { href?: string; large?: boolean }) {
  const img = (
    <img
      src={WORDMARK.src}
      alt={WORDMARK.alt}
      width={WORDMARK.width}
      height={WORDMARK.height}
      className="brand-wordmark-img"
    />
  );
  const className = `brand-wordmark shrink-0${large ? ' brand-wordmark--lg' : ''}`;
  if (href) {
    return (
      <Link href={href} className={className} aria-label={WORDMARK.alt}>
        {img}
      </Link>
    );
  }
  return <p className={className}>{img}</p>;
}
