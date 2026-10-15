'use client';

import Link from 'next/link';
import { Camera, CircleAlert, Plus } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { PublicUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';
import { EmptyState, Skeleton } from '@/components/Card';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatChatTime, plural } from '@/lib/format';
import type { ChatMessage } from './types';

type Conversation = { user: PublicUser; last: ChatMessage; unread: number };

export function ChatListScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [found, setFound] = useState<PublicUser[] | null>(null);
  const [searching, setSearching] = useState(false);

  async function searchPeople(event: FormEvent) {
    event.preventDefault();
    const term = q.trim();
    if (term.length < 2) return;
    setSearching(true);
    try {
      const { data } = await api.get<{ people: PublicUser[] }>('/search', { params: { q: term } });
      const meId = getUser()?.id;
      setFound(data.people.filter((person) => person.id !== meId));
    } catch (err) {
      if (!isApiCanceled(err)) setFound([]);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    const config = { signal: controller.signal };
    Promise.all([
      api.get<Conversation[]>('/chat/conversations', config),
      api.get<PublicUser[]>('/friends', config),
    ])
      .then(([chats, friendList]) => {
        setConversations(chats.data);
        setFriends(friendList.data);
        setError('');
      })
      .catch((err) => {
        if (!isApiCanceled(err))
          setError(apiErrorMessage(err, 'Não foi possível abrir as mensagens'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const talking = new Set(conversations.map((item) => item.user.id));
  const newChats = friends.filter((friend) => !talking.has(friend.id));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">Mensagens</h1>
      <form onSubmit={searchPeople} className="flex gap-2">
        <Input
          value={q}
          placeholder="Procurar uma pessoa para conversar"
          aria-label="Procurar pessoa"
          onChange={(e) => setQ(e.target.value)}
        />
        <Button type="submit" variant="secondary" disabled={searching || q.trim().length < 2}>
          {searching ? 'Buscando…' : 'Buscar'}
        </Button>
      </form>
      {found ? (
        found.length === 0 ? (
          <p className="text-sm text-muted">Ninguém encontrado.</p>
        ) : (
          <ul
            className="card divide-y divide-[var(--k-line)] overflow-hidden"
            aria-label="Pessoas encontradas"
          >
            {found.map((person) => (
              <li key={person.id}>
                <Link
                  href={`/chat/${person.username}`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[color-mix(in_srgb,var(--k-text)_5%,transparent)]"
                >
                  <Avatar src={person.avatar} name={person.name} size="sm" />
                  <span className="min-w-0 truncate">
                    {person.name} <span className="text-muted">@{person.username}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )
      ) : null}
      {loading ? (
        <div className="k-chat-list" aria-busy="true">
          {[0, 1, 2].map((item) => (
            <div key={item} className="k-chat-row__skeleton">
              <Skeleton variant="dot" className="h-10 w-10" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton variant="line" className="w-1/2" />
                <Skeleton variant="line" />
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="k-msg k-msg--error">
          <CircleAlert size={20} aria-hidden />
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          {conversations.length === 0 ? (
            <EmptyState
              title="Ninguém chegou ainda."
              description="Procure uma pessoa acima ou escolha um amigo abaixo para começar."
            />
          ) : (
            <ul className="k-chat-list" aria-label="Conversas">
              {conversations.map(({ user, last, unread }) => {
                const when = formatChatTime(last.createdAt);
                const label = `Conversa com ${user.name}${unread > 0 ? `, ${plural(unread, 'não lida', 'não lidas')}` : ''}, última mensagem ${when}`;
                return (
                  <li key={user.id}>
                    <details name="chat-lista" className="k-chat-row">
                      <summary aria-label={label}>
                        <Avatar src={user.avatar} name={user.name} size="sm" />
                        <span className="k-chat-row__main">
                          <span className="k-chat-row__name">
                            {unread > 0 ? <span className="k-chat-row__dot" aria-hidden /> : null}
                            <span
                              className={`k-display k-chat-row__title${unread > 0 ? ' k-chat-row__title--unread' : ''}`}
                            >
                              {user.name}
                            </span>
                          </span>
                          <span className="k-chat-row__last">
                            {last.senderId === user.id ? '' : 'Você: '}
                            {last.content || (
                              <>
                                <Camera size={14} aria-hidden /> Foto
                              </>
                            )}
                          </span>
                        </span>
                        <span className="k-chat-row__side">
                          <span className="k-meta">{when}</span>
                          {unread > 0 ? (
                            <span className="k-meta k-chat-row__count">
                              {unread > 9 ? '9+' : unread}
                            </span>
                          ) : null}
                        </span>
                        <Plus size={20} className="k-chat-plus" aria-hidden />
                      </summary>
                      <div className="k-chat-row__body">
                        <p className="k-meta">{last.senderId === user.id ? user.name : 'Você'}</p>
                        <p className="k-chat-row__text">
                          {last.content || (
                            <>
                              <Camera size={16} aria-hidden /> Foto
                            </>
                          )}
                        </p>
                        <Link
                          href={`/chat/${user.username}`}
                          className="button button--primary k-chat-row__open"
                        >
                          Abrir conversa
                        </Link>
                      </div>
                    </details>
                  </li>
                );
              })}
            </ul>
          )}

          {newChats.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Começar uma conversa</h2>
              <ul className="flex flex-wrap gap-2">
                {newChats.map((friend) => (
                  <li key={friend.id}>
                    <Link
                      href={`/chat/${friend.username}`}
                      className="chip-tab inline-flex items-center gap-2"
                    >
                      <Avatar src={friend.avatar} name={friend.name} size="sm" />
                      {friend.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
