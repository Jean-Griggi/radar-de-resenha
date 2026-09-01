'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Notification } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { formatTimeAgo } from '@/lib/format';

export default function NotificationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);

  async function load(signal?: AbortSignal) {
    const { data } = await api.get<Notification[]>('/notifications', signal ? { signal } : undefined);
    setItems(data);
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
        setError(apiErrorMessage(err, 'Não foi possível carregar as notificações'));
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
      toast.push(apiErrorMessage(err, 'Não foi possível atualizar as notificações'), 'error');
    } finally {
      setActing(null);
    }
  }

  return (
    <RequireAuth>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold sm:text-3xl">Notificações</h1>
        <Button variant="secondary" disabled={acting !== null} onClick={() => run('all', () => api.put('/notifications/read-all'))}>
          Marcar todas como lidas
        </Button>
      </div>
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : null}
      {error ? <p className="mb-5 text-[var(--danger)]">{error}</p> : null}
      {!loading && !error && items.length === 0 ? <EmptyState title="Nenhuma notificação." /> : null}
      {!loading && !error ? (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id} className={`card flex items-center gap-3 p-4 ${item.read ? 'opacity-60' : ''}`}>
              <Avatar src={item.actor?.avatar} name={item.actor?.name} size="sm" />
              <div className="flex-1">
                {item.link ? (
                  <Link href={item.link} className="text-sm">
                    {item.message}
                  </Link>
                ) : (
                  <p className="text-sm">{item.message}</p>
                )}
                <p className="text-xs text-muted">{formatTimeAgo(item.createdAt)}</p>
              </div>
              {!item.read ? (
                <Button variant="ghost" disabled={acting !== null} onClick={() => run(item.id, () => api.put(`/notifications/${item.id}/read`))}>
                  Lida
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </RequireAuth>
  );
}
