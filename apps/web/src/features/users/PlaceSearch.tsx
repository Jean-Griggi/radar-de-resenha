'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';
import { isCep, searchAddress, type PlaceResult } from '@/lib/geocode';

/**
 * Barra "pesquisar cidade, endereço ou CEP" para os mapas em que a pessoa escolhe um ponto.
 * Um resultado só já vira escolha; vários aparecem numa lista. CEP sempre escolhe o primeiro.
 */
export function PlaceSearch({ onPick }: { onPick: (place: PlaceResult) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function choose(place: PlaceResult) {
    onPick(place);
    setResults([]);
    setMessage(place.label);
  }

  async function search() {
    const text = query.trim();
    if (text.length < 3) {
      setMessage('Digite uma cidade, um endereço ou um CEP.');
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    setMessage('');
    setResults([]);
    try {
      const found = await searchAddress(text, controller.signal);
      if (controller.signal.aborted) return;
      if (found.length === 0) setMessage(isCep(text) ? 'CEP não encontrado.' : 'Nada encontrado. Tente outro nome.');
      else if (found.length === 1 || isCep(text)) choose(found[0]!);
      else setResults(found);
    } catch {
      if (!controller.signal.aborted) setMessage('A busca não respondeu agora. Você ainda pode clicar no mapa.');
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={query}
          placeholder="Pesquisar cidade, endereço ou CEP"
          aria-label="Pesquisar cidade, endereço ou CEP"
          onChange={(e) => setQuery(e.target.value)}
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
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {results.length > 0 ? (
        <ul className="card divide-y divide-[var(--border)] overflow-hidden" aria-label="Resultados da busca">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude},${place.label}`}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--overlay)]"
                onClick={() => choose(place)}
              >
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
