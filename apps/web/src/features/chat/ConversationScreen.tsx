'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, CircleAlert, ImagePlus, X } from 'lucide-react';
import type { PublicUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Card';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { IMAGE_ACCEPT, postFile, shrinkImage } from '@/lib/upload';
import { CHAT_CHANGED_EVENT } from './events';
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
  const [sendFailed, setSendFailed] = useState(false);
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef<string | undefined>(undefined);
  const firstScroll = useRef(true);
  const reasonId = useId();
  const fieldId = useId();

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
    firstScroll.current = true;

    async function pull(first: boolean) {
      try {
        const { data } = await api.get<{ user: PublicUser | null; messages: ChatMessage[] }>(
          `/chat/${username}/messages`,
          {
            signal: controller.signal,
            params: lastRef.current ? { after: lastRef.current } : undefined,
          },
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

  // Rola até o fim ao abrir e quando chega ou sai mensagem (sem animação com movimento reduzido).
  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    log.scrollTo({ top: log.scrollHeight, behavior: reduced || firstScroll.current ? 'auto' : 'smooth' });
    if (messages.length > 0) firstScroll.current = false;
  }, [messages.length, loading]);

  // Foco inicial no campo de envio.
  useEffect(() => {
    if (!loading) fieldRef.current?.focus({ preventScroll: true });
  }, [loading]);

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
      setSendFailed(false);
      // Avisa a lateral "Mensagens" (já montada) para refazer a consulta que ela já tem.
      window.dispatchEvent(new Event(CHAT_CHANGED_EVENT));
    } catch (err) {
      if (!isApiCanceled(err)) setSendFailed(true);
    } finally {
      setSending(false);
    }
  }

  const empty = !text.trim() && !photo;
  const peerName = peer?.name ?? username;

  return (
    <div className="k-conv">
      <header className="k-conv__head">
        <Link href="/chat" className="k-conv__back" aria-label="Voltar">
          <ArrowLeft size={20} aria-hidden />
        </Link>
        {peer ? (
          <Link href={`/perfil/${peer.username}`} className="k-conv__peer">
            <Avatar src={peer.avatar} name={peer.name} />
            <span className="k-conv__who">
              <span className="k-display k-conv__name">{peer.name}</span>
              <span className="k-meta">@{peer.username}</span>
            </span>
          </Link>
        ) : (
          <p className="k-conv__peer k-display k-conv__name">@{username}</p>
        )}
      </header>

      {/* Mensagens ancoradas embaixo; a única rolagem da tela é a desta lista. */}
      <div ref={logRef} role="log" aria-live="polite" aria-label="Mensagens" className="k-conv__log">
        {loading ? (
          <div className="k-conv__skeleton" aria-hidden>
            <Skeleton variant="dot" />
            <Skeleton variant="line" />
            <Skeleton variant="line" />
          </div>
        ) : null}
        {!loading && messages.length === 0 && !error ? (
          <p className="k-conv__empty">Mande a primeira mensagem.</p>
        ) : null}
        {messages.map((message, index) => {
          const mine = message.senderId !== peer?.id;
          const previous = messages[index - 1];
          const sameSender = previous ? (previous.senderId !== peer?.id) === mine : false;
          return (
            <div
              key={message.id}
              className={`k-bubble-row${mine ? ' k-bubble-row--mine' : ''}${sameSender ? ' k-bubble-row--same' : ''}`}
            >
              <div className={`k-bubble ${mine ? 'k-bubble--mine' : 'k-bubble--theirs'}`}>
                <span className="sr-only">{mine ? 'Você:' : `${peerName}:`}</span>
                {message.image ? (
                  <a href={message.image} target="_blank" rel="noreferrer">
                    <img
                      src={message.image}
                      alt="Foto enviada na conversa"
                      className="k-bubble__image"
                    />
                  </a>
                ) : null}
                {message.content ? <p className="k-bubble__text">{message.content}</p> : null}
                <span className="k-meta k-bubble__time">
                  {mine ? 'Você · ' : ''}
                  {timeLabel(message.createdAt)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="k-msg k-msg--error k-conv__alert">
          <CircleAlert size={16} aria-hidden />
          {error}
        </p>
      ) : null}
      {sendFailed ? (
        <p role="alert" className="k-msg k-msg--error k-conv__alert">
          <CircleAlert size={16} aria-hidden />
          Não enviou. Tente de novo.
        </p>
      ) : null}

      {photo ? (
        <div className="k-conv__photo">
          <img src={photo.url} alt="Prévia da foto a enviar" className="h-16 w-16 object-cover" />
          <p className="min-w-0 flex-1 truncate text-sm text-muted">{photo.file.name}</p>
          <button type="button" className="icon-btn" aria-label="Tirar a foto" onClick={dropPhoto}>
            <X size={18} aria-hidden />
          </button>
        </div>
      ) : null}

      <form onSubmit={send} className="k-conv__form">
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickPhoto(file);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="k-conv__attach"
          aria-label="Anexar foto"
          onClick={() => fileRef.current?.click()}
        >
          <ImagePlus size={20} aria-hidden />
        </button>
        <div className="k-conv__field">
          <label className="sr-only" htmlFor={fieldId}>
            Mensagem
          </label>
          <input
            id={fieldId}
            ref={fieldRef}
            className="input"
            value={text}
            maxLength={MESSAGE_MAX}
            placeholder={photo ? 'Legenda (opcional)' : 'Escreva uma mensagem'}
            aria-describedby={empty ? reasonId : undefined}
            onChange={(e) => setText(e.target.value)}
          />
        </div>
        {/* Sódio só com algo a enviar (é a ação principal); vazio = secundário, desabilitado e com o motivo em texto. */}
        <Button
          type="submit"
          variant={empty ? 'secondary' : 'primary'}
          disabled={sending || empty}
          aria-describedby={empty ? reasonId : undefined}
        >
          Enviar
        </Button>
        {empty ? (
          <p id={reasonId} className="k-reason k-conv__reason">
            Escreva uma mensagem.
          </p>
        ) : null}
      </form>
    </div>
  );
}
