'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, MessageCircle, Minus, Send, X } from 'lucide-react';
import type { PublicUser } from '@resenhometro/shared';
import { api } from '@/lib/api';
import {
  appendMessage,
  conversationsFromPeople,
  fallbackConversations,
  formatChatTime,
  mockReply,
  previewText,
  sortConversations,
  totalUnread,
  type ChatConversation,
} from '@/lib/chatMock';
import { Avatar } from './Avatar';

type ChatMode = 'closed' | 'minimized' | 'open';

type ChatContextValue = {
  mode: ChatMode;
  open: () => void;
  minimize: () => void;
  close: () => void;
  unread: number;
  isDesktop: boolean;
  hydrated: boolean;
  active: ChatConversation | null;
  conversations: ChatConversation[];
  activeId: string | null;
  selectConversation: (id: string) => void;
  backToList: () => void;
  send: (id: string, text: string) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);
    const onChange = () => setMatches(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    return {
      mode: 'closed' as ChatMode,
      open: () => undefined,
      minimize: () => undefined,
      close: () => undefined,
      unread: 0,
      isDesktop: false,
      hydrated: false,
      active: null,
      conversations: [] as ChatConversation[],
      activeId: null as string | null,
      selectConversation: () => undefined,
      backToList: () => undefined,
      send: () => undefined,
    };
  }
  return ctx;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 1280px)');
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<ChatMode>('closed');
  const [conversations, setConversations] = useState<ChatConversation[]>(fallbackConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const userTouched = useRef(false);
  const openedDesktop = useRef(false);
  const replyTimers = useRef<number[]>([]);
  const activeIdRef = useRef(activeId);
  const modeRef = useRef(mode);
  activeIdRef.current = activeId;
  modeRef.current = mode;

  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (hydrated && isDesktop && !openedDesktop.current && !userTouched.current) {
      openedDesktop.current = true;
      setMode('open');
    }
  }, [hydrated, isDesktop]);

  useEffect(() => {
    let cancelled = false;
    api
      .get<PublicUser[]>('/friends')
      .then(({ data }) => {
        if (cancelled || userTouched.current || data.length === 0) return;
        setConversations(sortConversations(conversationsFromPeople(data)));
      })
      .catch(() => {
        /* in-memory mock remains — no chat API yet */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const timers = replyTimers.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  const open = useCallback(() => {
    userTouched.current = true;
    setMode('open');
  }, []);

  const minimize = useCallback(() => {
    userTouched.current = true;
    setMode('minimized');
  }, []);

  const close = useCallback(() => {
    userTouched.current = true;
    setActiveId(null);
    setMode('closed');
  }, []);

  const selectConversation = useCallback((id: string) => {
    setActiveId(id);
    setConversations((current) => current.map((item) => (item.id === id ? { ...item, unread: 0 } : item)));
    setMode('open');
  }, []);

  const backToList = useCallback(() => setActiveId(null), []);

  const send = useCallback((conversationId: string, text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    userTouched.current = true;
    setConversations((current) =>
      sortConversations(current.map((item) => (item.id === conversationId ? appendMessage(item, trimmed, true) : item))),
    );
    const timer = window.setTimeout(() => {
      setConversations((current) =>
        sortConversations(
          current.map((item) => {
            if (item.id !== conversationId) return item;
            const next = appendMessage(item, mockReply(trimmed), false);
            const viewing = modeRef.current === 'open' && activeIdRef.current === conversationId;
            return { ...next, unread: viewing ? 0 : next.unread };
          }),
        ),
      );
    }, 900);
    replyTimers.current.push(timer);
  }, []);

  const unread = totalUnread(conversations);
  const active = conversations.find((item) => item.id === activeId) ?? null;

  const value = useMemo(
    () => ({
      mode,
      open,
      minimize,
      close,
      unread,
      isDesktop,
      hydrated,
      active,
      conversations,
      activeId,
      selectConversation,
      backToList,
      send,
    }),
    [mode, open, minimize, close, unread, isDesktop, hydrated, active, conversations, activeId, selectConversation, backToList, send],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function ChatHeaderButton() {
  const { open, unread, mode } = useChat();
  return (
    <button
      type="button"
      className="icon-btn relative"
      onClick={open}
      aria-label={unread > 0 ? `Conversas, ${unread} não lidas` : 'Conversas'}
      aria-pressed={mode === 'open'}
    >
      <MessageCircle size={20} strokeWidth={2} aria-hidden />
      {unread > 0 ? <span className="chat-badge chat-badge--header">{unread > 9 ? '9+' : unread}</span> : null}
    </button>
  );
}

export function ChatDock() {
  const { mode, hydrated, isDesktop, open, close, unread, active } = useChat();
  if (!hydrated || !isDesktop || mode === 'open') return null;

  if (mode === 'minimized') {
    return (
      <div className="card flex items-center gap-1 p-1.5">
        <button type="button" onClick={open} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-[var(--radius-md)] px-2 text-left hover:bg-overlay">
          {active ? <Avatar src={active.person.avatar} name={active.person.name} size="sm" online={active.person.online} /> : <MessageCircle size={18} strokeWidth={2} className="text-muted" aria-hidden />}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-fg">{active?.person.name ?? 'Conversas'}</span>
          {unread > 0 ? <span className="chat-count">{unread > 9 ? '9+' : unread}</span> : null}
        </button>
        <button type="button" className="icon-btn" onClick={close} aria-label="Fechar conversas">
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={open} className="card flex w-full min-h-11 items-center gap-3 p-4 text-left hover:border-[color-mix(in_srgb,var(--accent-cool)_28%,var(--border))]">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--primary)]">
        <MessageCircle size={20} strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">Conversas</span>
        <span className="block text-xs text-muted">Abra o chat ao lado do feed</span>
      </span>
      {unread > 0 ? <span className="chat-count">{unread > 9 ? '9+' : unread}</span> : null}
    </button>
  );
}

export function ChatColumn() {
  const { mode, hydrated, isDesktop } = useChat();
  const reduce = useReducedMotion() === true;
  if (!hydrated || !isDesktop || mode !== 'open') return null;

  return (
    <motion.div
      className="chat-panel xl:sticky xl:top-[4.75rem] xl:h-[calc(100dvh-6rem)]"
      initial={reduce ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: reduce ? 0 : 0.22 }}
    >
      <ChatFrame variant="column" />
    </motion.div>
  );
}

export function ChatMobile() {
  const { mode, hydrated, isDesktop, open, unread } = useChat();
  const reduce = useReducedMotion() === true;

  useEffect(() => {
    if (!hydrated || isDesktop || mode !== 'open') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [hydrated, isDesktop, mode]);

  if (!hydrated || isDesktop) return null;

  return (
    <>
      {mode === 'open' ? null : (
        <button type="button" className="chat-fab" onClick={open} aria-label={unread > 0 ? `Conversas, ${unread} não lidas` : 'Abrir conversas'}>
          <MessageCircle size={22} strokeWidth={2} aria-hidden />
          {unread > 0 ? <span className="chat-badge">{unread > 9 ? '9+' : unread}</span> : null}
        </button>
      )}
      <AnimatePresence>
        {mode === 'open' ? (
          <motion.div
            key="chat-sheet"
            className="chat-sheet"
            role="dialog"
            aria-modal="true"
            aria-label="Conversas"
            initial={reduce ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: '100%' }}
            transition={{ duration: reduce ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChatFrame variant="sheet" />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function ChatFrame({ variant }: { variant: 'column' | 'sheet' }) {
  const { conversations, activeId, selectConversation, backToList, send, close, minimize, active } = useChat();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (activeId) backToList();
      else close();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeId, backToList, close]);

  return (
    <div className={`flex h-full min-h-0 flex-col ${variant === 'sheet' ? 'chat-sheet-inner' : ''}`}>
      <div className="flex min-h-11 items-center gap-1 border-b border-line px-2 py-1.5">
        {active ? (
          <button type="button" className="icon-btn" onClick={backToList} aria-label="Voltar para conversas">
            <ChevronLeft size={20} strokeWidth={2} aria-hidden />
          </button>
        ) : null}
        <div className="min-w-0 flex-1 px-1">
          {active ? (
            <div className="flex items-center gap-2">
              <Avatar src={active.person.avatar} name={active.person.name} size="sm" online={active.person.online} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg">{active.person.name}</p>
                <p className="text-xs text-muted">{active.person.online ? 'Online' : 'Offline'}</p>
              </div>
            </div>
          ) : (
            <p className="px-2 text-sm font-semibold text-fg">Conversas</p>
          )}
        </div>
        <button type="button" className="icon-btn" onClick={minimize} aria-label="Minimizar conversas">
          <Minus size={18} strokeWidth={2} aria-hidden />
        </button>
        <button type="button" className="icon-btn" onClick={close} aria-label="Fechar conversas">
          <X size={18} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {active ? <ChatThread conversation={active} onSend={(text) => send(active.id, text)} /> : <ChatList conversations={conversations} onSelect={selectConversation} />}
    </div>
  );
}

function ChatList({ conversations, onSelect }: { conversations: ChatConversation[]; onSelect: (id: string) => void }) {
  if (conversations.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--primary)]">
          <MessageCircle size={26} strokeWidth={2} aria-hidden />
        </span>
        <p className="text-sm font-semibold text-fg">Nenhuma conversa ainda</p>
        <p className="text-xs text-muted">Quando a galera chegar, as mensagens aparecem aqui.</p>
      </div>
    );
  }

  return (
    <ul className="min-h-0 flex-1 overflow-y-auto p-1.5">
      {conversations.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            onClick={() => onSelect(item.id)}
            className="chat-row"
          >
            <Avatar src={item.person.avatar} name={item.person.name} size="sm" online={item.person.online} />
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-semibold text-fg">{item.person.name}</span>
                <time className="shrink-0 text-[11px] text-muted" dateTime={item.messages.at(-1)?.createdAt}>
                  {formatChatTime(item.messages.at(-1)?.createdAt ?? '')}
                </time>
              </span>
              <span className="flex items-center gap-2">
                <span className="truncate text-xs text-muted">{previewText(item)}</span>
                {item.unread > 0 ? <span className="chat-count">{item.unread > 9 ? '9+' : item.unread}</span> : null}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function ChatThread({ conversation, onSend }: { conversation: ChatConversation; onSend: (text: string) => void }) {
  const [text, setText] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reduce = useReducedMotion() === true;

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversation.id]);

  useEffect(() => {
    const node = listRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [conversation.messages.length]);

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <>
      <ul ref={listRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3" aria-live="polite">
        {conversation.messages.length === 0 ? (
          <li className="m-auto max-w-[16rem] py-8 text-center">
            <p className="text-sm font-semibold text-fg">Comece a conversa</p>
            <p className="mt-1 text-xs text-muted">Manda um oi e marca o próximo rolê.</p>
          </li>
        ) : (
          conversation.messages.map((message) => (
            <motion.li
              key={message.id}
              layout={!reduce}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reduce ? 0 : 0.18 }}
              className={`flex flex-col ${message.fromMe ? 'items-end' : 'items-start'}`}
            >
              <p className={`chat-bubble ${message.fromMe ? 'chat-bubble--me' : 'chat-bubble--them'}`}>{message.text}</p>
              <time className="mt-0.5 px-1 text-[10px] text-muted" dateTime={message.createdAt}>
                {formatChatTime(message.createdAt)}
              </time>
            </motion.li>
          ))
        )}
      </ul>
      <form onSubmit={submit} className="flex items-end gap-2 border-t border-line p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        <label className="sr-only" htmlFor={`chat-input-${conversation.id}`}>
          Mensagem
        </label>
        <input
          ref={inputRef}
          id={`chat-input-${conversation.id}`}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Escreva uma mensagem"
          autoComplete="off"
          className="input composer min-h-11 flex-1 rounded-full"
        />
        <button type="submit" className="icon-btn bg-[var(--primary)] text-[var(--paper)] hover:bg-[var(--primary-hover)] hover:text-[var(--paper)]" aria-label="Enviar" disabled={!text.trim()}>
          <Send size={18} strokeWidth={2} aria-hidden />
        </button>
      </form>
    </>
  );
}
