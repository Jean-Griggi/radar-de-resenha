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
        className={`media-fallback ${className} ${fallbackClassName}`}
        role="img"
        aria-label={alt || 'Imagem indisponível'}
      />
    );
  }

  return <img src={src} alt={alt} className={className} loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}
