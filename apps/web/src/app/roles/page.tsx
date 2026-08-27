'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ROLE_CATEGORIES, type Role } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { EmptyState, Skeleton } from '@/components/Card';
import { MediaImage } from '@/components/MediaImage';
import { RequireAuth } from '@/components/RequireAuth';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { formatDate } from '@/lib/format';

const FILTERS = [
  { id: '', label: 'Todos' },
  { id: 'proximos', label: 'Próximos' },
  { id: 'passados', label: 'Passados' },
  { id: 'meus', label: 'Meus' },
  { id: 'participando', label: 'Participando' },
  { id: 'talvez', label: 'Talvez' },
];

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setRoles([]);
    api
      .get<Role[]>('/roles', { params: filter ? { filter } : undefined, signal: controller.signal })
      .then(({ data }) => setRoles(data))
      .catch((err) => {
        if (isApiCanceled(err)) return;
        setRoles([]);
        setError(apiErrorMessage(err, 'Não foi possível listar os rolês'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [filter]);

  return (
    <RequireAuth>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Rolês</h1>
          <p className="text-sm text-slate-400">Os encontros, as memórias e o que vem aí.</p>
        </div>
        <Link href="/roles/new" className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 py-2 text-center text-sm font-medium glow-btn sm:shrink-0">
          Novo rolê
        </Link>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full px-3 py-1.5 text-sm ${filter === item.id ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : null}
      {error ? <p className="text-rose-300">{error}</p> : null}
      {!loading && !error && roles.length === 0 ? (
        <EmptyState
          title="Você ainda não tem nenhum rolê."
          action={
            <Link href="/roles/new" className="rounded-xl bg-violet-500 px-4 py-2 text-sm">
              Criar primeiro rolê
            </Link>
          }
        />
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <li key={role.id}>
            <Link href={`/roles/${role.id}`} className="card block overflow-hidden transition hover:border-violet-400/40">
              {role.coverPhoto ? (
                <MediaImage src={role.coverPhoto} alt="" className="h-36 w-full object-cover" />
              ) : null}
              <div className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-200">{role.category}</span>
                  <span className="text-xs text-slate-400">{role.status}</span>
                </div>
                <h2 className="mt-3 text-lg font-medium">{role.title}</h2>
                <p className="text-sm text-slate-400">
                  {formatDate(role.date)} {role.time ? `· ${role.time}` : ''}
                </p>
                <p className="text-sm text-slate-400">{role.location || 'Local a combinar'}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-2">
                    <Avatar src={role.creator?.avatar} name={role.creator?.name} size="sm" />
                    {role.creator?.name}
                  </span>
                  <span>
                    {role.goingCount} vão · {role.maybeCount} talvez
                  </span>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-slate-500">Categorias: {ROLE_CATEGORIES.join(' · ')}</p>
    </RequireAuth>
  );
}
