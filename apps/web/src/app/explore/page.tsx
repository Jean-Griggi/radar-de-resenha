'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import type { SearchResults } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';

type ExploreData = {
  featuredRoles: { id: string; title: string; location: string | null; category: string }[];
  people: { id: string; name: string; username: string; avatar: string | null }[];
  reviews: { id: string; title: string; rating: number }[];
  categories: { name: string; count: number }[];
  tags: { name: string; count: number }[];
  places: { name: string; count: number }[];
  music: { id: string; title: string; artist: string }[];
};

function ExploreInner() {
  const params = useSearchParams();
  const q = params.get('q') ?? '';
  const [explore, setExplore] = useState<ExploreData | null>(null);
  const [search, setSearch] = useState<SearchResults | null>(null);

  useEffect(() => {
    if (q) {
      api.get<SearchResults>('/search', { params: { q } }).then(({ data }) => setSearch(data));
    } else {
      api.get<ExploreData>('/explore').then(({ data }) => setExplore(data));
      setSearch(null);
    }
  }, [q]);

  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">{q ? `Busca: ${q}` : 'Explorar'}</h1>
      {search ? (
        <div className="space-y-6">
          <Section title="Pessoas">
            {search.people.map((person) => (
              <Link key={person.id} href={`/perfil/${person.username}`} className="card flex items-center gap-3 p-3">
                <Avatar src={person.avatar} name={person.name} size="sm" />
                {person.name}
              </Link>
            ))}
          </Section>
          <Section title="Rolês">
            {search.roles.map((role) => (
              <Link key={role.id} href={`/roles/${role.id}`} className="card p-3">
                {role.title}
              </Link>
            ))}
          </Section>
          <Section title="Resenhas">
            {search.reviews.map((review) => (
              <Link key={review.id} href={`/reviews/${review.id}`} className="card p-3">
                {review.title}
              </Link>
            ))}
          </Section>
          <Section title="Tags">{search.tags.map((tag) => <span key={tag}>#{tag}</span>)}</Section>
          <Section title="Lugares">{search.places.map((place) => <span key={place}>{place}</span>)}</Section>
          <Section title="Músicas">
            {search.music.map((track) => (
              <p key={track.id}>
                {track.title} — {track.artist}
              </p>
            ))}
          </Section>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Section title="Rolês em destaque">
            {explore?.featuredRoles.map((role) => (
              <Link key={role.id} href={`/roles/${role.id}`} className="card block p-4">
                <p>{role.title}</p>
                <p className="text-xs text-slate-400">
                  {role.category} · {role.location}
                </p>
              </Link>
            ))}
          </Section>
          <Section title="Pessoas">
            {explore?.people.map((person) => (
              <Link key={person.id} href={`/perfil/${person.username}`} className="flex items-center gap-2">
                <Avatar src={person.avatar} name={person.name} size="sm" />
                {person.name}
              </Link>
            ))}
          </Section>
          <Section title="Resenhas">
            {explore?.reviews.map((review) => (
              <Link key={review.id} href={`/reviews/${review.id}`}>
                {'★'.repeat(review.rating)} {review.title}
              </Link>
            ))}
          </Section>
          <Section title="Categorias">
            {explore?.categories.map((item) => (
              <span key={item.name} className="rounded-full bg-white/5 px-3 py-1 text-sm">
                {item.name} · {item.count}
              </span>
            ))}
          </Section>
          <Section title="Tags">
            {explore?.tags.map((item) => (
              <span key={item.name} className="text-violet-300">
                #{item.name}
              </span>
            ))}
          </Section>
          <Section title="Lugares">
            {explore?.places.map((item) => (
              <p key={item.name}>
                {item.name} · {item.count}
              </p>
            ))}
          </Section>
          <Section title="Músicas">
            {explore?.music.map((item) => (
              <p key={item.id}>
                {item.title} — {item.artist}
              </p>
            ))}
          </Section>
        </div>
      )}
    </RequireAuth>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card space-y-3 p-5">
      <h2 className="font-medium">{title}</h2>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreInner />
    </Suspense>
  );
}
