'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Friendship, PublicUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';

export default function FriendsPage() {
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [suggestions, setSuggestions] = useState<PublicUser[]>([]);

  async function load() {
    const [f, r, s] = await Promise.all([
      api.get<PublicUser[]>('/friends'),
      api.get<Friendship[]>('/friends/requests'),
      api.get<PublicUser[]>('/suggestions'),
    ]);
    setFriends(f.data);
    setRequests(r.data);
    setSuggestions(s.data);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <RequireAuth>
      <h1 className="mb-6 text-3xl font-semibold">Amigos</h1>
      <section className="card mb-5 p-5">
        <h2 className="mb-3 font-medium">Pedidos</h2>
        {requests.length === 0 ? <p className="text-sm text-slate-400">Nenhum pedido pendente.</p> : null}
        <ul className="space-y-3">
          {requests.map((item) => (
            <li key={item.id} className="flex items-center justify-between">
              <Link href={`/perfil/${item.requester?.username}`} className="flex items-center gap-2">
                <Avatar src={item.requester?.avatar} name={item.requester?.name} size="sm" />
                {item.requester?.name}
              </Link>
              <div className="flex gap-2">
                <Button onClick={() => api.put(`/friends/requests/${item.id}`, { status: 'accepted' }).then(load)}>Aceitar</Button>
                <Button variant="secondary" onClick={() => api.put(`/friends/requests/${item.id}`, { status: 'rejected' }).then(load)}>
                  Recusar
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="card mb-5 p-5">
        <h2 className="mb-3 font-medium">Sua galera</h2>
        {friends.length === 0 ? <EmptyState title="Você ainda não tem amigos." /> : null}
        <ul className="grid gap-3 sm:grid-cols-2">
          {friends.map((person) => (
            <li key={person.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <Link href={`/perfil/${person.username}`} className="flex items-center gap-2">
                <Avatar src={person.avatar} name={person.name} size="sm" />
                <span>
                  {person.name}
                  <span className="block text-xs text-slate-400">@{person.username}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      <section className="card p-5">
        <h2 className="mb-3 font-medium">Sugestões</h2>
        <ul className="space-y-3">
          {suggestions.map((person) => (
            <li key={person.id} className="flex items-center justify-between">
              <Link href={`/perfil/${person.username}`} className="flex items-center gap-2">
                <Avatar src={person.avatar} name={person.name} size="sm" />
                {person.name}
              </Link>
              <Button variant="secondary" onClick={() => api.post('/friends/requests', { userId: person.id }).then(load)}>
                Adicionar
              </Button>
            </li>
          ))}
        </ul>
      </section>
    </RequireAuth>
  );
}
