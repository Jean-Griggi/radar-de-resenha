'use client';

import { useEffect, useRef, useState } from 'react';
import { Music, Plus, X } from 'lucide-react';
import type { StoryRing } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SpotifyPicker, type SpotifyChoice } from '@/features/music';
import { StoryViewer, StoryPhone } from './StoryViewer';
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
  const [music, setMusic] = useState<SpotifyChoice | null>(null);
  const [pickingMusic, setPickingMusic] = useState(false);
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
    setMusic(null);
    setPickingMusic(false);
  }

  async function publish() {
    if (!draft) return;
    setPublishing(true);
    try {
      // A música vai só como tipo + id; o servidor busca título, capa e link no Spotify.
      await postFile('/stories', 'story', draft.file, {
        caption: caption.trim() || undefined,
        musicKind: music?.kind,
        musicId: music?.id,
      });
      URL.revokeObjectURL(draft.preview);
      setDraft(null);
      setMusic(null);
      setPickingMusic(false);
      toast.push('Story publicado');
      await load();
    } catch (err) {
      if (!isApiCanceled(err)) toast.push(apiErrorMessage(err, 'Falha ao publicar o story'), 'error');
    } finally {
      setPublishing(false);
    }
  }

  const playableRings = rings.filter((ring) => ring.stories.length > 0);
  // "Seu story" sempre primeiro; o resto segue a ordem da API.
  const orderedRings = [...rings].sort(
    (a, b) => Number(b.author.id === me?.id) - Number(a.author.id === me?.id),
  );

  return (
    <>
      <section className="k-stories" aria-label="Stories">
        <ul className="k-stories__row">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className="k-stories__item">
                <div className="skeleton k-stories__bone" />
                <div className="skeleton h-3 w-12" />
              </li>
            ))
          ) : (
            orderedRings.map((ring) => {
              const isMe = ring.author.id === me?.id;
              const emptyMine = isMe && ring.stories.length === 0;
              const label = isMe ? 'Seu story' : ring.author.name.split(' ')[0];
              const avatar = (
                <span className={emptyMine ? 'k-stories__avatar k-stories__avatar--empty' : 'k-stories__avatar'}>
                  <Avatar
                    src={ring.author.avatar}
                    name={ring.author.name}
                    size="lg"
                    glow={!emptyMine && ring.hasUnseen}
                    seen={!emptyMine && !ring.hasUnseen}
                  />
                  {emptyMine ? (
                    <span className="k-stories__add" aria-hidden>
                      <Plus size={14} strokeWidth={2.5} />
                    </span>
                  ) : null}
                </span>
              );
              return (
                <li key={ring.author.id} className="k-stories__item">
                  {/* O item inteiro (avatar + rótulo) é o alvo. */}
                  <button
                    type="button"
                    className="k-stories__hit"
                    aria-label={
                      emptyMine
                        ? 'Adicionar ao seu story'
                        : ring.hasUnseen
                          ? `Stories de ${ring.author.name}, não vistos`
                          : `Stories de ${ring.author.name}`
                    }
                    onClick={() => {
                      if (emptyMine) {
                        inputRef.current?.click();
                        return;
                      }
                      openRing(ring);
                    }}
                  >
                    {avatar}
                    <span className="k-stories__label">{label}</span>
                  </button>
                  {isMe && !emptyMine ? (
                    <button
                      type="button"
                      className="k-stories__add k-stories__add--button"
                      aria-label="Adicionar ao seu story"
                      onClick={() => inputRef.current?.click()}
                    >
                      <Plus size={14} strokeWidth={2.5} aria-hidden />
                    </button>
                  ) : null}
                </li>
              );
            })
          )}
        </ul>
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
        <StoryPhone>
          {draft.isVideo ? (
            <video src={draft.preview} className="h-full w-full object-cover object-center" autoPlay loop muted playsInline />
          ) : (
            <img src={draft.preview} alt="Prévia" className="h-full w-full object-cover object-center" />
          )}
          <div className="k-stage__reply">
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={200}
              placeholder="Legenda (opcional)"
              className="k-stage__field"
            />
            {music ? (
              <div className="mt-2 flex items-center gap-2">
                <Music size={16} aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {music.title} · {music.subtitle}
                </span>
                <button type="button" className="k-stage__icon" aria-label="Tirar música" onClick={() => setMusic(null)}>
                  <X size={18} aria-hidden />
                </button>
              </div>
            ) : (
              <button type="button" className="k-stage__textbtn" onClick={() => setPickingMusic(true)}>
                <Music size={16} aria-hidden /> Adicionar música
              </button>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  URL.revokeObjectURL(draft.preview);
                  setDraft(null);
                  setMusic(null);
                  setPickingMusic(false);
                }}
              >
                Cancelar
              </Button>
              <Button type="button" disabled={publishing} onClick={publish}>
                {publishing ? 'Publicando…' : 'Publicar'}
              </Button>
            </div>
          </div>
          {pickingMusic ? (
            <div className="absolute inset-x-3 bottom-3 z-10 mx-auto max-w-md">
              <SpotifyPicker
                onClose={() => setPickingMusic(false)}
                onPick={(choice) => {
                  setMusic(choice);
                  setPickingMusic(false);
                }}
              />
            </div>
          ) : null}
        </StoryPhone>
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
