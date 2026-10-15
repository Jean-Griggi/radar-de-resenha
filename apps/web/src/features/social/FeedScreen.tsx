'use client';

import { Stars } from '@/components/Stars';
import Link from 'next/link';
import { Dispatch, FormEvent, SetStateAction, useEffect, useState } from 'react';
import { CalendarPlus, Image as ImageIcon, Link2, Music, X } from 'lucide-react';
import type { FeedItem, ReactionSummary } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { usePlayer } from '@/components/Player';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/Card';
import {
  Mesa,
  MesaSkeleton,
  MesaViewer,
  mesaTransitionStyle,
  useMesaViewer,
  type MesaEntry,
} from '@/components/Mesa';
import { FeedComments } from './Comments';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MediaImage } from '@/components/MediaImage';
import { Post } from './Post';
import { Reactions } from './Reactions';
import { ChatPreview } from '@/features/chat';
import { SpotifyPicker, type SpotifyChoice } from '@/features/music';
import { StoriesBar } from '@/features/stories';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatMeta, formatTimeAgo, plural } from '@/lib/format';
import {
  peekUpcomingRoles,
  setCachedUpcomingRoles,
  withInflight,
  type RailRole,
} from '@/lib/shellCache';

const LABELS: Record<string, string> = {
  role_created: 'criou um novo rolê',
  review_published: 'publicou uma resenha',
  attendance_going: 'confirmou presença',
  photo_added: 'adicionou uma foto',
  audio_added: 'adicionou um áudio',
  music_added: 'associou uma música',
  achievement_unlocked: 'ganhou uma conquista',
  post_created: 'publicou algo',
};

function UpcomingStrip() {
  const [roles, setRoles] = useState<RailRole[]>(() => peekUpcomingRoles() ?? []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const next =
          peekUpcomingRoles() ??
          (await withInflight('calendar', async () => {
            const { data } = await api.get<{ upcoming: RailRole[] }>('/calendar');
            const upcoming = data.upcoming ?? [];
            setCachedUpcomingRoles(upcoming);
            return upcoming;
          }));
        if (!cancelled) setRoles(next);
      } catch {
        /* a faixa some se a agenda não carregar */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (roles.length === 0) return null;

  return (
    <section className="feed-next xl:hidden" aria-label="Próximos">
      <h2 className="k-meta">Próximos</h2>
      <ul>
        {roles.map((role) => (
          <li key={role.id}>
            <Link href={`/roles/${role.id}`}>
              <span className="k-meta">{formatMeta(role.date, role.time)}</span>
              <span className="k-display feed-next__name">{role.title}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function commentTarget(item: FeedItem) {
  if (item.post?.id) return { targetType: 'post', targetId: item.post.id };
  if (item.role?.id) return { targetType: 'role', targetId: item.role.id };
  if (item.review?.id) return { targetType: 'review', targetId: item.review.id };
  if (item.photo?.id) return { targetType: 'photo', targetId: item.photo.id };
  return null;
}

/** Foto do tile: a foto do item ou a capa do rolê. A capa do Spotify nunca vira foto de tile (não se recorta capa de álbum). */
function feedImage(item: FeedItem) {
  return item.photo?.url ?? item.role?.coverPhoto ?? null;
}

function entryLabel(item: FeedItem) {
  const name = item.actor?.name ?? item.post?.author?.name ?? '';
  return `Post de ${name}${item.role ? `, em ${item.role.title}` : ''}`;
}

function feedEntry(item: FeedItem): MesaEntry {
  const name = item.actor?.name ?? item.post?.author?.name;
  return {
    id: item.id,
    label: entryLabel(item),
    image: feedImage(item),
    text:
      item.post?.content ||
      item.review?.title ||
      item.role?.title ||
      item.post?.music?.title ||
      LABELS[item.type] ||
      '',
    avatar: { src: item.actor?.avatar ?? item.post?.author?.avatar, name },
    meta: formatTimeAgo(item.createdAt),
    dateTime: item.createdAt,
  };
}

/** O item inteiro, aberto a partir da Mesa: o mesmo conteúdo, reações e comentários que a lista antiga mostrava. */
function FeedEntry({
  item,
  setItems,
  onBora,
  onSaveLink,
  onPlay,
}: {
  item: FeedItem;
  setItems: Dispatch<SetStateAction<FeedItem[]>>;
  onBora: (roleId: string) => void;
  onSaveLink: (path: string) => void;
  onPlay: (track: {
    title: string;
    artist: string;
    cover?: string | null;
    spotifyUrl?: string | null;
  }) => void;
}) {
  const image = feedImage(item);
  // Tile com foto: a foto grande recebe o nome da transição. Tile de texto: o bloco do post/card.
  const named = mesaTransitionStyle(item.id);
  // As cantoneiras envolvem SÓ a foto; o nome da transição fica na <img>, nunca no invólucro das cantoneiras.
  const hero = image ? (
    <div className="k-mesa-viewer__hero">
      <div className="k-corners k-mesa-viewer__frame">
        <MediaImage
          src={image}
          alt={item.photo?.caption || ''}
          className="k-mesa-viewer__image"
          style={named}
        />
      </div>
    </div>
  ) : null;
  const fallback = (
    <article className="card p-5">
      <p className="text-sm text-muted">Este item do feed não pôde ser exibido.</p>
    </article>
  );

  if (item.type === 'post_created' && item.post) {
    const post = item.post;
    return (
      <ErrorBoundary fallback={fallback}>
        {hero}
        <Post
          postId={post.id}
          authorName={item.actor?.name ?? post.author?.name ?? ''}
          username={item.actor?.username ?? post.author?.username}
          avatar={item.actor?.avatar ?? post.author?.avatar}
          createdAt={item.createdAt}
          content={post.content}
          music={post.music}
          onPlay={
            post.music
              ? () =>
                  onPlay({
                    title: post.music!.title,
                    artist: post.music!.artist ?? 'Playlist',
                    cover: post.music!.cover,
                    spotifyUrl: post.music!.spotifyUrl,
                  })
              : undefined
          }
          reactions={item.reactions ?? []}
          onReactions={(reactions: ReactionSummary[]) => {
            setItems((current) =>
              current.map((entry) => (entry.id === item.id ? { ...entry, reactions } : entry)),
            );
          }}
          comments={<FeedComments targetType="post" targetId={post.id} accent />}
          transitionStyle={image ? undefined : named}
          bare={Boolean(image)}
        />
      </ErrorBoundary>
    );
  }

  const target = commentTarget(item);
  return (
    <ErrorBoundary fallback={fallback}>
      {hero}
      <article
        className={image ? 'feed-memory feed-memory--bare' : 'card feed-memory k-corners'}
        style={image ? undefined : named}
      >
        <div className="min-w-0 p-4">
          <div className="flex items-start gap-3">
            <Avatar src={item.actor?.avatar} name={item.actor?.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-5">
                <Link
                  href={`/perfil/${item.actor?.username}`}
                  className="font-semibold text-fg hover:underline"
                >
                  {item.actor?.name}
                </Link>{' '}
                <span className="text-muted">{LABELS[item.type] ?? item.type}</span>
              </p>
              <p className="k-meta">{formatTimeAgo(item.createdAt)}</p>
              {item.role ? (
                <Link
                  href={`/roles/${item.role.id}`}
                  className="mt-3 block border border-[var(--k-line)] p-3"
                >
                  <p className="k-meta">{formatMeta(item.role.date, item.role.time)}</p>
                  <h2 className="k-display feed-memory__title">{item.role.title}</h2>
                  <p>{item.role.location || 'Local a combinar'}</p>
                  <p className="k-meta">
                    {plural(item.role.goingCount, 'pessoa confirmou', 'pessoas confirmaram')}
                  </p>
                </Link>
              ) : null}
              {item.review ? (
                <Link
                  href={`/reviews/${item.review.id}`}
                  className="mt-3 block border border-[var(--k-line)] p-3"
                >
                  <p className="text-[var(--k-brand)]">
                    <Stars rating={item.review.rating} />
                  </p>
                  <h2 className="text-base font-semibold text-fg">{item.review.title}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{item.review.content}</p>
                </Link>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-1">
                {item.role ? (
                  <button
                    type="button"
                    className="button button--primary h-11 px-4"
                    onClick={() => onBora(item.role!.id)}
                  >
                    Bora
                  </button>
                ) : null}
                {item.role || item.review ? (
                  <button
                    type="button"
                    className="button button--ghost gap-1.5"
                    onClick={() =>
                      onSaveLink(
                        item.role ? `/roles/${item.role.id}` : `/reviews/${item.review!.id}`,
                      )
                    }
                  >
                    <Link2 size={16} strokeWidth={2} aria-hidden />
                    Salvar
                  </button>
                ) : null}
              </div>
              <div className="mt-1">
                <Reactions
                  targetType={item.role ? 'role' : item.review ? 'review' : 'post'}
                  targetId={item.role?.id || item.review?.id || item.post?.id || item.id}
                  items={item.reactions ?? []}
                  onChange={(reactions: ReactionSummary[]) => {
                    setItems((current) =>
                      current.map((entry) =>
                        entry.id === item.id ? { ...entry, reactions } : entry,
                      ),
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {target ? (
          <div className="border-t border-line px-4 py-3">
            <FeedComments targetType={target.targetType} targetId={target.targetId} accent />
          </div>
        ) : null}
      </article>
    </ErrorBoundary>
  );
}

export function FeedScreen() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [music, setMusic] = useState<SpotifyChoice | null>(null);
  const [pickingMusic, setPickingMusic] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const { setTrack } = usePlayer();
  const toast = useToast();
  const me = getUser();
  const mesa = useMesaViewer();

  async function load(signal?: AbortSignal) {
    try {
      const { data } = await api.get<FeedItem[]>('/feed', signal ? { signal } : undefined);
      setItems(data);
      setError('');
    } catch (err) {
      if (isApiCanceled(err)) return;
      setError(apiErrorMessage(err, 'Não foi possível carregar o feed'));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    load(controller.signal);
    return () => controller.abort();
  }, []);

  async function publish(event: FormEvent) {
    event.preventDefault();
    if ((!content.trim() && !music) || publishing) return;
    setPublishing(true);
    try {
      await api.post('/posts', { content, musicKind: music?.kind, musicId: music?.id });
      setContent('');
      setMusic(null);
      setPickingMusic(false);
      toast.push('Publicado no feed');
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
    } finally {
      setPublishing(false);
    }
  }

  async function bora(roleId: string) {
    try {
      await api.post(`/roles/${roleId}/attendance`, { status: 'going' });
      toast.push('Presença confirmada');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Não foi possível confirmar'), 'error');
    }
  }

  async function saveLink(path: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.push('Link copiado');
    } catch {
      toast.push('Não foi possível copiar o link', 'error');
    }
  }

  const composerEmpty = !content.trim() && !music;
  const future = items.filter((item) => item.role?.status === 'upcoming');
  const past = items.filter((item) => item.role?.status !== 'upcoming');
  const openItem = past.find((item) => item.id === mesa.openId);

  return (
    <div className="feed">
      <h1 className="sr-only">Feed</h1>
      {!loading && !error
        ? future.map((item) =>
            item.role ? (
              <article key={item.id} className="feed-future">
                <div className="feed-future__when">
                  <span className="feed-future__day">
                    {item.role.date ? item.role.date.slice(8, 10) : '—'}
                  </span>
                  <span className="k-meta">{formatMeta(item.role.date, item.role.time)}</span>
                </div>
                <div>
                  {item.role.coverPhoto ? (
                    <MediaImage src={item.role.coverPhoto} alt="" className="feed-future__cover" />
                  ) : null}
                  {item.photo ? (
                    <MediaImage
                      src={item.photo.url}
                      alt={item.photo.caption || 'Foto'}
                      className="feed-future__cover"
                    />
                  ) : null}
                  <p>
                    <Link href={`/perfil/${item.actor?.username}`}>{item.actor?.name}</Link>{' '}
                    <span>{LABELS[item.type] ?? item.type}</span>
                  </p>
                  <h2 className="k-display feed-future__title">
                    <Link href={`/roles/${item.role.id}`}>{item.role.title}</Link>
                  </h2>
                  <p className="feed-future__place">{item.role.location || 'Local a combinar'}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => bora(item.role!.id)}>Bora</Button>
                    <button
                      type="button"
                      className="button button--ghost"
                      onClick={() => saveLink(`/roles/${item.role!.id}`)}
                    >
                      Salvar
                    </button>
                  </div>
                  <Reactions
                    targetType="role"
                    targetId={item.role.id}
                    items={item.reactions ?? []}
                    onChange={(reactions: ReactionSummary[]) => {
                      setItems((current) =>
                        current.map((entry) =>
                          entry.id === item.id ? { ...entry, reactions } : entry,
                        ),
                      );
                    }}
                  />
                  {commentTarget(item) ? (
                    <FeedComments
                      targetType={commentTarget(item)!.targetType}
                      targetId={commentTarget(item)!.targetId}
                    />
                  ) : null}
                </div>
              </article>
            ) : null,
          )
        : null}
      <StoriesBar />
      <UpcomingStrip />
      <ChatPreview placement="feed" />

      <form onSubmit={publish} className="card p-4">
        <div className="flex gap-3">
          <Avatar src={me?.avatar} name={me?.name} />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="O que está acontecendo?"
            className="min-h-20 min-w-0 flex-1 resize-none bg-transparent text-sm text-fg outline-none placeholder:text-muted"
          />
        </div>
        {music ? (
          <div className="mt-3 flex items-center gap-3 border border-[var(--k-line)] p-2">
            <MediaImage src={music.cover} alt="" className="k-cover h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{music.title}</p>
              <p className="k-meta truncate">{music.subtitle}</p>
            </div>
            <button
              type="button"
              className="icon-btn"
              aria-label="Tirar a música"
              onClick={() => setMusic(null)}
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        ) : null}
        {pickingMusic ? (
          <div className="mt-3">
            <SpotifyPicker
              disabled={publishing}
              onClose={() => setPickingMusic(false)}
              onPick={(choice) => {
                setMusic(choice);
                setPickingMusic(false);
              }}
            />
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          <div className="flex flex-wrap gap-1.5">
            <Link href="/roles/new" className="composer-chip">
              <CalendarPlus size={16} strokeWidth={2} aria-hidden />
              Criar rolê
            </Link>
            <Link href="/photos" className="composer-chip">
              <ImageIcon size={16} strokeWidth={2} aria-hidden />
              Foto
            </Link>
            <button
              type="button"
              className="composer-chip"
              aria-pressed={pickingMusic}
              onClick={() => setPickingMusic((open) => !open)}
            >
              <Music size={16} strokeWidth={2} aria-hidden />
              Música
            </button>
          </div>
          <div className="k-composer__send">
            <Button
              type="submit"
              variant="secondary"
              loading={publishing}
              disabled={composerEmpty}
              aria-describedby={composerEmpty ? 'composer-reason' : undefined}
            >
              Compartilhar
            </Button>
            {composerEmpty ? (
              <p id="composer-reason" className="k-reason">
                Escreva algo para compartilhar.
              </p>
            ) : null}
          </div>
        </div>
      </form>

      {loading ? <MesaSkeleton /> : null}
      {error ? <p className="feed-error">{error}</p> : null}
      {!loading && !error && items.length === 0 ? (
        <EmptyState
          title="Ninguém marcou nada ainda."
          action={
            <Link href="/roles/new" className="button button--primary">
              Marcar um rolê
            </Link>
          }
        />
      ) : null}

      {!loading && !error && past.length > 0 ? (
        <Mesa label="Publicações e rolês" entries={past.map(feedEntry)} onOpen={mesa.open} />
      ) : null}
      <MesaViewer
        open={Boolean(openItem)}
        onClose={mesa.close}
        label={openItem ? entryLabel(openItem) : 'Publicação'}
      >
        {openItem ? (
          <FeedEntry
            item={openItem}
            setItems={setItems}
            onBora={bora}
            onSaveLink={saveLink}
            onPlay={setTrack}
          />
        ) : null}
      </MesaViewer>
    </div>
  );
}
