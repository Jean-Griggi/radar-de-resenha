'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import type { FeedItem, ReactionSummary } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { FeedComments } from '@/components/Comments';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { MediaImage } from '@/components/MediaImage';
import { Reactions } from '@/components/Reactions';
import { RequireAuth } from '@/components/RequireAuth';
import { StoriesBar } from '@/components/StoriesBar';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatDate, formatTimeAgo } from '@/lib/format';

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

function commentTarget(item: FeedItem) {
  if (item.post?.id) return { targetType: 'post', targetId: item.post.id };
  if (item.role?.id) return { targetType: 'role', targetId: item.role.id };
  if (item.review?.id) return { targetType: 'review', targetId: item.review.id };
  if (item.photo?.id) return { targetType: 'photo', targetId: item.photo.id };
  return null;
}

export default function HomePage() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const toast = useToast();
  const me = getUser();

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
    if (!content.trim()) return;
    try {
      await api.post('/posts', { content });
      setContent('');
      toast.push('Publicado no feed');
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
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

  return (
    <RequireAuth>
      <div className="space-y-5">
        <h1 className="sr-only">Feed</h1>
        <StoriesBar />

        <form onSubmit={publish} className="card p-4">
          <div className="flex gap-3">
            <Avatar src={me?.avatar} name={me?.name} />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="O que está acontecendo?"
              className="min-h-20 min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="/roles/new" className="min-h-11 rounded-full border-2 border-line px-3 py-2 hover:border-[var(--text)]">
                Criar rolê
              </Link>
              <Link href="/photos" className="min-h-11 rounded-full border-2 border-line px-3 py-2 hover:border-[var(--text)]">
                Foto
              </Link>
              <Link href="/music" className="min-h-11 rounded-full border-2 border-line px-3 py-2 hover:border-[var(--text)]">
                Música
              </Link>
            </div>
            <Button type="submit">Compartilhar</Button>
          </div>
        </form>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        ) : null}
        {error ? <p className="text-rose-300">{error}</p> : null}
        {!loading && !error && items.length === 0 ? (
          <EmptyState
            title="O feed ainda está quieto"
            description="Crie o primeiro rolê e comece a registrar a resenha."
            action={
              <Link href="/roles/new" className="button button--primary">
                Criar primeiro rolê
              </Link>
            }
          />
        ) : null}

        {!loading
          ? items.map((item) => {
              const target = commentTarget(item);
              return (
              <ErrorBoundary
                key={item.id}
                fallback={
                  <article className="card p-5">
                    <p className="text-sm text-muted">Este item do feed não pôde ser exibido.</p>
                  </article>
                }
              >
                <article className="card overflow-hidden p-0">
                  <div className="grid md:grid-cols-[minmax(0,1fr)_min(20rem,42%)]">
                    <div className="min-w-0 p-3 sm:p-4">
                      <div className="flex items-start gap-2">
                        <Avatar src={item.actor?.avatar} name={item.actor?.name} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            <Link href={`/perfil/${item.actor?.username}`} className="font-medium text-fg">
                              {item.actor?.name}
                            </Link>{' '}
                            <span className="text-muted">{LABELS[item.type] ?? item.type}</span>
                          </p>
                          <p className="text-xs text-muted">{formatTimeAgo(item.createdAt)}</p>
                          {item.role ? (
                            <Link href={`/roles/${item.role.id}`} className="mt-2 block rounded-[var(--radius-md)] border-2 border-line p-3 hover:border-[var(--text)]">
                              <p className="text-xs font-bold text-fg">
                                {formatDate(item.role.date)} {item.role.time}
                              </p>
                              <p className="text-xs text-muted">{item.role.location || 'Local a combinar'}</p>
                              <h2 className="mt-1 text-base font-medium text-fg">{item.role.title}</h2>
                              <p className="mt-1 text-xs text-muted">{item.role.goingCount} pessoas confirmaram</p>
                            </Link>
                          ) : null}
                          {item.review ? (
                            <Link href={`/reviews/${item.review.id}`} className="mt-2 block rounded-[var(--radius-md)] border-2 border-line p-3">
                              <p className="text-[var(--accent)]">{'★'.repeat(item.review.rating)}</p>
                              <h2 className="text-base font-medium text-fg">{item.review.title}</h2>
                              <p className="line-clamp-2 text-sm text-muted">{item.review.content}</p>
                            </Link>
                          ) : null}
                          {item.post ? <p className="mt-2 line-clamp-5 text-sm text-fg">{item.post.content}</p> : null}
                          {item.photo ? (
                            <MediaImage
                              src={item.photo.url}
                              alt={item.photo.caption || 'Foto'}
                              className="mt-2 h-36 w-full rounded-[var(--radius-md)] object-cover"
                            />
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.role ? (
                              <button type="button" className="button button--primary" onClick={() => bora(item.role!.id)}>
                                Bora
                              </button>
                            ) : null}
                            {item.role || item.review ? (
                              <button
                                type="button"
                                className="button button--ghost"
                                onClick={() => saveLink(item.role ? `/roles/${item.role.id}` : `/reviews/${item.review!.id}`)}
                              >
                                Salvar
                              </button>
                            ) : null}
                          </div>
                          <div className="mt-2">
                            <Reactions
                              targetType={item.role ? 'role' : item.review ? 'review' : 'post'}
                              targetId={item.role?.id || item.review?.id || item.post?.id || item.id}
                              items={item.reactions ?? []}
                              onChange={(reactions: ReactionSummary[]) => {
                                setItems((current) => current.map((entry) => (entry.id === item.id ? { ...entry, reactions } : entry)));
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    {target ? (
                      <div className="border-t border-line p-3 md:border-t-0 md:border-l">
                        <FeedComments targetType={target.targetType} targetId={target.targetId} />
                      </div>
                    ) : null}
                  </div>
                </article>
              </ErrorBoundary>
              );
            })
          : null}
      </div>
    </RequireAuth>
  );
}
