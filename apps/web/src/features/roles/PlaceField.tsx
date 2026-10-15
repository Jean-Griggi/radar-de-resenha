'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { LocationMap } from '@/features/users/LocationMap';
import type { MapPoint } from '@/features/users/mapPoint';
import { CUIABA_VIEW, searchAddress, type PlaceResult } from '@/lib/geocode';

/**
 * Campo "Local" do rolê: texto livre + mapa aberto em Cuiabá. A pessoa pesquisa um endereço e escolhe
 * o resultado, ou clica direto no mapa para marcar o ponto exato. O texto continua editável.
 */
export function PlaceField({
  location,
  point,
  onChange,
}: {
  location: string;
  point: MapPoint | null;
  onChange: (next: { location: string; point: MapPoint | null }) => void;
}) {
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const helpId = useId();

  useEffect(() => () => abortRef.current?.abort(), []);

  async function search() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setMessage('');
    try {
      const found = await searchAddress(location, controller.signal);
      if (controller.signal.aborted) return;
      setResults(found);
      if (found.length === 0) {
        setMessage(
          location.trim().length < 3
            ? 'Digite pelo menos 3 letras (ou um CEP) para pesquisar.'
            : 'Nada encontrado. Tente outro nome, um CEP ou clique no mapa.',
        );
      }
    } catch {
      if (!controller.signal.aborted) setMessage('A busca não respondeu agora. Você ainda pode clicar no mapa.');
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }

  function choose(place: PlaceResult) {
    onChange({ location: place.name, point: { latitude: place.latitude, longitude: place.longitude } });
    setResults([]);
    setMessage('');
  }

  return (
    <div className="space-y-3">
      <Field label="Local">
        <div className="role-place">
          <Input
            value={location}
            maxLength={160}
            placeholder="Praça, bairro ou CEP"
            aria-describedby={helpId}
            onChange={(e) => onChange({ location: e.target.value, point })}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              void search();
            }}
          />
          <Button type="button" variant="secondary" disabled={searching} onClick={() => void search()}>
            {searching ? 'Buscando…' : 'Pesquisar'}
          </Button>
        </div>
      </Field>

      <p id={helpId} className="k-help">
        Pesquise acima ou clique no mapa para marcar o ponto exato.
      </p>

      {message ? <p className="text-sm text-muted">{message}</p> : null}

      {results.length > 0 ? (
        <ul className="card divide-y divide-[var(--k-line)] overflow-hidden" aria-label="Resultados da busca">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude},${place.label}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[color-mix(in_srgb,var(--k-text)_5%,transparent)]"
                onClick={() => choose(place)}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <LocationMap
        interactive
        point={point}
        avatar={null}
        fallbackView={CUIABA_VIEW}
        heightClass="role-map"
        hint=""
        pin="role"
        guardScroll
        onPick={(picked) => onChange({ location, point: picked })}
      />

      {point ? (
        <div className="flex items-center justify-between gap-2 text-sm text-muted">
          <span>
            Ponto marcado ({point.latitude.toFixed(5)}, {point.longitude.toFixed(5)})
          </span>
          <Button type="button" variant="ghost" onClick={() => onChange({ location, point: null })}>
            Remover ponto
          </Button>
        </div>
      ) : null}
    </div>
  );
}
