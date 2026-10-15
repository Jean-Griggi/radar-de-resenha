'use client';

import { useEffect, useState, type CSSProperties } from 'react';

export function MediaImage({
  src,
  alt,
  className = '',
  fallbackClassName = '',
  style,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  style?: CSSProperties;
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
        style={style}
      />
    );
  }

  return <img src={src} alt={alt} className={className} style={style} loading="lazy" decoding="async" onError={() => setBroken(true)} />;
}
