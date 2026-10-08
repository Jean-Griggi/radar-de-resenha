'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import type { PublicUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Input } from '@/components/Field';
import { Skeleton } from '@/components/Card';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { IMAGE_ACCEPT, postFile, shrinkImage } from '@/lib/upload';
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
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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

  function pickPhoto(file: File) {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return { file, url: URL.createObjectURL(file) };
    });
  }

  function dropPhoto() {
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = text.trim();
    if ((!content && !photo) || sending) return;
    setSending(true);
    try {
      let data: ChatMessage;
      if (photo) {
        const small = await shrinkImage(photo.file, 1600);
        data = await postFile<ChatMessage>(`/chat/${username}/image`, 'chat', small, { content });
        dropPhoto();
      } else {
        ({ data } = await api.post<ChatMessage>(`/chat/${username}/messages`, { content }));
      }
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
                {message.image ? (
                  <a href={message.image} target="_blank" rel="noreferrer">
                    <img src={message.image} alt="Foto enviada na conversa" className="mb-1 max-h-72 w-full rounded-xl object-cover" />
                  </a>
                ) : null}
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

      {photo ? (
        <div className="mt-3 flex items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-2">
          <img src={photo.url} alt="Prévia da foto a enviar" className="h-16 w-16 rounded-lg object-cover" />
          <p className="min-w-0 flex-1 truncate text-sm text-muted">{photo.file.name}</p>
          <button type="button" className="icon-btn" aria-label="Tirar a foto" onClick={dropPhoto}>
            <X size={18} aria-hidden />
          </button>
        </div>
      ) : null}

      <form onSubmit={send} className="mt-3 flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickPhoto(file);
            e.target.value = '';
          }}
        />
        <button type="button" className="icon-btn" aria-label="Enviar foto" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={20} aria-hidden />
        </button>
        <Input
          value={text}
          maxLength={MESSAGE_MAX}
          placeholder={photo ? 'Legenda (opcional)' : 'Escreva uma mensagem'}
          aria-label="Mensagem"
          onChange={(e) => setText(e.target.value)}
        />
        <Button type="submit" disabled={sending || (!text.trim() && !photo)}>
          Enviar
        </Button>
      </form>
    </div>
  );
}
