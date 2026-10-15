'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CircleAlert } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { Achievement, UserProfile } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { Corners } from '@/components/Corners';
import { Tabs } from '@/components/Tabs';
import { MediaImage } from '@/components/MediaImage';
import { Mesa, MesaViewer, useMesaViewer, type MesaEntry } from '@/components/Mesa';
import { PhotoViewer } from '@/features/media/PhotoViewer';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { getUser, setUser } from '@/lib/auth';
import { initials } from '@/lib/format';
import { LocationMap } from '@/features/users/LocationMap';
import { visiblePlaceName, visiblePoint } from '@/features/users/mapPoint';

const TABS = ['Resumo', 'Rolês', 'Resenhas', 'Fotos', 'Áudios', 'Música', 'Estatísticas'] as const;

export function ProfileScreen() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const toast = useToast();
  const mesa = useMesaViewer();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Resumo');
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const username = params.username;
  const usernameRef = useRef(username);
  usernameRef.current = username;

  async function load(signal?: AbortSignal) {
    const target = usernameRef.current;
    const { data } = await api.get<UserProfile>(
      `/users/${target}`,
      signal ? { signal } : undefined,
    );
    if (usernameRef.current !== target) return;
    const extra = await api.get(`/users/${target}/content`, signal ? { signal } : undefined);
    if (usernameRef.current !== target) return;
    setProfile(data);
    setContent(extra.data);
    setError('');
    if (data.isMe) {
      const current = getUser();
      if (current) {
        setUser({
          ...current,
          id: data.id,
          name: data.name,
          username: data.username,
          avatar: data.avatar,
          cover: data.cover,
          bio: data.bio,
          city: data.city,
          isPublic: data.isPublic,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setProfile(null);
    setContent(null);
    setError('');
    load(controller.signal)
      .catch((err) => {
        if (isApiCanceled(err)) return;
        setError(apiErrorMessage(err, 'Não foi possível carregar o perfil'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [username]);

  if (!profile) {
    return (
      <>
        {loading ? (
          <div className="k-profile k-profile--loading" aria-busy="true">
            <Skeleton className="k-profile__skel-cover" />
            <div className="mt-4 flex items-center gap-4">
              <Skeleton variant="dot" className="h-20 w-20" />
              <div className="min-w-0 flex-1 space-y-3">
                <Skeleton variant="line" />
                <Skeleton variant="line" className="w-2/3" />
              </div>
            </div>
          </div>
        ) : null}
        {error ? (
          <p role="alert" className="k-profile__error">
            <CircleAlert size={20} aria-hidden />
            {error}
          </p>
        ) : null}
        {!loading && !error ? <EmptyState title="Perfil não encontrado." /> : null}
      </>
    );
  }

  const meId = getUser()?.id;
  const point = visiblePoint(profile);
  const rel = profile.friendship;
  const isFriend = rel?.status === 'accepted';
  const isPendingIn = rel?.status === 'pending' && rel.receiverId === meId;
  const isPendingOut = rel?.status === 'pending' && rel.requesterId === meId;

  function goBack() {
    if (window.history.length > 1) router.back();
    else router.push('/');
  }

  async function follow() {
    try {
      if (profile!.isFollowing) await api.delete(`/users/${profile!.id}/follow`);
      else await api.post(`/users/${profile!.id}/follow`);
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  async function runFriend(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  function addFriend() {
    return runFriend(() => api.post('/friends/requests', { userId: profile!.id }));
  }

  function acceptFriend() {
    return runFriend(() =>
      api.put(`/friends/requests/${profile!.friendship!.id}`, { status: 'accepted' }),
    );
  }

  function rejectFriend() {
    return runFriend(() =>
      api.put(`/friends/requests/${profile!.friendship!.id}`, { status: 'rejected' }),
    );
  }

  function cancelFriend() {
    return runFriend(() => api.delete(`/friends/requests/${profile!.friendship!.id}`));
  }

  function unfriend() {
    return runFriend(() => api.delete(`/friends/${profile!.friendship!.id}`));
  }

  const profilePhotos = (content?.photos as { id: string; url: string }[] | undefined) ?? [];
  const openPhoto = profilePhotos.find((photo) => `photo-${photo.id}` === mesa.openId);

  function photoEntry(photo: { id: string; url: string }): MesaEntry {
    return {
      id: `photo-${photo.id}`,
      label: `Foto de ${profile!.name}`,
      image: photo.url,
      avatar: { src: profile!.avatar, name: profile!.name },
    };
  }

  return (
    <>
      <div className="k-profile">
        <div className="k-profile__bar" aria-hidden>
          <div className="k-profile__bar-bg" />
          <p className="k-profile__bar-name k-display">{profile.name}</p>
        </div>
        <div className="profile-cover">
          <div className="profile-cover__media">
            {profile.cover ? (
              <MediaImage
                src={profile.cover}
                alt=""
                className="h-full w-full object-cover"
                fallbackClassName="profile-cover__empty k-street-grid"
              />
            ) : (
              <div className="profile-cover__empty k-street-grid">
                <span className="profile-cover__initials k-display" aria-hidden>
                  {initials(profile.name)}
                </span>
              </div>
            )}
          </div>
          <div className="k-profile__scrim" aria-hidden />
          <button type="button" className="k-profile__back" aria-label="Voltar" onClick={goBack}>
            <ArrowLeft size={20} aria-hidden />
          </button>
        </div>
        <Corners size={18} className="profile-id">
          <div className="profile-id__row">
            <div className="min-w-0">
              <h1 className="profile-id__name k-display">{profile.name}</h1>
              <p className="k-meta">
                @{profile.username}
                {profile.city ? ` · ${profile.city}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.isMe ? (
                <Link href="/settings" className="button button--outline">
                  Editar perfil
                </Link>
              ) : (
                <>
                  <Link href={`/chat/${profile.username}`} className="button button--secondary">
                    Mensagem
                  </Link>
                  {isFriend ? (
                    <>
                      <Button variant="secondary" disabled={busy} onClick={unfriend}>
                        Amigos
                      </Button>
                      <Button variant="ghost" disabled={busy} onClick={unfriend}>
                        Desfazer
                      </Button>
                    </>
                  ) : isPendingIn ? (
                    <>
                      <Button variant="secondary" disabled={busy} onClick={acceptFriend}>
                        Aceitar
                      </Button>
                      <Button variant="secondary" disabled={busy} onClick={rejectFriend}>
                        Recusar
                      </Button>
                    </>
                  ) : isPendingOut ? (
                    <>
                      <Button variant="secondary" disabled={busy} onClick={cancelFriend}>
                        Pedido enviado
                      </Button>
                      <Button variant="ghost" disabled={busy} onClick={cancelFriend}>
                        Cancelar
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" disabled={busy} onClick={addFriend}>
                      Adicionar
                    </Button>
                  )}
                  <Button onClick={follow}>{profile.isFollowing ? 'Seguindo' : 'Seguir'}</Button>
                </>
              )}
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-fg">{profile.bio || 'Sem bio ainda.'}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Rolês', profile.stats.roles],
              ['Resenhas', profile.stats.reviews],
              ['Amigos', profile.stats.friends],
              ['Seguidores', profile.stats.followers],
              ['Seguindo', profile.stats.following],
            ].map(([label, value]) => (
              <div key={String(label)} className="profile-stat">
                <p className="text-xl font-semibold">{value}</p>
                <p className="k-meta">{label}</p>
              </div>
            ))}
          </div>
        </Corners>
        <div className="k-profile__avatar">
          <Avatar src={profile.avatar} name={profile.name} size="xl" />
        </div>

        {point || profile.isMe ? (
          <section className="card mt-4 p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="font-medium">Localização</h2>
              {profile.isMe ? (
                <Link href="/mapa" className="text-sm text-muted">
                  Pessoas no mapa
                </Link>
              ) : null}
            </div>
            {point ? (
              <LocationMap
                point={point}
                avatar={profile.avatar}
                placeName={visiblePlaceName(profile)}
              />
            ) : (
              <p className="text-sm text-muted">Sem ponto neste perfil.</p>
            )}
          </section>
        ) : null}

        <Tabs
          className="k-profile__tabs mt-4"
          label="Seções do perfil"
          items={TABS.map((item) => ({ value: item, label: item }))}
          value={tab}
          onChange={setTab}
        />

        <div className="mt-5">
          {tab === 'Resumo' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <section className="card p-5">
                <h2 className="mb-3 font-medium">Conquistas</h2>
                <ul className="space-y-2">
                  {profile.achievements.map((item: Achievement) => (
                    <li
                      key={item.slug}
                      className={`px-3 py-2 text-sm ${item.unlockedAt ? 'bg-[color-mix(in_srgb,var(--k-brand)_12%,transparent)]' : 'bg-[color-mix(in_srgb,var(--k-text)_5%,transparent)] text-muted'}`}
                    >
                      {item.name} — {item.description}
                    </li>
                  ))}
                </ul>
              </section>
              <section className="card p-5">
                <h2 className="mb-3 font-medium">Memórias recentes</h2>
                {(content?.roles as { id: string; title: string }[] | undefined)?.length ? (
                  <ul className="space-y-2">
                    {(content?.roles as { id: string; title: string }[]).slice(0, 5).map((role) => (
                      <li key={role.id}>
                        <Link href={`/roles/${role.id}`}>{role.title}</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="Nenhum rolê neste perfil." />
                )}
              </section>
            </div>
          ) : null}
          {tab === 'Rolês' ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {((content?.roles as { id: string; title: string; location?: string }[]) ?? []).map(
                (role) => (
                  <Corners as="li" key={role.id} size={16} className="profile-tile">
                    <Link href={`/roles/${role.id}`} className="k-display profile-tile__title">
                      {role.title}
                    </Link>
                    <p className="k-meta">{role.location}</p>
                  </Corners>
                ),
              )}
            </ul>
          ) : null}
          {tab === 'Resenhas' ? (
            <ul className="space-y-3">
              {((content?.reviews as { id: string; title: string; content: string }[]) ?? []).map(
                (item) => (
                  <li key={item.id} className="card p-4">
                    <Link href={`/reviews/${item.id}`}>{item.title}</Link>
                    <p className="line-clamp-2 text-sm text-muted">{item.content}</p>
                  </li>
                ),
              )}
            </ul>
          ) : null}
          {tab === 'Fotos' ? (
            profilePhotos.length > 0 ? (
              <Mesa
                label={`Fotos de ${profile.name}`}
                entries={profilePhotos.map(photoEntry)}
                onOpen={mesa.open}
              />
            ) : (
              <EmptyState title="Nenhuma foto neste perfil." />
            )
          ) : null}
          {tab === 'Áudios' ? (
            <div className="space-y-3">
              {((content?.audios as { id: string; name: string; url: string }[]) ?? []).map(
                (audio) => (
                  <div key={audio.id} className="card p-4">
                    <p>🎙️ {audio.name}</p>
                    <audio controls src={audio.url} className="mt-2 w-full" />
                  </div>
                ),
              )}
            </div>
          ) : null}
          {tab === 'Música' ? (
            <ul className="space-y-2">
              {((content?.music as { id: string; title: string; artist: string }[]) ?? []).map(
                (track) => (
                  <li key={track.id} className="card p-3">
                    {track.title} — {track.artist}
                  </li>
                ),
              )}
            </ul>
          ) : null}
          {tab === 'Estatísticas' ? (
            <Button variant="secondary" onClick={() => router.push('/stats')}>
              Ver dashboard completo
            </Button>
          ) : null}
        </div>
      </div>

      <MesaViewer open={Boolean(openPhoto)} onClose={mesa.close} label={`Fotos de ${profile.name}`}>
        {openPhoto ? (
          <PhotoViewer
            title={`Fotos de ${profile.name}`}
            photos={profilePhotos.map((photo) => ({
              id: photo.id,
              url: photo.url,
              authorName: profile.name,
            }))}
            startId={openPhoto.id}
            transitionId={mesa.openId ?? ''}
          />
        ) : null}
      </MesaViewer>
    </>
  );
}
