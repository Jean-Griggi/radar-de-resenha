'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Achievement, UserProfile } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { getUser, setUser } from '@/lib/auth';

const TABS = ['Resumo', 'Rolês', 'Resenhas', 'Fotos', 'Áudios', 'Música', 'Estatísticas'] as const;

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const router = useRouter();
  const toast = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Resumo');
  const [content, setContent] = useState<Record<string, unknown> | null>(null);

  async function load() {
    const { data } = await api.get<UserProfile>(`/users/${params.username}`);
    setProfile(data);
    const extra = await api.get(`/users/${params.username}/content`);
    setContent(extra.data);
    if (data.isMe) setUser({ ...getUser()!, ...data });
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, [params.username]);

  if (!profile) {
    return (
      <RequireAuth>
        <Skeleton className="h-72" />
      </RequireAuth>
    );
  }

  async function follow() {
    try {
      if (profile!.isFollowing) await api.delete(`/users/${profile!.id}/follow`);
      else await api.post(`/users/${profile!.id}/follow`);
      await load();
    } catch (err) {
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  async function friend() {
    try {
      if (!profile!.friendship) await api.post('/friends/requests', { userId: profile!.id });
      else if (profile!.friendship.status === 'pending' && profile!.friendship.receiverId === getUser()?.id) {
        await api.put(`/friends/requests/${profile!.friendship.id}`, { status: 'accepted' });
      } else if (profile!.friendship.status === 'accepted') {
        await api.delete(`/friends/${profile!.friendship.id}`);
      }
      await load();
    } catch (err) {
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  return (
    <RequireAuth>
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <div className="relative h-32 bg-[#151d2e] sm:h-48">
          {profile.cover ? (
            <img src={profile.cover} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[linear-gradient(120deg,#4c1d95,#db2777,#38bdf8)]" />
          )}
        </div>
        <div className="bg-[#10182c] px-4 pb-5 sm:px-6 sm:pb-6">
          <div className="-mt-10 flex flex-col gap-4 sm:-mt-12 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
            <div className="flex items-end gap-3 sm:gap-4">
              <Avatar src={profile.avatar} name={profile.name} size="xl" glow />
              <div className="min-w-0">
                <h1 className="text-2xl font-semibold sm:text-3xl">{profile.name}</h1>
                <p className="text-slate-400">@{profile.username}</p>
                {profile.city ? <p className="text-sm text-slate-400">{profile.city}</p> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {profile.isMe ? (
                <Link href="/settings" className="rounded-xl border border-white/10 px-4 py-2 text-sm">
                  Editar perfil
                </Link>
              ) : (
                <>
                  <Button variant="secondary" onClick={friend}>
                    {profile.friendship?.status === 'accepted'
                      ? 'Amigos'
                      : profile.friendship?.status === 'pending'
                        ? 'Pedido enviado'
                        : 'Adicionar'}
                  </Button>
                  <Button onClick={follow}>{profile.isFollowing ? 'Seguindo' : 'Seguir'}</Button>
                </>
              )}
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-slate-300">{profile.bio || 'Sem bio ainda.'}</p>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ['Rolês', profile.stats.roles],
              ['Resenhas', profile.stats.reviews],
              ['Amigos', profile.stats.friends],
              ['Seguidores', profile.stats.followers],
              ['Seguindo', profile.stats.following],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-white/5 p-3 text-center">
                <p className="text-xl font-semibold">{value}</p>
                <p className="text-xs text-slate-400">{label}</p>
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
            className={`shrink-0 rounded-full px-4 py-2 text-sm ${tab === item ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-300'}`}
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
                  <li key={item.slug} className={`rounded-xl px-3 py-2 text-sm ${item.unlockedAt ? 'bg-violet-500/20' : 'bg-white/5 text-slate-500'}`}>
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
                <p className="text-sm text-slate-400">{role.location}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === 'Resenhas' ? (
          <ul className="space-y-3">
            {((content?.reviews as { id: string; title: string; content: string }[]) ?? []).map((item) => (
              <li key={item.id} className="card p-4">
                <Link href={`/reviews/${item.id}`}>{item.title}</Link>
                <p className="line-clamp-2 text-sm text-slate-400">{item.content}</p>
              </li>
            ))}
          </ul>
        ) : null}
        {tab === 'Fotos' ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {((content?.photos as { id: string; url: string }[]) ?? []).map((photo) => (
              <img key={photo.id} src={photo.url} alt="" className="h-36 w-full rounded-xl object-cover" />
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
