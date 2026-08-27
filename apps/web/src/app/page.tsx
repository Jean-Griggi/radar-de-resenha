'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useState } from 'react';
import type { FeedItem, ReactionSummary } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { MediaImage } from '@/components/MediaImage';
import { Reactions } from '@/components/Reactions';
import { RequireAuth } from '@/components/RequireAuth';
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

  return (
    <RequireAuth>
      <div className="space-y-5">
        <section className="overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(120deg,#4c1d95,#6d28d9,#0ea5e9)] p-5 sm:rounded-3xl sm:p-8">
          <p className="text-sm text-white/80">Sua timeline</p>
          <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">O que está acontecendo?</h1>
        </section>

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
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="/roles/new" className="rounded-full bg-white/5 px-3 py-1.5 hover:bg-white/10">
                Criar rolê
              </Link>
              <Link href="/roles" className="rounded-full bg-white/5 px-3 py-1.5 hover:bg-white/10">
                Resenha
              </Link>
              <Link href="/photos" className="rounded-full bg-white/5 px-3 py-1.5 hover:bg-white/10">
                Foto
              </Link>
              <Link href="/photos" className="rounded-full bg-white/5 px-3 py-1.5 hover:bg-white/10">
                Áudio
              </Link>
              <Link href="/music" className="rounded-full bg-white/5 px-3 py-1.5 hover:bg-white/10">
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
              <Link href="/roles/new" className="rounded-xl bg-violet-500 px-4 py-2 text-sm">
                Criar primeiro rolê
              </Link>
            }
          />
        ) : null}

        {!loading
          ? items.map((item) => (
              <article key={item.id} className="card p-5">
                <div className="flex items-start gap-3">
                  <Avatar src={item.actor?.avatar} name={item.actor?.name} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <Link href={`/perfil/${item.actor?.username}`} className="font-medium text-white">
                        {item.actor?.name}
                      </Link>{' '}
                      <span className="text-slate-400">{LABELS[item.type] ?? item.type}</span>
                    </p>
                    <p className="text-xs text-slate-500">{formatTimeAgo(item.createdAt)}</p>
                    {item.role ? (
                      <Link href={`/roles/${item.role.id}`} className="mt-3 block rounded-2xl bg-white/5 p-4 hover:bg-white/10">
                        <h2 className="text-lg font-medium">{item.role.title}</h2>
                        <p className="text-sm text-slate-400">
                          {formatDate(item.role.date)} {item.role.time} · {item.role.location || 'Local a combinar'}
                        </p>
                        <p className="mt-2 text-xs text-slate-400">{item.role.goingCount} pessoas confirmaram</p>
                      </Link>
                    ) : null}
                    {item.review ? (
                      <Link href={`/reviews/${item.review.id}`} className="mt-3 block rounded-2xl bg-white/5 p-4">
                        <p className="text-amber-300">{'★'.repeat(item.review.rating)}</p>
                        <h2 className="text-lg font-medium">{item.review.title}</h2>
                        <p className="line-clamp-3 text-sm text-slate-300">{item.review.content}</p>
                      </Link>
                    ) : null}
                    {item.post ? <p className="mt-3 text-slate-100">{item.post.content}</p> : null}
                    {item.photo ? (
                      <MediaImage
                        src={item.photo.url}
                        alt={item.photo.caption || 'Foto'}
                        className="mt-3 h-52 w-full rounded-2xl object-cover"
                      />
                    ) : null}
                    <div className="mt-4">
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
              </article>
            ))
          : null}
      </div>
    </RequireAuth>
  );
}
