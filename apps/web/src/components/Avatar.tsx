'use client';

import { useEffect, useState } from 'react';
import { initials } from '@/lib/format';

export function Avatar({
  src,
  name,
  size = 'md',
  glow = false,
  online,
}: {
  src?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  glow?: boolean;
  online?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);

  const sizes = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-11 w-11 text-sm',
    lg: 'h-14 w-14 text-lg sm:h-16 sm:w-16',
    xl: 'h-20 w-20 text-xl sm:h-28 sm:w-28 sm:text-2xl',
  };
  const dots = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
    xl: 'h-3.5 w-3.5',
  };

  return (
    <div className={`avatar relative inline-flex shrink-0 ${sizes[size]}`}>
      <div
        className={`h-full w-full overflow-hidden rounded-full bg-[var(--secondary)] ${glow ? 'ring-2 ring-[var(--primary)]' : 'ring-2 ring-[var(--border)]'}`}
      >
        {src && !broken ? (
          <img
            src={src}
            alt={name ? `Foto de ${name}` : 'Avatar'}
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-semibold text-[var(--text)]">{initials(name)}</div>
        )}
      </div>
      {online != null ? (
        <span
          className={`absolute right-0 bottom-0 rounded-full ring-2 ring-[var(--surface)] ${dots[size]} ${online ? 'bg-[var(--success)]' : 'bg-[var(--text-muted)]'}`}
          aria-hidden
        />
      ) : null}
    </div>
  );
}
