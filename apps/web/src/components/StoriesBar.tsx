'use client';

import { useEffect, useRef, useState } from 'react';
import type { StoryRing } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { StoryViewer, StoryPhone } from '@/components/StoryViewer';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { STORY_ACCEPT, postFile } from '@/lib/upload';

type Draft = { file: File; preview: string; isVideo: boolean };

export function StoriesBar() {
  const toast = useToast();
  const me = getUser();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rings, setRings] = useState<StoryRing[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [caption, setCaption] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [viewer, setViewer] = useState<{ ring: number; story: number } | null>(null);

  async function load(signal?: AbortSignal) {
    const { data } = await api.get<StoryRing[]>('/stories', signal ? { signal } : undefined);
    setRings(data);
    return data;
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        const wanted = new URLSearchParams(window.location.search).get('story');
        if (!wanted) return;
        const playable = data.filter((ring) => ring.stories.length > 0);
        const ring = playable.findIndex((item) => item.stories.some((story) => story.id === wanted));
        const selected = playable[ring];
        if (!selected) return;
        const story = selected.stories.findIndex((item) => item.id === wanted);
        setViewer({ ring, story: Math.max(0, story) });
      })
      .catch((err) => {
        if (isApiCanceled(err)) return;
        toast.push(apiErrorMessage(err, 'Não foi possível carregar os stories'), 'error');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  function openRing(ring: StoryRing) {
    const playable = rings.filter((item) => item.stories.length > 0);
    const index = playable.findIndex((item) => item.author.id === ring.author.id);
    const target = playable[index];
    if (!target) return;
    const firstUnseen = target.stories.findIndex((story) => !story.viewed);
    setViewer({ ring: index, story: firstUnseen < 0 ? 0 : firstUnseen });
  }

  function pickFile(file: File | undefined) {
    if (!file) return;
    setDraft({
      file,
      preview: URL.createObjectURL(file),
      isVideo: file.type.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(file.name),
    });
    setCaption('');
  }

  async function publish() {
    if (!draft) return;
    setPublishing(true);
    try {
      await postFile('/stories', 'story', draft.file, { caption: caption.trim() || undefined });
      URL.revokeObjectURL(draft.preview);
      setDraft(null);
      toast.push('Story publicado');
      await load();
    } catch (err) {
      if (!isApiCanceled(err)) toast.push(apiErrorMessage(err, 'Falha ao publicar o story'), 'error');
    } finally {
      setPublishing(false);
    }
  }

  const playableRings = rings.filter((ring) => ring.stories.length > 0);

  return (
    <>
      <section className="card -mx-1 overflow-hidden p-3">
        <div className="flex gap-4 overflow-x-auto pb-1">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex w-16 shrink-0 flex-col items-center gap-2">
                <div className="h-14 w-14 animate-pulse rounded-full bg-overlay" />
                <div className="h-3 w-12 animate-pulse rounded bg-overlay" />
              </div>
            ))
          ) : (
            rings.map((ring) => {
              const isMe = ring.author.id === me?.id;
              const emptyMine = isMe && ring.stories.length === 0;
              return (
                <div key={ring.author.id} className="flex w-16 shrink-0 flex-col items-center gap-1.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (emptyMine) {
                          inputRef.current?.click();
                          return;
                        }
                        openRing(ring);
                      }}
                    >
                      <span
                        className={`block rounded-full p-[2px] ${
                          emptyMine
                            ? 'bg-white/15'
                            : ring.hasUnseen || isMe
                              ? 'bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-sky-400'
                              : 'bg-white/25'
                        }`}
                      >
                        <span className="block rounded-full bg-[var(--card)] p-[2px]">
                          <Avatar src={ring.author.avatar} name={ring.author.name} size="lg" />
                        </span>
                      </span>
                    </button>
                    {isMe ? (
                      <button
                        type="button"
                        className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-violet-500 text-xs font-bold text-white"
                        aria-label="Adicionar story"
                        onClick={() => inputRef.current?.click()}
                      >
                        +
                      </button>
                    ) : null}
                  </div>
                  <span className="w-full truncate text-center text-[11px] text-muted">
                    {isMe ? 'Seu story' : ring.author.name.split(' ')[0]}
                  </span>
                </div>
              );
            })
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept={STORY_ACCEPT}
          className="hidden"
          onChange={(event) => {
            pickFile(event.target.files?.[0]);
            event.target.value = '';
          }}
        />
      </section>

      {draft ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-zinc-950/90 p-3 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <StoryPhone>
              {draft.isVideo ? (
                <video src={draft.preview} className="h-full w-full object-cover object-center" autoPlay loop muted playsInline />
              ) : (
                <img src={draft.preview} alt="Prévia" className="h-full w-full object-cover object-center" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-7 pt-10">
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  maxLength={200}
                  placeholder="Legenda (opcional)"
                  className="w-full rounded-full border border-white/20 bg-black/40 px-4 py-2 text-sm text-white outline-none"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      URL.revokeObjectURL(draft.preview);
                      setDraft(null);
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" disabled={publishing} onClick={publish}>
                    {publishing ? 'Publicando…' : 'Publicar'}
                  </Button>
                </div>
              </div>
            </StoryPhone>
          </div>
        </div>
      ) : null}

      {viewer && playableRings.length > 0 ? (
        <StoryViewer
          rings={playableRings}
          startRing={viewer.ring}
          startStory={viewer.story}
          meId={me?.id ?? ''}
          onClose={() => setViewer(null)}
          onViewed={(storyId) => {
            setRings((current) =>
              current.map((ring) => {
                const stories = ring.stories.map((story) =>
                  story.id === storyId ? { ...story, viewed: true } : story,
                );
                return {
                  ...ring,
                  stories,
                  hasUnseen: ring.author.id === me?.id ? false : stories.some((story) => !story.viewed),
                };
              }),
            );
          }}
          onDeleted={(storyId) => {
            setRings((current) =>
              current.map((ring) => ({
                ...ring,
                stories: ring.stories.filter((story) => story.id !== storyId),
              })),
            );
            setViewer(null);
          }}
        />
      ) : null}
    </>
  );
}
