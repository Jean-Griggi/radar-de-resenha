'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Story, StoryRing, StoryViewer as StoryViewerUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';

export function StoryPhone({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <span className="absolute -left-[3px] top-[22%] h-8 w-[3px] rounded-l-sm bg-zinc-600" />
      <span className="absolute -left-[3px] top-[32%] h-12 w-[3px] rounded-l-sm bg-zinc-600" />
      <span className="absolute -right-[3px] top-[28%] h-16 w-[3px] rounded-r-sm bg-zinc-600" />
      <div className="story-phone relative overflow-hidden rounded-[2.35rem] border-[9px] border-zinc-800 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/15">
        <span className="absolute left-1/2 top-2 z-30 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-zinc-950" />
        <div className="absolute inset-0 overflow-hidden rounded-[1.75rem]">{children}</div>
        <span className="pointer-events-none absolute bottom-2 left-1/2 z-30 h-1 w-[108px] -translate-x-1/2 rounded-full bg-white/40" />
      </div>
    </div>
  );
}

const PHOTO_MS = 5000;

export function StoryViewer({
  rings,
  startRing,
  startStory,
  meId,
  onClose,
  onViewed,
  onDeleted,
}: {
  rings: StoryRing[];
  startRing: number;
  startStory: number;
  meId: string;
  onClose: () => void;
  onViewed: (storyId: string) => void;
  onDeleted: (storyId: string) => void;
}) {
  const playable = rings.filter((ring) => ring.stories.length > 0);
  const [ringIndex, setRingIndex] = useState(() => Math.min(startRing, Math.max(0, playable.length - 1)));
  const [storyIndex, setStoryIndex] = useState(startStory);
  const [paused, setPaused] = useState(false);
  const [holding, setHolding] = useState(false);
  const [composing, setComposing] = useState(false);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [viewers, setViewers] = useState<StoryViewerUser[] | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const marked = useRef<Set<string>>(new Set());
  const remainingRef = useRef(PHOTO_MS);
  const goRef = useRef<(delta: number) => void>(() => undefined);

  const ring = playable[ringIndex];
  const story: Story | undefined = ring?.stories[storyIndex];
  const isOwn = story?.authorId === meId;
  const frozen = paused || holding || composing || viewers !== null;

  function go(delta: number) {
    if (!ring) return;
    const nextStory = storyIndex + delta;
    if (nextStory >= 0 && nextStory < ring.stories.length) {
      setStoryIndex(nextStory);
      return;
    }
    const nextRing = ringIndex + delta;
    const next = playable[nextRing];
    if (next) {
      setRingIndex(nextRing);
      setStoryIndex(delta > 0 ? 0 : next.stories.length - 1);
      return;
    }
    if (delta > 0) onClose();
  }
  goRef.current = go;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!story) {
      onClose();
      return;
    }
    setReply('');
    setError('');
    setViewers(null);
    setVideoProgress(0);
    setHolding(false);
    if (marked.current.has(story.id)) return;
    marked.current.add(story.id);
    api
      .post(`/stories/${story.id}/view`)
      .then(() => onViewed(story.id))
      .catch(() => undefined);
  }, [story?.id]);

  useEffect(() => {
    remainingRef.current = PHOTO_MS;
  }, [story?.id]);

  useEffect(() => {
    if (!story || frozen || story.mediaType === 'video') return;
    const started = Date.now();
    const remaining = remainingRef.current;
    const timer = window.setTimeout(() => goRef.current(1), remaining);
    return () => {
      remainingRef.current = Math.max(0, remaining - (Date.now() - started));
      window.clearTimeout(timer);
    };
  }, [story?.id, frozen, story?.mediaType]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || story?.mediaType !== 'video') return;
    if (frozen) el.pause();
    else el.play().catch(() => undefined);
  }, [frozen, story?.id, story?.mediaType]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goRef.current(1);
      if (event.key === 'ArrowLeft') goRef.current(-1);
      if (event.key === ' ' && event.target instanceof HTMLElement && event.target.tagName !== 'INPUT') {
        event.preventDefault();
        setPaused((current) => !current);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    if (!story || !reply.trim()) return;
    setSending(true);
    try {
      await api.post(`/stories/${story.id}/reply`, { content: reply.trim() });
      setReply('');
      setError('');
    } catch (err) {
      if (!isApiCanceled(err)) setError(apiErrorMessage(err, 'Não foi possível responder'));
    } finally {
      setSending(false);
    }
  }

  async function remove() {
    if (!story) return;
    try {
      await api.delete(`/stories/${story.id}`);
      onDeleted(story.id);
    } catch (err) {
      if (!isApiCanceled(err)) setError(apiErrorMessage(err, 'Não foi possível apagar'));
    }
  }

  async function loadViewers() {
    if (!story) return;
    try {
      const { data } = await api.get<StoryViewerUser[]>(`/stories/${story.id}/viewers`);
      setViewers(data);
    } catch (err) {
      if (!isApiCanceled(err)) setError(apiErrorMessage(err, 'Não foi possível ver quem viu'));
    }
  }

  if (!story || !ring) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/90 p-3 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <StoryPhone>
          <div
            className="absolute inset-0 bg-zinc-900"
            onPointerDown={() => setHolding(true)}
            onPointerUp={() => setHolding(false)}
            onPointerCancel={() => setHolding(false)}
            onPointerLeave={() => setHolding(false)}
          >
            {story.mediaType === 'video' ? (
              <video
                ref={videoRef}
                key={story.id}
                src={story.url}
                className="h-full w-full object-cover object-center"
                autoPlay
                playsInline
                onEnded={() => goRef.current(1)}
                onTimeUpdate={(event) => {
                  const el = event.currentTarget;
                  if (el.duration) setVideoProgress(el.currentTime / el.duration);
                }}
              />
            ) : (
              <img
                src={story.url}
                alt={story.caption || 'Story'}
                className="h-full w-full object-cover object-center"
              />
            )}
            <button
              type="button"
              className="absolute inset-y-0 left-0 w-1/3"
              aria-label="Anterior"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 w-1/3"
              aria-label="Próximo"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
            />
            {paused ? (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 text-2xl text-white" aria-hidden>
                  ⏸
                </span>
              </div>
            ) : null}
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-3 pb-8 pt-9">
            <div className="flex gap-1">
              {ring.stories.map((item, index) => (
                <div key={item.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                  <div
                    key={`${item.id}-${index === storyIndex ? story.id : 'idle'}`}
                    className={`h-full bg-white ${
                      index < storyIndex ? 'w-full' : index > storyIndex ? 'w-0' : ''
                    }`}
                    style={
                      index === storyIndex
                        ? story.mediaType === 'video'
                          ? { width: `${videoProgress * 100}%` }
                          : {
                              width: '100%',
                              animation: `storybar ${PHOTO_MS}ms linear`,
                              animationPlayState: frozen ? 'paused' : 'running',
                            }
                        : undefined
                    }
                  />
                </div>
              ))}
            </div>
            <div className="pointer-events-auto mt-3 flex items-center gap-2">
              <Avatar src={story.author.avatar} name={story.author.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{story.author.name}</p>
                {story.caption ? <p className="truncate text-xs text-white/70">{story.caption}</p> : null}
              </div>
              {isOwn ? (
                <>
                  <button type="button" className="text-[11px] text-white/80" onClick={loadViewers}>
                    {story.viewCount ?? 0} viram
                  </button>
                  <button type="button" className="text-[11px] text-rose-300" onClick={remove}>
                    Apagar
                  </button>
                </>
              ) : null}
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center text-lg text-white"
                aria-label={paused ? 'Continuar story' : 'Pausar story'}
                aria-pressed={paused}
                onClick={() => setPaused((current) => !current)}
              >
                {paused ? '▶' : '⏸'}
              </button>
              <button type="button" className="flex h-11 w-11 items-center justify-center text-white" onClick={onClose} aria-label="Fechar">
                ✕
              </button>
            </div>
          </div>

          {!isOwn ? (
            <form
              onSubmit={sendReply}
              className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-7 pt-10"
              onPointerDown={(event) => event.stopPropagation()}
            >
              <div className="flex gap-2">
                <input
                  value={reply}
                  onChange={(event) => setReply(event.target.value)}
                  onFocus={() => setComposing(true)}
                  onBlur={() => setComposing(false)}
                  placeholder="Responder…"
                  maxLength={280}
                  className="min-w-0 flex-1 rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white outline-none"
                />
                <button
                  type="submit"
                  disabled={sending || !reply.trim()}
                  className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
                >
                  Enviar
                </button>
              </div>
              {error ? <p className="mt-2 text-xs text-rose-300">{error}</p> : null}
            </form>
          ) : error ? (
            <p className="absolute inset-x-0 bottom-8 text-center text-xs text-rose-300">{error}</p>
          ) : null}

          {viewers ? (
            <div className="absolute inset-x-0 bottom-0 max-h-[55%] overflow-y-auto rounded-t-2xl bg-zinc-950/95 p-4 pb-8">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-white">Quem viu</p>
                <button type="button" className="text-xs text-white/70" onClick={() => setViewers(null)}>
                  Fechar
                </button>
              </div>
              {viewers.length === 0 ? <p className="text-sm text-white/60">Ninguém ainda.</p> : null}
              <ul className="space-y-3">
                {viewers.map((item) => (
                  <li key={item.user.id} className="flex items-center gap-3">
                    <Avatar src={item.user.avatar} name={item.user.name} size="sm" />
                    <span className="text-sm text-white">{item.user.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </StoryPhone>
      </div>
    </div>
  );
}
