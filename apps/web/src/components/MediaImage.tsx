'use client';

import { useEffect, useState } from 'react';

export function MediaImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);

  if (!src || broken) {
    return (
      <div
        className={`bg-gradient-to-br from-violet-500/25 to-sky-400/15 ${className} ${fallbackClassName}`}
        role="img"
        aria-label={alt || 'Imagem indisponível'}
      />
    );
  }

  return <img src={src} alt={alt} className={className} onError={() => setBroken(true)} />;
}
