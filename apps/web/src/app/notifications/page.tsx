'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Notification } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';
import { formatTimeAgo } from '@/lib/format';

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);

  async function load() {
    const { data } = await api.get<Notification[]>('/notifications');
    setItems(data);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <RequireAuth>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Notificações</h1>
        <Button variant="secondary" onClick={() => api.put('/notifications/read-all').then(load)}>
          Marcar todas como lidas
        </Button>
      </div>
      {items.length === 0 ? <EmptyState title="Nenhuma notificação." /> : null}
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
              <p className="text-xs text-slate-400">{formatTimeAgo(item.createdAt)}</p>
            </div>
            {!item.read ? (
              <Button variant="ghost" onClick={() => api.put(`/notifications/${item.id}/read`).then(load)}>
                Lida
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </RequireAuth>
  );
}
