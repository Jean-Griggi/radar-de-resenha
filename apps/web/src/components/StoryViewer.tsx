'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Story, StoryRing, StoryViewer as StoryViewerUser } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';

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
    if (!story || paused || story.mediaType === 'video') return;
    const started = Date.now();
    const remaining = remainingRef.current;
    const timer = window.setTimeout(() => goRef.current(1), remaining);
    return () => {
      remainingRef.current = Math.max(0, remaining - (Date.now() - started));
      window.clearTimeout(timer);
    };
  }, [story?.id, paused, story?.mediaType]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || story?.mediaType !== 'video') return;
    if (paused) el.pause();
    else el.play().catch(() => undefined);
  }, [paused, story?.id, story?.mediaType]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') goRef.current(1);
      if (event.key === 'ArrowLeft') goRef.current(-1);
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
    <div className="fixed inset-0 z-[90] bg-black">
      <div
        className="absolute inset-0"
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
      >
        {story.mediaType === 'video' ? (
          <video
            ref={videoRef}
            key={story.id}
            src={story.url}
            className="h-full w-full object-contain"
            autoPlay
            playsInline
            onEnded={() => goRef.current(1)}
            onTimeUpdate={(event) => {
              const el = event.currentTarget;
              if (el.duration) setVideoProgress(el.currentTime / el.duration);
            }}
          />
        ) : (
          <img src={story.url} alt={story.caption || 'Story'} className="h-full w-full object-contain" />
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
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-3">
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
                          width: paused ? undefined : '100%',
                          animation: `storybar ${PHOTO_MS}ms linear`,
                          animationPlayState: paused ? 'paused' : 'running',
                        }
                    : undefined
                }
              />
            </div>
          ))}
        </div>
        <div className="pointer-events-auto mt-3 flex items-center gap-3">
          <Avatar src={story.author.avatar} name={story.author.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{story.author.name}</p>
            {story.caption ? <p className="truncate text-xs text-white/70">{story.caption}</p> : null}
          </div>
          {isOwn ? (
            <>
              <button type="button" className="text-xs text-white/80" onClick={loadViewers}>
                {story.viewCount ?? 0} viram
              </button>
              <button type="button" className="text-xs text-rose-300" onClick={remove}>
                Apagar
              </button>
            </>
          ) : null}
          <button type="button" className="text-white" onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>
      </div>

      {!isOwn ? (
        <form
          onSubmit={sendReply}
          className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 pb-6"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="flex gap-2">
            <input
              value={reply}
              onChange={(event) => setReply(event.target.value)}
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
        <p className="absolute inset-x-0 bottom-6 text-center text-xs text-rose-300">{error}</p>
      ) : null}

      {viewers ? (
        <div className="absolute inset-x-0 bottom-0 max-h-[50%] overflow-y-auto rounded-t-2xl bg-zinc-950 p-4">
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
    </div>
  );
}
