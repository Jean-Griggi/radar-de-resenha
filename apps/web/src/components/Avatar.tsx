'use client';

import { useEffect, useState } from 'react';
import { initials } from '@/lib/format';

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Pessoas são pontos: o único componente redondo (junto com a presença). Sem foto, iniciais em Fraunces.
 * `glow` marca story não visto (anel de 2 px na marca); `seen` marca story visto (anel de fio).
 */
export function Avatar({
  src,
  name,
  size = 'md',
  glow = false,
  seen = false,
  online,
}: {
  src?: string | null;
  name?: string | null;
  size?: AvatarSize;
  glow?: boolean;
  seen?: boolean;
  online?: boolean;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);

  const ring = glow ? ' k-avatar--ring' : seen ? ' k-avatar--seen' : '';

  return (
    <div className={`avatar k-avatar k-avatar--${size}${ring}`}>
      <div className="k-avatar__face">
        {src && !broken ? (
          <img src={src} alt={name ? `Foto de ${name}` : 'Avatar'} onError={() => setBroken(true)} />
        ) : (
          initials(name)
        )}
      </div>
      {online != null ? (
        <span className={`k-avatar__presence${online ? ' k-avatar__presence--on' : ''}`} aria-hidden />
      ) : null}
    </div>
  );
}
