'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';
import { searchAddress, type PlaceResult } from '@/lib/geocode';
import { fetchRoute, formatDistance, formatDuration, metersBetween, type Route } from '@/lib/routing';
import { loadSavedPlaces, removePlace, savePlace, type SavedPlace } from '@/lib/savedPlaces';
import type { MapPoint } from './mapPoint';

type Spot = { label: string; point: MapPoint };

const RECALC_METERS = 40;
const RECALC_MS = 10_000;

/** Um ponto da rota: pesquisa (cidade, endereço, CEP), local salvo ou, na origem, a posição atual. */
function SpotPicker({
  title,
  spot,
  saved,
  onPick,
  onSave,
  onDelete,
  onUseMyLocation,
}: {
  title: string;
  spot: Spot | null;
  saved: SavedPlace[];
  onPick: (spot: Spot | null) => void;
  onSave: (name: string, point: MapPoint) => void;
  onDelete: (id: string) => void;
  onUseMyLocation?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  async function search() {
    if (query.trim().length < 3) {
      setMessage('Digite uma cidade, um endereço ou um CEP.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const found = await searchAddress(query);
      setResults(found);
      if (found.length === 0) setMessage('Nada encontrado.');
    } catch {
      setMessage('A busca não respondeu agora. Tente de novo.');
    } finally {
      setBusy(false);
    }
  }

  function choose(next: Spot) {
    onPick(next);
    setResults([]);
    setQuery('');
    setMessage('');
  }

  return (
    <div className="space-y-2">
      <p className="text-label text-muted">{title}</p>
      {spot ? (
        <div className="flex items-center justify-between gap-2 rounded-[var(--radius-md)] border border-[var(--border)] px-3 py-2 text-sm">
          <span className="min-w-0 truncate">{spot.label}</span>
          <span className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" onClick={() => setSaving((v) => !v)}>
              Salvar
            </Button>
            <Button type="button" variant="ghost" onClick={() => onPick(null)}>
              Trocar
            </Button>
          </span>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            value={query}
            placeholder="Cidade, endereço ou CEP"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              void search();
            }}
          />
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void search()}>
            {busy ? '…' : 'Buscar'}
          </Button>
        </div>
      )}
      {spot && saving ? (
        <div className="flex gap-2">
          <Input value={name} maxLength={40} placeholder="Nome, ex.: Minha casa" onChange={(e) => setName(e.target.value)} />
          <Button
            type="button"
            variant="secondary"
            disabled={!name.trim()}
            onClick={() => {
              onSave(name, spot.point);
              setName('');
              setSaving(false);
            }}
          >
            Guardar
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {results.length > 0 ? (
        <ul className="card divide-y divide-[var(--border)] overflow-hidden">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude},${place.label}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--overlay)]"
                onClick={() => choose({ label: place.name, point: { latitude: place.latitude, longitude: place.longitude } })}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {!spot ? (
        <div className="flex flex-wrap gap-2">
          {onUseMyLocation ? (
            <button type="button" className="chip-tab" onClick={onUseMyLocation}>
              📍 Minha localização
            </button>
          ) : null}
          {saved.map((place) => (
            <span key={place.id} className="inline-flex items-center">
              <button
                type="button"
                className="chip-tab"
                onClick={() => choose({ label: place.name, point: { latitude: place.latitude, longitude: place.longitude } })}
              >
                ⭐ {place.name}
              </button>
              <button
                type="button"
                className="px-1 text-xs text-muted hover:text-fg"
                aria-label={`Apagar ${place.name}`}
                onClick={() => onDelete(place.id)}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function RoutePanel({
  onRoute,
  onMe,
}: {
  onRoute: (coordinates: [number, number][] | null, fit: boolean) => void;
  onMe: (point: MapPoint | null, follow: boolean) => void;
}) {
  const [from, setFrom] = useState<Spot | null>(null);
  const [to, setTo] = useState<Spot | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [saved, setSaved] = useState<SavedPlace[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(false);
  const watchRef = useRef<number | null>(null);
  const busyRef = useRef(false);
  const lastCalc = useRef<{ point: MapPoint; at: number } | null>(null);
  const toRef = useRef(to);
  toRef.current = to;

  useEffect(() => setSaved(loadSavedPlaces()), []);

  function stopWatching() {
    if (watchRef.current != null) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
    setFollowing(false);
  }

  useEffect(() => () => stopWatching(), []);

  async function trace(origin: MapPoint, destination: MapPoint, fit: boolean) {
    busyRef.current = true;
    setBusy(true);
    setMessage('');
    try {
      const found = await fetchRoute(origin, destination);
      lastCalc.current = { point: origin, at: Date.now() };
      if (!found) {
        setRoute(null);
        onRoute(null, false);
        setMessage('Não achei um caminho de carro entre os dois pontos.');
        return;
      }
      setRoute(found);
      onRoute(found.coordinates, fit);
    } catch {
      setMessage('O serviço de rotas não respondeu agora. Tente de novo.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  function locate(): Promise<MapPoint> {
    return new Promise((resolve, reject) => {
      if (!('geolocation' in navigator)) return reject(new Error('sem geolocalização'));
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        reject,
        { enableHighAccuracy: true, timeout: 15_000 },
      );
    });
  }

  async function useMyLocation() {
    setMessage('Buscando sua localização…');
    try {
      const point = await locate();
      setFrom({ label: 'Minha localização', point });
      onMe(point, false);
      setMessage('');
    } catch {
      setMessage('Não consegui sua localização. Libere o acesso no navegador ou busque o endereço.');
    }
  }

  function startFollowing() {
    if (!to) return;
    if (!('geolocation' in navigator)) {
      setMessage('Este navegador não tem localização.');
      return;
    }
    setFollowing(true);
    watchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const here = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
        setFrom({ label: 'Minha localização', point: here });
        onMe(here, true);
        const destination = toRef.current?.point;
        const last = lastCalc.current;
        if (!destination || busyRef.current) return;
        if (last && (Date.now() - last.at < RECALC_MS || metersBetween(last.point, here) < RECALC_METERS)) return;
        void trace(here, destination, false);
      },
      () => {
        stopWatching();
        onMe(null, false);
        setMessage('Perdi a localização. Libere o acesso no navegador e tente de novo.');
      },
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
  }

  function clearAll() {
    stopWatching();
    setFrom(null);
    setTo(null);
    setRoute(null);
    setMessage('');
    lastCalc.current = null;
    onRoute(null, false);
    onMe(null, false);
  }

  const shared = {
    saved,
    onSave: (name: string, point: MapPoint) => setSaved(savePlace(name, point)),
    onDelete: (id: string) => setSaved(removePlace(id)),
  };

  return (
    <section className="card mb-4 space-y-4 p-4" aria-label="Rota">
      <h2 className="text-lg font-medium">Rota</h2>
      <SpotPicker title="Onde estou (origem)" spot={from} onPick={setFrom} onUseMyLocation={() => void useMyLocation()} {...shared} />
      <SpotPicker title="Para onde vou (destino)" spot={to} onPick={setTo} {...shared} />
      <div className="flex flex-wrap gap-2">
        <Button type="button" disabled={!from || !to || busy} onClick={() => from && to && void trace(from.point, to.point, true)}>
          {busy ? 'Calculando…' : 'Traçar rota'}
        </Button>
        {route ? (
          <Button type="button" variant="secondary" onClick={following ? stopWatching : startFollowing}>
            {following ? 'Parar de acompanhar' : 'Acompanhar'}
          </Button>
        ) : null}
        {from || to || route ? (
          <Button type="button" variant="ghost" onClick={clearAll}>
            Limpar
          </Button>
        ) : null}
      </div>
      {route ? (
        <p className="text-sm">
          <strong>{formatDistance(route.distanceMeters)}</strong> · {formatDuration(route.durationSeconds)} de carro
          {following ? ' · acompanhando sua posição' : ''}
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </section>
  );
}
