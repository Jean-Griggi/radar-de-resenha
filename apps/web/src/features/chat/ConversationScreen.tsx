'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import type { PublicUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';
import { Skeleton } from '@/components/Card';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import type { ChatMessage } from './types';

const POLL_MS = 4000;
const MESSAGE_MAX = 1000;

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Conversa 1 a 1. Sem WebSocket (a API roda em serverless): a tela pergunta por mensagens novas a cada
 * 4 s enquanto a aba está visível, usando `after` para trazer só o que chegou depois da última.
 */
export function ConversationScreen() {
  const { username } = useParams<{ username: string }>();
  const [peer, setPeer] = useState<PublicUser | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const lastRef = useRef<string | undefined>(undefined);
  const endRef = useRef<HTMLDivElement>(null);

  const merge = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((current) => {
      const known = new Set(current.map((item) => item.id));
      const fresh = incoming.filter((item) => !known.has(item.id));
      return fresh.length === 0 ? current : [...current, ...fresh];
    });
    lastRef.current = incoming[incoming.length - 1]!.createdAt;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setMessages([]);
    lastRef.current = undefined;

    async function pull(first: boolean) {
      try {
        const { data } = await api.get<{ user: PublicUser | null; messages: ChatMessage[] }>(
          `/chat/${username}/messages`,
          { signal: controller.signal, params: lastRef.current ? { after: lastRef.current } : undefined },
        );
        if (controller.signal.aborted) return;
        if (data.user) setPeer(data.user);
        merge(data.messages);
        setError('');
      } catch (err) {
        if (isApiCanceled(err) || controller.signal.aborted) return;
        if (first) setError(apiErrorMessage(err, 'Não foi possível abrir a conversa'));
      } finally {
        if (first && !controller.signal.aborted) setLoading(false);
      }
    }

    void pull(true);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void pull(false);
    }, POLL_MS);

    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [username, merge]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const { data } = await api.post<ChatMessage>(`/chat/${username}/messages`, { content });
      merge([data]);
      setText('');
      setError('');
    } catch (err) {
      if (!isApiCanceled(err)) setError(apiErrorMessage(err, 'Não foi possível enviar'));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col">
      <div className="mb-3 flex items-center gap-3">
        <Link href="/chat" className="icon-btn" aria-label="Voltar para as mensagens">
          ←
        </Link>
        {peer ? (
          <Link href={`/perfil/${peer.username}`} className="flex min-w-0 items-center gap-3">
            <Avatar src={peer.avatar} name={peer.name} />
            <div className="min-w-0">
              <p className="truncate font-semibold">{peer.name}</p>
              <p className="truncate text-sm text-muted">@{peer.username}</p>
            </div>
          </Link>
        ) : (
          <p className="font-semibold">@{username}</p>
        )}
      </div>

      <div className="card flex h-[60vh] flex-col gap-2 overflow-y-auto p-4" aria-live="polite">
        {loading ? <Skeleton className="h-16" /> : null}
        {!loading && messages.length === 0 && !error ? (
          <p className="m-auto text-sm text-muted">Nenhuma mensagem ainda. Diga oi!</p>
        ) : null}
        {messages.map((message) => {
          const mine = message.senderId !== peer?.id;
          return (
            <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${
                  mine ? 'bg-[var(--primary)] text-[var(--paper)]' : 'bg-[var(--secondary)] text-fg'
                }`}
              >
                {message.content}
                <span className={`mt-1 block text-right text-[11px] ${mine ? 'text-white/70' : 'text-muted'}`}>
                  {timeLabel(message.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <Input
          value={text}
          maxLength={MESSAGE_MAX}
          placeholder="Escreva uma mensagem"
          aria-label="Mensagem"
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" disabled={sending || !text.trim()}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
