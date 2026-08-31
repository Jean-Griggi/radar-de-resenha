'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ROLE_CATEGORIES, type Role } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { EmptyState, Skeleton } from '@/components/Card';
import { MediaImage } from '@/components/MediaImage';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
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

function isToday(date: string | null) {
  if (!date) return false;
  const value = date.slice(0, 10);
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  return value === today;
}

function RoleBadges({ role }: { role: Role }) {
  const badges: { label: string; tone: 'accent' | 'muted' }[] = [];
  if (isToday(role.date)) badges.push({ label: 'Hoje', tone: 'accent' });
  if (role.status === 'ongoing') badges.push({ label: 'Confirmado', tone: 'accent' });
  if (role.status === 'upcoming') badges.push({ label: 'Pendente', tone: 'muted' });
  if (role.status === 'cancelled') badges.push({ label: 'Cancelado', tone: 'muted' });
  badges.push({ label: role.category, tone: 'muted' });
  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex min-h-6 items-center rounded-full border-2 px-2 text-label ${
            badge.tone === 'accent'
              ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--paper)]'
              : 'border-[var(--text)] text-fg'
          }`}
        >
          {badge.label}
        </span>
      ))}
    </div>
  );
}

export default function RolesPage() {
  const toast = useToast();
  const [roles, setRoles] = useState<Role[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

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

  async function bora(roleId: string) {
    setActing(roleId);
    try {
      await api.post(`/roles/${roleId}/attendance`, { status: 'going' });
      toast.push('Presença confirmada');
    } catch (err) {
      if (!isApiCanceled(err)) toast.push(apiErrorMessage(err, 'Não foi possível confirmar'), 'error');
    } finally {
      setActing(null);
    }
  }

  return (
    <RequireAuth>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold sm:text-3xl">Rolês</h1>
          <p className="text-sm text-muted">Os encontros, as memórias e o que vem aí.</p>
        </div>
        <Link href="/roles/new" className="button button--primary sm:shrink-0">
          Novo rolê
        </Link>
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`min-h-11 rounded-full border-2 px-3 text-sm font-bold ${
              filter === item.id ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--paper)]' : 'border-line text-muted hover:border-[var(--text)]'
            }`}
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
            <Link href="/roles/new" className="button button--primary">
              Criar primeiro rolê
            </Link>
          }
        />
      ) : null}
      <ul className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => (
          <li key={role.id}>
            <article className="card overflow-hidden">
              <Link href={`/roles/${role.id}`} className="block">
                <MediaImage src={role.coverPhoto} alt="" className="h-40 w-full object-cover" />
                <div className="space-y-2 p-4">
                  <RoleBadges role={role} />
                  <p className="text-sm font-bold text-fg">
                    {formatDate(role.date)} {role.time ? `· ${role.time}` : ''}
                  </p>
                  <p className="text-sm text-muted">{role.location || 'Local a combinar'}</p>
                  <h2 className="text-lg font-medium text-fg">{role.title}</h2>
                  <div className="flex items-center justify-between text-xs text-muted">
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
              <div className="px-4 pb-4">
                <button type="button" className="button button--primary w-full" disabled={acting === role.id} onClick={() => bora(role.id)}>
                  Bora
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-xs text-muted">Categorias: {ROLE_CATEGORIES.join(' · ')}</p>
    </RequireAuth>
  );
}
