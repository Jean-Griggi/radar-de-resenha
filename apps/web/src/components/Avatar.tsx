'use client';

import { useEffect, useState } from 'react';
import { initials } from '@/lib/format';

export function Avatar({
  src,
  name,
  size = 'md',
  glow = false,
}: {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-lg sm:h-16 sm:w-16',
    xl: 'h-20 w-20 text-xl sm:h-28 sm:w-28 sm:text-2xl',
  };
  return (
    <div
      className={`overflow-hidden rounded-full bg-gradient-to-br from-violet-500 to-sky-400 ${sizes[size]} ${glow ? 'ring-2 ring-violet-400/70 shadow-[0_0_20px_rgba(139,92,246,0.45)]' : 'ring-2 ring-white/10'}`}
    >
      {src && !broken ? (
        <img
          src={src}
          alt={name ? `Foto de ${name}` : 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center font-semibold text-white">{initials(name)}</div>
      )}
    </div>
  );
}
