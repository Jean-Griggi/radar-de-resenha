'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { MapPerson } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Skeleton } from '@/components/Card';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { PeopleMap } from '@/features/users/LocationMap';
import { pinsFromPeople } from '@/features/users/mapPoint';

export function PeopleMapScreen() {
  const [people, setPeople] = useState<MapPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      {loading ? <Skeleton className="h-80" /> : null}
      {error ? <p className="mb-5 text-[var(--danger)]">{error}</p> : null}
      {!loading && !error ? (
        <>
          <PeopleMap people={pins} />
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
