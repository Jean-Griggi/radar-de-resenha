'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import { mountLocationMap, type MapControls, type MapPoint } from './mapPoint';

export function LocationMap({
  point,
  avatar,
  placeName = null,
  interactive = false,
  onPick,
}: {
  point: MapPoint | null;
  avatar: string | null;
  placeName?: string | null;
  interactive?: boolean;
  onPick?: (point: MapPoint) => void;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<MapControls | null>(null);
  const onPickRef = useRef(onPick);
  const pointRef = useRef(point);
  const avatarRef = useRef(avatar);
  const placeNameRef = useRef(placeName);
  const [failed, setFailed] = useState(false);
  onPickRef.current = onPick;
  pointRef.current = point;
  avatarRef.current = avatar;
  placeNameRef.current = placeName;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    setFailed(false);
    mountLocationMap(host, {
      interactive,
      point: pointRef.current,
      avatar: avatarRef.current,
      placeName: pointRef.current ? placeNameRef.current : null,
      onPick: (picked) => onPickRef.current?.(picked),
    })
      .then((controls) => {
        if (cancelled) {
          controls.destroy();
          return;
        }
        controlsRef.current = controls;
        controls.sync(pointRef.current, avatarRef.current, pointRef.current ? placeNameRef.current : null);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      controlsRef.current?.destroy();
      controlsRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    controlsRef.current?.sync(point, avatar, point ? placeName : null);
  }, [point, avatar, placeName]);

  return (
    <div data-location-map={failed ? 'closed' : 'open'}>
      <div
        ref={hostRef}
        className="h-56 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        role="application"
        aria-label={interactive ? 'Minimapa para escolher a localização' : 'Mapa da localização'}
      />
      {failed ? <p className="mt-2 text-sm text-[var(--danger)]">Não foi possível abrir o mapa.</p> : null}
      {interactive && !failed ? <p className="mt-2 text-xs text-muted">Clique no mapa para escolher o lugar.</p> : null}
    </div>
  );
}
