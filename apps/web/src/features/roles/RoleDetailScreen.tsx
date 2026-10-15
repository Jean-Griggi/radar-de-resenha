'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { REVIEW_RATING_CATEGORIES, REVIEW_RATING_LABELS, type RoleDetail } from '@resenhometro/shared';
import { AvatarStack } from '@/components/AvatarStack';
import { Button } from '@/components/Button';
import { Corners } from '@/components/Corners';
import { Ficha, FichaRow } from '@/components/FichaRow';
import { Field, Input, Textarea } from '@/components/Field';
import { MediaImage } from '@/components/MediaImage';
import { usePlayer } from '@/components/Player';
import { SpotifyPicker } from '@/features/music';
import { TrackList, TrackRow } from '@/components/TrackRow';
import { LocationMap } from '@/features/users/LocationMap';
import { Comments, Reactions } from '@/features/social';
import { Skeleton } from '@/components/Card';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatMeta, formatMoney } from '@/lib/format';

export function RoleDetailScreen() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { setTrack } = usePlayer();
  const [role, setRole] = useState<RoleDetail | null>(null);
  const [error, setError] = useState('');
  const [review, setReview] = useState({ title: '', content: '', rating: 5 });
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [tags, setTags] = useState('');
  const [picking, setPicking] = useState(false);
  const [addingMusic, setAddingMusic] = useState(false);
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
    return <Skeleton className="h-64" />;
  }
  if (!role) {
    return <p className="text-[var(--danger)]">{error}</p>;
  }

  const owner = me?.id === role.creatorId;
  const coverSrc = role.coverPhoto ?? role.photos?.[0]?.url;
  const when = role.status === 'upcoming' ? daysUntil(role.date) : null;
  const statusText = when ? `${statusLine(role.status)} · ${when}` : statusLine(role.status);
  const cover = (
    <div className="role-cover">
      {coverSrc ? (
        <MediaImage src={coverSrc} alt="" className="role-cover__img" />
      ) : (
        <div className="role-cover__img profile-cover__empty k-street-grid" />
      )}
      {coverSrc ? <div className="role-cover__scrim" aria-hidden /> : null}
      <div className={`role-cover__title${coverSrc ? '' : ' role-cover__title--plain'}`}>
        <p className="k-meta role-cover__status">{statusText}</p>
        <h1 className="role-cover__name k-display">{role.title}</h1>
      </div>
    </div>
  );

  return (
    <div className="role-view">
      <div className="role-view__main">
      {role.status === 'past' ? (
        <Corners size={16} className="role-cover-frame">
          {cover}
        </Corners>
      ) : (
        cover
      )}
      {role.description ? <p className="role-view__desc">{role.description}</p> : <p className="role-view__desc">Sem descrição.</p>}
      <Ficha className="role-view__ficha">
        <FichaRow label="Quando" mono>
          {formatMeta(role.date, role.time)}
        </FichaRow>
        <FichaRow label="Onde">{role.location || 'Local a combinar'}</FichaRow>
        <FichaRow label="Categoria">{role.category}</FichaRow>
        <FichaRow label="Custo">{formatMoney(role.estimatedCost) ?? 'A combinar'}</FichaRow>
        <FichaRow label="Tags">{role.tags?.length ? role.tags.map((tag) => `#${tag}`).join(' ') : 'Sem tags'}</FichaRow>
      </Ficha>
      <div className="role-view__people">
        <AvatarStack
          people={role.attendances.map((item) => ({ src: item.user?.avatar, name: item.user?.name }))}
          label="Participantes"
        />
        <p className="k-meta">
          {role.goingCount} vão · {role.maybeCount} talvez · {role.notGoingCount} não vão
        </p>
        <Link href={`/perfil/${role.creator?.username}`}>{role.creator?.name}</Link>
      </div>
      <div className="role-view__rsvp">
        <Button variant={role.myAttendance === 'going' ? 'primary' : 'secondary'} onClick={() => attendance('going')}>
          {role.myAttendance === 'going' ? 'Confirmado' : 'Bora'}
        </Button>
        <Button variant={role.myAttendance === 'maybe' ? 'primary' : 'secondary'} onClick={() => attendance('maybe')}>
          Talvez
        </Button>
        <Button variant={role.myAttendance === 'not_going' ? 'primary' : 'secondary'} onClick={() => attendance('not_going')}>
          Não vou
        </Button>
        {owner ? (
          <>
            <Link href={`/roles/${role.id}/editar`} className="button button--outline">
              Editar
            </Link>
            <Button variant="danger" onClick={remove}>
              Excluir
            </Button>
          </>
        ) : null}
      </div>

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
                className="h-32 w-full object-cover"
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
          <Link href={`/reviews/${role.review.id}`} className="block bg-[var(--overlay)] p-4">
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
      <aside className="role-view__side">
        {role.latitude != null && role.longitude != null ? (
          <section>
            <h2 className="k-meta role-view__side-title">Onde</h2>
            <LocationMap point={{ latitude: role.latitude, longitude: role.longitude }} avatar={null} heightClass="h-48" />
          </section>
        ) : null}
        <section className="space-y-3">
          <h2 className="k-meta role-view__side-title">Trilha</h2>
          {role.music.length === 0 ? <p>Nenhuma música colocada ainda.</p> : (
            <TrackList>
              {role.music.map((track, index) => (
                <TrackRow
                  key={track.id}
                  index={index + 1}
                  cover={track.cover}
                  title={track.title}
                  artist={`${track.artist ?? 'Playlist'} · ${track.addedBy.name}`}
                  showPlay
                  spotifyUrl={track.spotifyUrl}
                  onSelect={() =>
                    setTrack({ title: track.title, artist: track.artist ?? 'Playlist', cover: track.cover, spotifyUrl: track.spotifyUrl })
                  }
                />
              ))}
            </TrackList>
          )}
          {picking ? (
            <SpotifyPicker
              disabled={addingMusic}
              onClose={() => setPicking(false)}
              onPick={async (choice) => {
                setAddingMusic(true);
                try {
                  await api.post(`/roles/${role.id}/music`, { kind: choice.kind, spotifyId: choice.id });
                  toast.push(choice.kind === 'playlist' ? 'Playlist colocada no rolê' : 'Faixa colocada no rolê');
                  setPicking(false);
                  await load();
                } catch (err) {
                  toast.push(apiErrorMessage(err, 'Não foi possível colocar a música'), 'error');
                } finally {
                  setAddingMusic(false);
                }
              }}
            />
          ) : (
            <Button type="button" variant="secondary" onClick={() => setPicking(true)}>
              Colocar música do Spotify
            </Button>
          )}
        </section>
      </aside>
    </div>
  );
}

function statusLine(status: 'upcoming' | 'ongoing' | 'past' | 'cancelled') {
  if (status === 'past') return 'Já rolou';
  if (status === 'cancelled') return 'Cancelado';
  if (status === 'ongoing') return 'Acontecendo agora';
  return 'Vai rolar';
}

function daysUntil(date?: string | null) {
  if (!date) return null;
  const day = new Date(`${date.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(day.getTime())) return null;
  const diff = Math.round((day.getTime() - Date.now()) / 86_400_000);
  if (diff < 0) return null;
  if (diff === 0) return 'hoje';
  if (diff === 1) return 'em 1 dia';
  return `em ${diff} dias`;
}
