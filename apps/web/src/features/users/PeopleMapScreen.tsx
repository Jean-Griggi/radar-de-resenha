'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { MapPerson } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/Card';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';
import { isCep, searchAddress, type PlaceResult } from '@/lib/geocode';
import { PeopleMap, type MapTarget } from '@/features/users/LocationMap';
import { pinsFromPeople } from '@/features/users/mapPoint';

export function PeopleMapScreen() {
  const [people, setPeople] = useState<MapPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState<MapTarget | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function goTo(place: PlaceResult, zoom: number) {
    setTarget({ latitude: place.latitude, longitude: place.longitude, zoom, key: Date.now() });
    setResults([]);
    setMessage(place.label);
  }

  async function search(event: FormEvent) {
    event.preventDefault();
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
      else if (found.length === 1 || isCep(text)) goTo(found[0]!, isCep(text) ? 16 : 12);
      else setResults(found);
    } catch {
      if (!controller.signal.aborted) setMessage('A busca não respondeu agora. Tente de novo.');
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }


  useEffect(() => {
    const controller = new AbortController();
    api
      .get<MapPerson[]>('/users/map', { signal: controller.signal })
      .then((res) => {
        if (!controller.signal.aborted) {
          setPeople(res.data);
          setError('');
        }
      })
      .catch((err) => {
        if (isApiCanceled(err)) return;
        if (!controller.signal.aborted) setError(apiErrorMessage(err, 'Não foi possível abrir o mapa'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const pins = pinsFromPeople(people);

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Pessoas no mapa</h1>
      <form onSubmit={search} className="mb-3 flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pesquisar cidade, endereço ou CEP"
          aria-label="Pesquisar no mapa"
        />
        <Button type="submit" variant="secondary" disabled={searching}>
          {searching ? 'Buscando…' : 'Pesquisar'}
        </Button>
      </form>
      {message ? <p className="mb-3 text-sm text-muted">{message}</p> : null}
      {results.length > 0 ? (
        <ul className="card mb-3 divide-y divide-[var(--border)] overflow-hidden" aria-label="Resultados da busca">
          {results.map((place) => (
            <li key={`${place.latitude},${place.longitude},${place.label}`}>
              <button type="button" className="block w-full px-3 py-2 text-left text-sm hover:bg-[var(--overlay)]" onClick={() => goTo(place, 12)}>
                {place.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {loading ? <Skeleton className="h-80" /> : null}
      {error ? <p className="mb-5 text-[var(--danger)]">{error}</p> : null}
      {!loading && !error ? (
        <>
          <PeopleMap people={pins} target={target} />
          {pins.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nenhuma pessoa com localização visível.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {pins.map((person) => {
                const profile = people.find((item) => item.id === person.id);
                return (
                  <li key={person.id}>
                    <Link href={`/perfil/${person.username}`} className="flex min-w-0 items-center gap-2">
                      <Avatar src={person.avatar} name={profile?.name} size="sm" />
                      <span className="truncate">
                        {profile?.name || person.username}
                        {person.placeName ? ` · ${person.placeName}` : ''}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : null}
    </>
  );
}
