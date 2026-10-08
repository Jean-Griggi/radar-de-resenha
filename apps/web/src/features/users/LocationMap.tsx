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
  type RoutePin,
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

export type MapTarget = MapPoint & { zoom: number; key: number };

export type MapRoute = { coordinates: [number, number][]; fit: boolean };

export function PeopleMap({
  people,
  target = null,
  route = null,
  me = null,
  follow = false,
  routePins = [],
}: {
  people: PeoplePin[];
  target?: MapTarget | null;
  route?: MapRoute | null;
  me?: MapPoint | null;
  follow?: boolean;
  routePins?: RoutePin[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<PeopleMapControls | null>(null);
  const peopleRef = useRef(people);
  const [failed, setFailed] = useState(false);
  peopleRef.current = people;
  const routeRef = useRef(route);
  routeRef.current = route;
  const meRef = useRef(me);
  meRef.current = me;
  const pinsRef = useRef(routePins);
  pinsRef.current = routePins;

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
        controls.setRoute(routeRef.current?.coordinates ?? null, routeRef.current?.fit ?? false);
        controls.setMe(meRef.current, false);
        controls.setRoutePins(pinsRef.current);
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

  useEffect(() => {
    if (target) controlsRef.current?.flyTo(target, target.zoom);
  }, [target]);

  useEffect(() => {
    controlsRef.current?.setRoute(route?.coordinates ?? null, route?.fit ?? false);
  }, [route]);

  useEffect(() => {
    controlsRef.current?.setMe(me, follow);
  }, [me, follow]);

  useEffect(() => {
    controlsRef.current?.setRoutePins(routePins);
  }, [routePins]);

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
