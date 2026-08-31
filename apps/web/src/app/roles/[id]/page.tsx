'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { REVIEW_RATING_CATEGORIES, REVIEW_RATING_LABELS, type RoleDetail } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Comments } from '@/components/Comments';
import { Field, Input, Textarea } from '@/components/Field';
import { MediaImage } from '@/components/MediaImage';
import { usePlayer } from '@/components/Player';
import { Reactions } from '@/components/Reactions';
import { RequireAuth } from '@/components/RequireAuth';
import { Skeleton } from '@/components/Card';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatDate, formatMoney } from '@/lib/format';

export default function RoleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { setTrack } = usePlayer();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [error, setError] = useState('');
  const [review, setReview] = useState({ title: '', content: '', rating: 5 });
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [tags, setTags] = useState('');
  const [music, setMusic] = useState({ title: '', artist: '', spotifyUrl: '' });
  const me = getUser();

  const load = useCallback(async () => {
    const { data } = await api.get<RoleDetail>(`/roles/${params.id}`);
    setRole(data);
  }, [params.id]);

  useEffect(() => {
    load().catch((err) => setError(apiErrorMessage(err, 'Rolê não encontrado')));
  }, [load]);

  async function attendance(status: 'going' | 'maybe' | 'not_going') {
    const { data } = await api.post<RoleDetail>(`/roles/${params.id}/attendance`, { status });
    setRole(data);
    toast.push('Presença atualizada');
  }

  async function remove() {
    if (!confirm('Excluir este rolê?')) return;
    await api.delete(`/roles/${params.id}`);
    toast.push('Rolê excluído');
    router.push('/roles');
  }

  async function publishReview(event: FormEvent) {
    event.preventDefault();
    const { data } = await api.post(`/reviews`, {
      roleId: params.id,
      ...review,
      ratings,
      tags: tags.split(',').map((tag) => tag.trim().replace(/^#/, '')).filter(Boolean),
    });
    toast.push('Resenha publicada');
    router.push(`/reviews/${data.id}`);
  }

  if (!role && !error) {
    return (
      <RequireAuth>
        <Skeleton className="h-64" />
      </RequireAuth>
    );
  }
  if (!role) {
    return (
      <RequireAuth>
        <p className="text-rose-300">{error}</p>
      </RequireAuth>
    );
  }

  const owner = me?.id === role.creatorId;

  return (
    <RequireAuth>
      <div className="space-y-5">
        <div className="overflow-hidden rounded-[var(--radius-xl)] border-2 border-[var(--text)]">
          <MediaImage src={role.coverPhoto ?? role.photos?.[0]?.url} alt="" className="h-40 w-full object-cover sm:h-52" />
          <div className="bg-[var(--card)] p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-bold text-fg">
                  {formatDate(role.date)} {role.time ? `· ${role.time}` : ''}
                </p>
                <p className="text-sm text-muted">{role.location || 'Local a combinar'}</p>
                <h1 className="text-2xl font-semibold sm:text-3xl">{role.title}</h1>
                <p className="text-sm text-muted">{role.description || 'Sem descrição.'}</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex min-h-6 items-center rounded-full border-2 border-[var(--text)] px-2 text-label">
                    {role.category}
                  </span>
                  {role.tags?.map((tag) => (
                    <span key={tag} className="text-xs text-muted">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              {owner ? (
                <div className="flex gap-2">
                  <Link href={`/roles/${role.id}/editar`} className="button button--outline">
                    Editar
                  </Link>
                  <Button variant="danger" onClick={remove}>
                    Excluir
                  </Button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
              <Avatar src={role.creator?.avatar} name={role.creator?.name} size="sm" />
              <Link href={`/perfil/${role.creator?.username}`}>{role.creator?.name}</Link>
              {formatMoney(role.estimatedCost) ? <span className="text-muted">· {formatMoney(role.estimatedCost)}</span> : null}
            </div>
            <div className="mt-4">
              <Button variant={role.myAttendance === 'going' ? 'outline' : 'primary'} onClick={() => attendance('going')}>
                {role.myAttendance === 'going' ? 'Confirmado' : 'Bora'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(['going', 'maybe', 'not_going'] as const).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => attendance(status)}
              className={`card min-h-11 p-4 text-left ${role.myAttendance === status ? 'border-[var(--accent)]' : ''}`}
            >
              <p className="text-2xl font-semibold">
                {status === 'going' ? role.goingCount : status === 'maybe' ? role.maybeCount : role.notGoingCount}
              </p>
              <p className="text-sm text-muted">{status === 'going' ? 'vão' : status === 'maybe' ? 'talvez' : 'não vão'}</p>
            </button>
          ))}
        </div>

        <section className="card p-5">
          <h2 className="mb-3 font-medium">Participantes</h2>
          <ul className="flex flex-wrap gap-3">
            {role.attendances.map((item) => (
              <li key={item.id} className="flex items-center gap-2 rounded-full bg-white/5 px-2 py-1">
                <Avatar src={item.user?.avatar} name={item.user?.name} size="sm" />
                <span className="text-sm">{item.user?.name}</span>
                <span className="text-xs text-muted">{item.status}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="card p-5">
          <Reactions targetType="role" targetId={role.id} items={role.reactions ?? []} onChange={() => load()} />
        </section>

        {role.photos?.length ? (
          <section className="card p-5">
            <h2 className="mb-3 font-medium">Fotos</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {role.photos.map((photo) => (
                <MediaImage
                  key={photo.id}
                  src={photo.url}
                  alt={photo.caption || 'Foto do rolê'}
                  className="h-32 w-full rounded-xl object-cover"
                />
              ))}
            </div>
          </section>
        ) : null}

        {role.audios?.length ? (
          <section className="card space-y-3 p-5">
            <h2 className="font-medium">Áudios</h2>
            {role.audios.map((audio) => (
              <div key={audio.id}>
                <p className="text-sm">🎙️ {audio.name}</p>
                <audio controls src={audio.url} className="mt-1 w-full" />
              </div>
            ))}
          </section>
        ) : null}

        <section className="card space-y-3 p-5">
          <h2 className="font-medium">Música</h2>
          {role.music.map((track) => (
            <button
              key={track.id}
              type="button"
              className="flex w-full items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-left"
              onClick={() => setTrack({ title: track.title, artist: track.artist, cover: track.cover, spotifyUrl: track.spotifyUrl })}
            >
              <span>
                {track.title} — {track.artist}
              </span>
              {track.spotifyUrl ? (
                <a href={track.spotifyUrl} className="text-xs text-[#1DB954]" onClick={(e) => e.stopPropagation()}>
                  Spotify
                </a>
              ) : null}
            </button>
          ))}
          <form
            className="grid gap-2 sm:grid-cols-3"
            onSubmit={async (event) => {
              event.preventDefault();
              await api.post(`/roles/${role.id}/music`, music);
              setMusic({ title: '', artist: '', spotifyUrl: '' });
              load();
            }}
          >
            <Input placeholder="Música" value={music.title} onChange={(e) => setMusic({ ...music, title: e.target.value })} required />
            <Input placeholder="Artista" value={music.artist} onChange={(e) => setMusic({ ...music, artist: e.target.value })} required />
            <Button type="submit">Associar</Button>
          </form>
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-medium">Comentários</h2>
          <Comments
            comments={role.comments}
            onChanged={load}
            onSubmit={async (content, parentId) => {
              await api.post(`/roles/${role.id}/comments`, { content, parentId });
              await load();
            }}
          />
        </section>

        <section className="card p-5">
          <h2 className="mb-4 font-medium">Resenha</h2>
          {role.review ? (
            <Link href={`/reviews/${role.review.id}`} className="block rounded-xl bg-white/5 p-4">
              <p className="text-[var(--accent)]">{'★'.repeat(role.review.rating)}</p>
              <h3 className="text-lg">{role.review.title}</h3>
              <p className="text-sm text-muted">{role.review.content}</p>
            </Link>
          ) : (
            <form onSubmit={publishReview} className="space-y-3">
              <Field label="Título">
                <Input value={review.title} onChange={(e) => setReview({ ...review, title: e.target.value })} required />
              </Field>
              <Field label="Como foi?">
                <Textarea value={review.content} onChange={(e) => setReview({ ...review, content: e.target.value })} required />
              </Field>
              <Field label="Nota geral">
                <Input type="number" min={1} max={5} value={review.rating} onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })} />
              </Field>
              <div className="grid gap-2 sm:grid-cols-2">
                {REVIEW_RATING_CATEGORIES.map((cat) => (
                  <Field key={cat} label={REVIEW_RATING_LABELS[cat]}>
                    <Input
                      type="number"
                      min={1}
                      max={5}
                      value={ratings[cat] ?? ''}
                      onChange={(e) => setRatings({ ...ratings, [cat]: Number(e.target.value) })}
                    />
                  </Field>
                ))}
              </div>
              <Field label="Tags">
                <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="sexta, festa" />
              </Field>
              <Button type="submit">Publicar resenha</Button>
            </form>
          )}
        </section>
      </div>
    </RequireAuth>
  );
}
