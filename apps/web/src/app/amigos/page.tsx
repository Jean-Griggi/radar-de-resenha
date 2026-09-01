'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Friendship, PublicUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';

export default function FriendsPage() {
  const toast = useToast();
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    const config = signal ? { signal } : undefined;
    const [f, r, s] = await Promise.all([
      api.get<PublicUser[]>('/friends', config),
      api.get<Friendship[]>('/friends/requests', config),
      api.get<PublicUser[]>('/suggestions', config),
    ]);
    setFriends(f.data);
    setRequests(r.data);
    setSuggestions(s.data);
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal)
      .then(() => {
        if (!controller.signal.aborted) setError('');
      })
      .catch((err) => {
        if (isApiCanceled(err)) return;
        setError(apiErrorMessage(err, 'Não foi possível carregar os amigos'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function run(key: string, action: () => Promise<unknown>) {
    setActing(key);
    try {
      await action();
      await load();
      setError('');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
    } finally {
      setActing(null);
    }
  }

  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Amigos</h1>
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      ) : null}
      {error ? <p className="mb-5 text-[var(--danger)]">{error}</p> : null}
      {!loading && !error ? (
        <>
          <section className="card mb-5 p-5">
            <h2 className="mb-3 font-medium">Pedidos</h2>
            {!error && requests.length === 0 ? <p className="text-sm text-muted">Nenhum pedido pendente.</p> : null}
            <ul className="space-y-3">
              {requests.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/perfil/${item.requester?.username}`} className="flex min-w-0 items-center gap-2">
                    <Avatar src={item.requester?.avatar} name={item.requester?.name} size="sm" />
                    <span className="truncate">{item.requester?.name}</span>
                  </Link>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      disabled={acting !== null}
                      onClick={() => run(`accept:${item.id}`, () => api.put(`/friends/requests/${item.id}`, { status: 'accepted' }))}
                    >
                      Aceitar
                    </Button>
                    <Button
                      variant="secondary"
                      disabled={acting !== null}
                      onClick={() => run(`reject:${item.id}`, () => api.put(`/friends/requests/${item.id}`, { status: 'rejected' }))}
                    >
                      Recusar
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
          <section className="card mb-5 p-5">
            <h2 className="mb-3 font-medium">Sua galera</h2>
            {!error && friends.length === 0 ? <EmptyState title="Você ainda não tem amigos." /> : null}
            <ul className="grid gap-3 sm:grid-cols-2">
              {friends.map((person) => (
                <li key={person.id} className="flex items-center justify-between rounded-xl bg-[var(--overlay)] p-3">
                  <Link href={`/perfil/${person.username}`} className="flex items-center gap-2">
                    <Avatar src={person.avatar} name={person.name} size="sm" />
                    <span>
                      {person.name}
                      <span className="block text-xs text-muted">@{person.username}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section className="card p-5">
            <h2 className="mb-3 font-medium">Sugestões</h2>
            {!error && suggestions.length === 0 ? <p className="text-sm text-muted">Nenhuma sugestão no momento.</p> : null}
            <ul className="space-y-3">
              {suggestions.map((person) => (
                <li key={person.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/perfil/${person.username}`} className="flex min-w-0 items-center gap-2">
                    <Avatar src={person.avatar} name={person.name} size="sm" />
                    <span className="truncate">{person.name}</span>
                  </Link>
                  <Button
                    variant="secondary"
                    disabled={acting !== null}
                    onClick={() => run(`add:${person.id}`, () => api.post('/friends/requests', { userId: person.id }))}
                  >
                    Adicionar
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </RequireAuth>
  );
}
