'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { Achievement, UserProfile } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { MediaImage } from '@/components/MediaImage';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { getUser, setUser } from '@/lib/auth';

const TABS = ['Resumo', 'Rolês', 'Resenhas', 'Fotos', 'Áudios', 'Música', 'Estatísticas'] as const;

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const toast = useToast();
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
    const { data } = await api.get<UserProfile>(`/users/${target}`, signal ? { signal } : undefined);
    if (usernameRef.current !== target) return;
    const extra = await api.get(`/users/${target}/content`, signal ? { signal } : undefined);
    if (usernameRef.current !== target) return;
    setProfile(data);
    setContent(extra.data);
    setError('');
    if (data.isMe) setUser({ ...getUser()!, ...data });
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
      <RequireAuth>
        {loading ? <Skeleton className="h-72" /> : null}
        {error ? <p className="text-[var(--danger)]">{error}</p> : null}
        {!loading && !error ? <EmptyState title="Perfil não encontrado." /> : null}
      </RequireAuth>
    );
  }

  const meId = getUser()?.id;
  const rel = profile.friendship;
  const isFriend = rel?.status === 'accepted';
  const isPendingIn = rel?.status === 'pending' && rel.receiverId === meId;
  const isPendingOut = rel?.status === 'pending' && rel.requesterId === meId;

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
    return runFriend(() => api.put(`/friends/requests/${profile!.friendship!.id}`, { status: 'accepted' }));
  }

  function rejectFriend() {
    return runFriend(() => api.put(`/friends/requests/${profile!.friendship!.id}`, { status: 'rejected' }));
  }

  function cancelFriend() {
    return runFriend(() => api.delete(`/friends/requests/${profile!.friendship!.id}`));
  }

  function unfriend() {
    return runFriend(() => api.delete(`/friends/${profile!.friendship!.id}`));
  }

  return (
    <RequireAuth>
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] shadow-[var(--shadow-md)]">
        <div className="relative h-32 bg-[var(--surface)] sm:h-48">
          {profile.cover ? (
            <MediaImage
              src={profile.cover}
              alt=""
              className="h-full w-full object-cover"
              fallbackClassName="h-full w-full bg-[var(--brand-red-dark)]"
            />
          ) : (
            <div className="h-full w-full media-fallback" />
          )}
        </div>
        <div className="bg-[var(--bg-elevated)] px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="relative z-10 flex items-end gap-3 sm:gap-4">
              <Avatar src={profile.avatar} name={profile.name} size="xl" glow />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold sm:text-3xl">{profile.name}</h1>
                <p className="text-muted">@{profile.username}</p>
                {profile.city ? <p className="text-sm text-muted">{profile.city}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.isMe ? (
                <Link href="/settings" className="button button--outline">
                  Editar perfil
                </Link>
              ) : (
                <>
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
                      <Button disabled={busy} onClick={acceptFriend}>
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
                <p className="text-xs text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 -mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`chip-tab ${tab === item ? 'is-active' : ''}`}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === 'Resumo' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-3 font-medium">Conquistas</h2>
              <ul className="space-y-2">
                {profile.achievements.map((item: Achievement) => (
                  <li key={item.slug} className={`rounded-xl px-3 py-2 text-sm ${item.unlockedAt ? 'bg-[var(--accent-soft)]' : 'bg-[var(--overlay)] text-muted'}`}>
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
            {((content?.roles as { id: string; title: string; location?: string }[]) ?? []).map((role) => (
              <li key={role.id} className="card p-4">
                <Link href={`/roles/${role.id}`}>{role.title}</Link>
                <p className="text-sm text-muted">{role.location}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === 'Resenhas' ? (
          <ul className="space-y-3">
            {((content?.reviews as { id: string; title: string; content: string }[]) ?? []).map((item) => (
              <li key={item.id} className="card p-4">
                <Link href={`/reviews/${item.id}`}>{item.title}</Link>
                <p className="line-clamp-2 text-sm text-muted">{item.content}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === 'Fotos' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {((content?.photos as { id: string; url: string }[]) ?? []).map((photo) => (
              <MediaImage key={photo.id} src={photo.url} alt="" className="h-36 w-full rounded-xl object-cover" />
            ))}
          </div>
        ) : null}
        {tab === 'Áudios' ? (
          <div className="space-y-3">
            {((content?.audios as { id: string; name: string; url: string }[]) ?? []).map((audio) => (
              <div key={audio.id} className="card p-4">
                <p>🎙️ {audio.name}</p>
                <audio controls src={audio.url} className="mt-2 w-full" />
              </div>
            ))}
          </div>
        ) : null}
        {tab === 'Música' ? (
          <ul className="space-y-2">
            {((content?.music as { id: string; title: string; artist: string }[]) ?? []).map((track) => (
              <li key={track.id} className="card p-3">
                {track.title} — {track.artist}
              </li>
            ))}
          </ul>
        ) : null}
        {tab === 'Estatísticas' ? (
          <Button variant="secondary" onClick={() => router.push('/stats')}>
            Ver dashboard completo
          </Button>
        ) : null}
      </div>
    </RequireAuth>
  );
}
