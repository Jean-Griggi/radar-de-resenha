'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { PublicUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { api, isApiCanceled } from '@/lib/api';
import { formatTimeAgo } from '@/lib/format';
import type { ChatMessage } from './types';

type Conversation = { user: PublicUser; last: ChatMessage; unread: number };

const SHOWN = 4;
const REFRESH_MS = 20_000;

/** Atalho das mensagens no feed: últimas conversas, quantas não lidas e o caminho para todas. */
export function ChatPreview() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const { data } = await api.get<Conversation[]>('/chat/conversations', { signal: controller.signal });
        if (!controller.signal.aborted) setConversations(data);
      } catch (err) {
        if (!isApiCanceled(err) && !controller.signal.aborted) setConversations((current) => current ?? []);
      }
    }

    void load();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, REFRESH_MS);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, []);

  if (conversations === null) return null;

  const unread = conversations.reduce((sum, item) => sum + item.unread, 0);

  return (
    <section className="card p-4" aria-label="Mensagens">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h2 className="text-lg font-medium">
          Mensagens
          {unread > 0 ? (
            <span className="ml-2 rounded-full bg-[var(--primary)] px-2 py-0.5 align-middle text-xs font-bold text-[var(--paper)]">
              {unread > 9 ? '9+' : unread}
            </span>
          ) : null}
        </h2>
        <Link href="/chat" className="text-sm font-medium text-[var(--accent)] hover:underline">
          {conversations.length > SHOWN ? 'Ver todas' : 'Abrir mensagens'}
        </Link>
      </div>

      {conversations.length === 0 ? (
        <p className="text-sm text-muted">
          Nenhuma conversa ainda.{' '}
          <Link href="/chat" className="text-[var(--accent)] hover:underline">
            Comece uma agora
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {conversations.slice(0, SHOWN).map(({ user, last, unread: count }) => (
            <li key={user.id}>
              <Link href={`/chat/${user.username}`} className="flex items-center gap-3 py-2 hover:bg-[var(--overlay)]">
                <Avatar src={user.avatar} name={user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{user.name}</p>
                  <p className={`truncate text-xs ${count > 0 ? 'font-medium text-fg' : 'text-muted'}`}>
                    {last.senderId === user.id ? '' : 'Você: '}
                    {last.content}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">{formatTimeAgo(last.createdAt)}</span>
                {count > 0 ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--primary)]" aria-label={`${count} não lidas`} /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
