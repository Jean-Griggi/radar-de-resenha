import Link from 'next/link';

const WORDMARK = {
  src: '/brand/wordmark-bomb.png',
  alt: 'Redesenha',
  width: 800,
  height: 309,
};

const MASCOT = {
  src: '/brand/mascote.png',
  width: 800,
  height: 570,
};

export function BrandWordmark({
  href,
  large = false,
  mascot = true,
}: {
  href?: string;
  large?: boolean;
  mascot?: boolean;
}) {
  const inner = (
    <>
      {mascot ? (
        <img
          src={MASCOT.src}
          alt=""
          width={MASCOT.width}
          height={MASCOT.height}
          className="brand-mascot"
        />
      ) : null}
      <img
        src={WORDMARK.src}
        alt={WORDMARK.alt}
        width={WORDMARK.width}
        height={WORDMARK.height}
        className="brand-wordmark-img"
      />
    </>
  );
  const className = `brand-wordmark shrink-0${large ? ' brand-wordmark--lg' : ''}`;
  if (href) {
    return (
      <Link href={href} className={className} aria-label={WORDMARK.alt}>
        {inner}
      </Link>
    );
  }
  return <p className={className}>{inner}</p>;
}
