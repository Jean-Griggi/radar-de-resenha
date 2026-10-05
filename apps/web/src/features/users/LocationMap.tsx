'use client';

import { useEffect, useRef, useState } from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  mountLocationMap,
  mountPeopleMap,
  type MapControls,
  type MapFallbackView,
  type MapPoint,
  type PeopleMapControls,
  type PeoplePin,
} from './mapPoint';

export function LocationMap({
  point,
  avatar,
  placeName = null,
  interactive = false,
  onPick,
  fallbackView,
  heightClass = 'h-56',
  hint = 'Clique no mapa para escolher o lugar.',
}: {
  point: MapPoint | null;
  avatar: string | null;
  placeName?: string | null;
  interactive?: boolean;
  onPick?: (point: MapPoint) => void;
  /** Onde o mapa abre enquanto não há ponto. */
  fallbackView?: MapFallbackView;
  heightClass?: string;
  hint?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<MapControls | null>(null);
  const onPickRef = useRef(onPick);
  const pointRef = useRef(point);
  const avatarRef = useRef(avatar);
  const placeNameRef = useRef(placeName);
  const fallbackRef = useRef(fallbackView);
  const [failed, setFailed] = useState(false);
  fallbackRef.current = fallbackView;
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
      fallbackView: fallbackRef.current,
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
        className={`${heightClass} w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]`}
        role="application"
        aria-label={interactive ? 'Minimapa para escolher a localização' : 'Mapa da localização'}
      />
      {failed ? <p className="mt-2 text-sm text-[var(--danger)]">Não foi possível abrir o mapa.</p> : null}
      {interactive && !failed ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function PeopleMap({ people }: { people: PeoplePin[] }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<PeopleMapControls | null>(null);
  const peopleRef = useRef(people);
  const [failed, setFailed] = useState(false);
  peopleRef.current = people;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    setFailed(false);
    mountPeopleMap(host, peopleRef.current)
      .then((controls) => {
        if (cancelled) {
          controls.destroy();
          return;
        }
        controlsRef.current = controls;
        controls.sync(peopleRef.current);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      controlsRef.current?.destroy();
      controlsRef.current = null;
    };
  }, []);

  useEffect(() => {
    controlsRef.current?.sync(people);
  }, [people]);

  return (
    <div data-people-map={failed ? 'closed' : 'open'}>
      <div
        ref={hostRef}
        className="h-[70vh] min-h-80 w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        role="application"
        aria-label="Mapa das pessoas"
      />
      {failed ? <p className="mt-2 text-sm text-[var(--danger)]">Não foi possível abrir o mapa.</p> : null}
    </div>
  );
}
