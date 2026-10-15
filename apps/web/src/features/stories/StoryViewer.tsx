'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Story, StoryRing, StoryViewer as StoryViewerUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { MusicCard } from '@/features/music';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { formatTimeAgo } from '@/lib/format';

/** Palco em tela cheia, sem moldura. O fundo e o texto usam --k-stage-* nos dois temas. */
export function StoryPhone({ children }: { children: ReactNode }) {
  return <div className="k-stage">{children}</div>;
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
  const [musicOpen, setMusicOpen] = useState(false);
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
  const frozen = paused || holding || composing || musicOpen || viewers !== null;

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
    setMusicOpen(false);
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
    <StoryPhone>
      <div
        className="k-stage__media"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
          <div
            className="absolute inset-0"
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
                <span className="k-stage__pause" aria-hidden>
                  ⏸
                </span>
              </div>
            ) : null}
          </div>

          <div className="k-stage__chrome pointer-events-none">
            <div className="k-stage__bars">
              {ring.stories.map((item, index) => (
                <div key={item.id} className="k-stage__bar">
                  <i
                    key={`${item.id}-${index === storyIndex ? story.id : 'idle'}`}
                    className={index < storyIndex ? 'w-full' : index > storyIndex ? 'w-0' : ''}
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
            <div className="k-stage__who pointer-events-auto">
              <Avatar src={story.author.avatar} name={story.author.name} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="k-meta truncate">
                  {story.author.name} · {formatTimeAgo(story.createdAt)}
                </p>
                {story.caption ? <p className="k-stage__caption truncate">{story.caption}</p> : null}
              </div>
              <div className="k-stage__actions">
                {isOwn ? (
                  <>
                    <button type="button" className="k-stage__textbtn" onClick={loadViewers}>
                      {story.viewCount ?? 0} viram
                    </button>
                    <button type="button" className="k-stage__textbtn k-stage__textbtn--danger" onClick={remove}>
                      Apagar
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="k-stage__icon"
                  aria-label={paused ? 'Continuar story' : 'Pausar story'}
                  aria-pressed={paused}
                  onClick={() => setPaused((current) => !current)}
                >
                  {paused ? '▶' : '⏸'}
                </button>
                <button type="button" className="k-stage__icon" onClick={onClose} aria-label="Fechar">
                  ✕
                </button>
              </div>
            </div>
            {story.music ? (
              <div className="pointer-events-auto mt-2" onPointerDown={(event) => event.stopPropagation()}>
                <MusicCard key={story.id} item={story.music} tone="story" inline onOpenChange={setMusicOpen} />
              </div>
            ) : null}
          </div>

          {!isOwn ? (
            <form
              onSubmit={sendReply}
              className="k-stage__reply"
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
                  className="k-stage__field min-w-0 flex-1"
                />
                <button type="submit" disabled={sending || !reply.trim()} className="button button--primary">
                  Enviar
                </button>
              </div>
              {error ? <p className="k-stage__error">{error}</p> : null}
            </form>
          ) : error ? (
            <p className="k-stage__error absolute inset-x-0 bottom-8 text-center">{error}</p>
          ) : null}

          {viewers ? (
            <div className="k-stage__sheet">
              <div className="mb-3 flex items-center justify-between">
                <p className="k-meta">Quem viu</p>
                <button type="button" className="k-stage__textbtn" onClick={() => setViewers(null)}>
                  Fechar
                </button>
              </div>
              {viewers.length === 0 ? <p>Ninguém ainda.</p> : null}
              <ul className="space-y-3">
                {viewers.map((item) => (
                  <li key={item.user.id} className="flex items-center gap-3">
                    <Avatar src={item.user.avatar} name={item.user.name} size="sm" />
                    <span>{item.user.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
      </div>
    </StoryPhone>
  );
}
