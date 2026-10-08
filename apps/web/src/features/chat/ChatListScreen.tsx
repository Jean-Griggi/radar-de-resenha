'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { EmptyState, Skeleton } from '@/components/Card';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { formatTimeAgo } from '@/lib/format';
import type { ChatMessage } from './types';

type Conversation = { user: PublicUser; last: ChatMessage; unread: number };

export function ChatListScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [friends, setFriends] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const config = { signal: controller.signal };
    Promise.all([api.get<Conversation[]>('/chat/conversations', config), api.get<PublicUser[]>('/friends', config)])
      .then(([chats, friendList]) => {
        setConversations(chats.data);
        setFriends(friendList.data);
        setError('');
      })
      .catch((err) => {
        if (!isApiCanceled(err)) setError(apiErrorMessage(err, 'Não foi possível abrir as mensagens'));
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
      {loading ? <Skeleton className="h-40" /> : null}
      {error ? <p className="text-[var(--danger)]">{error}</p> : null}

      {!loading && !error ? (
        <>
          {conversations.length === 0 ? (
            <EmptyState
              title="Nenhuma conversa ainda"
              description={friends.length === 0 ? 'Adicione amigos para conversar com eles.' : 'Escolha um amigo abaixo para começar.'}
            />
          ) : (
            <ul className="card divide-y divide-[var(--border)] overflow-hidden">
              {conversations.map(({ user, last, unread }) => (
                <li key={user.id}>
                  <Link href={`/chat/${user.username}`} className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--overlay)]">
                    <Avatar src={user.avatar} name={user.name} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate font-medium">{user.name}</p>
                        <span className="shrink-0 text-xs text-muted">{formatTimeAgo(last.createdAt)}</span>
                      </div>
                      <p className={`truncate text-sm ${unread > 0 ? 'font-medium text-fg' : 'text-muted'}`}>
                        {last.senderId === user.id ? '' : 'Você: '}
                        {last.content}
                      </p>
                    </div>
                    {unread > 0 ? (
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[var(--primary)] px-1.5 text-xs font-bold text-[var(--paper)]">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {newChats.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Começar uma conversa</h2>
              <ul className="flex flex-wrap gap-2">
                {newChats.map((friend) => (
                  <li key={friend.id}>
                    <Link href={`/chat/${friend.username}`} className="chip-tab inline-flex items-center gap-2">
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
