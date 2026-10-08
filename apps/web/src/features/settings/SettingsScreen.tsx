'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import type { UserProfile } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Card';
import { Field, Input, Textarea } from '@/components/Field';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { postFile, shrinkImage, IMAGE_ACCEPT } from '@/lib/upload';
import { setUser, type AuthUser } from '@/lib/auth';
import { LocationMap } from '@/features/users/LocationMap';
import {
  clearLocationBody,
  profileLocationFields,
  visiblePlaceName,
  visiblePoint,
  type MapPoint,
} from '@/features/users/mapPoint';

type PendingImage = { file: File; url: string };

export function SettingsScreen() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ avatar?: PendingImage; cover?: PendingImage }>({});
  const [savingMedia, setSavingMedia] = useState(false);
  const [error, setError] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [draftPoint, setDraftPoint] = useState<MapPoint | null>(null);
  const [savedPoint, setSavedPoint] = useState<MapPoint | null>(null);
  const [draftPlaceName, setDraftPlaceName] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get<AuthUser>('/auth/me', { signal: controller.signal })
      .then(async ({ data }) => {
        if (controller.signal.aborted) return;
        setMe(data);
        setUser(data);
        setProfileUsername(data.username);
        const profile = await api.get<UserProfile>(`/users/${data.username}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        const point = visiblePoint(profile.data);
        setSavedPoint(point);
        setDraftPoint(point);
        setDraftPlaceName(visiblePlaceName(profile.data) ?? '');
        setError('');
      })
      .catch((err) => {
        if (isApiCanceled(err)) return;
        setError(apiErrorMessage(err, 'Não foi possível carregar as configurações'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  async function save(event?: FormEvent) {
    event?.preventDefault();
    if (!me) return;
    try {
      const location = profileLocationFields(draftPoint, draftPoint ? draftPlaceName : undefined);
      const { data } = await api.put<AuthUser>('/users/me', location ? { ...me, ...location } : me);
      setMe(data);
      setUser(data);
      setProfileUsername(data.username);
      const profile = await api.get<UserProfile>(`/users/${data.username}`);
      const point = visiblePoint(profile.data);
      setSavedPoint(point);
      setDraftPoint(point);
      setDraftPlaceName(visiblePlaceName(profile.data) ?? '');
      toast.push('Perfil atualizado');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(
    () => () => {
      for (const item of Object.values(pendingRef.current)) URL.revokeObjectURL(item.url);
    },
    [],
  );

  function pick(kind: 'avatar' | 'cover', file: File) {
    setPending((current) => {
      if (current[kind]) URL.revokeObjectURL(current[kind].url);
      return { ...current, [kind]: { file, url: URL.createObjectURL(file) } };
    });
  }

  function discard(kind: 'avatar' | 'cover') {
    setPending((current) => {
      if (current[kind]) URL.revokeObjectURL(current[kind].url);
      const { [kind]: _removed, ...rest } = current;
      return rest;
    });
  }

  async function confirmMedia() {
    setSavingMedia(true);
    for (const kind of ['avatar', 'cover'] as const) {
      const item = pending[kind];
      if (!item) continue;
      if (await upload(kind, item.file)) discard(kind);
    }
    setSavingMedia(false);
  }

  async function upload(kind: 'avatar' | 'cover', file: File): Promise<boolean> {
    try {
      const small = await shrinkImage(file, kind === 'avatar' ? 800 : 1800);
      const data = await postFile<AuthUser>(`/users/me/${kind}`, kind, small);
      setMe(data);
      setUser(data);
      toast.push(kind === 'avatar' ? 'Foto de perfil salva' : 'Capa salva');
      return true;
    } catch (err) {
      if (!isApiCanceled(err)) toast.push(apiErrorMessage(err, 'Falha no envio do arquivo'), 'error');
      return false;
    }
  }

  async function removeMedia(kind: 'avatar' | 'cover') {
    try {
      const { data } = await api.delete<AuthUser>(`/users/me/${kind}`);
      setMe(data);
      setUser(data);
      toast.push(kind === 'avatar' ? 'Foto de perfil removida' : 'Capa removida');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Não foi possível remover'), 'error');
    }
  }

  async function clearLocation() {
    if (!profileUsername) return;
    try {
      await api.put('/users/me', clearLocationBody());
      const { data } = await api.get<UserProfile>(`/users/${profileUsername}`);
      const point = visiblePoint(data);
      setSavedPoint(point);
      setDraftPoint(point);
      setDraftPlaceName(visiblePlaceName(data) ?? '');
      toast.push(point ? 'Não foi possível limpar a localização' : 'Localização removida', point ? 'error' : 'success');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    try {
      await api.put('/auth/password', password);
      setPassword({ currentPassword: '', newPassword: '' });
      toast.push('Senha alterada');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Configurações</h1>
      {loading ? (
        <div className="card space-y-4 p-6">
          <Skeleton className="h-5 w-32" />
          <Input skeleton />
          <Input skeleton />
          <Button skeleton />
        </div>
      ) : null}
      {error ? <p className="mb-5 text-[var(--danger)]">{error}</p> : null}
      {!loading && !error && me ? (
        <div className="grid gap-5">
          <form onSubmit={save} className="card space-y-4 p-6">
            <h2 className="text-lg font-medium">Conta</h2>
            <Field label="Nome">
              <Input value={me.name} onChange={(e) => setMe({ ...me, name: e.target.value })} />
            </Field>
            <Field label="Username">
              <Input value={me.username} onChange={(e) => setMe({ ...me, username: e.target.value })} />
            </Field>
            <Field label="E-mail">
              <Input type="email" value={me.email} onChange={(e) => setMe({ ...me, email: e.target.value })} />
            </Field>
            <Button type="submit">Salvar conta</Button>
          </form>

          <section className="card space-y-4 p-6">
            <h2 className="text-lg font-medium">Perfil</h2>
            <Field label="Foto de perfil">
              <Input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pick('avatar', file);
                  e.target.value = '';
                }}
              />
            </Field>
            <Button variant="ghost" onClick={() => removeMedia('avatar')}>
              Remover avatar
            </Button>
            <Field label="Capa">
              <Input
                type="file"
                accept={IMAGE_ACCEPT}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) pick('cover', file);
                  e.target.value = '';
                }}
              />
              <p className="mt-1 text-xs text-muted">JPEG, PNG, WebP ou HEIC. No iPhone, se não abrir, envie JPEG.</p>
            </Field>
            <Button variant="ghost" onClick={() => removeMedia('cover')}>
              Remover capa
            </Button>
            {pending.avatar || pending.cover ? (
              <div className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--overlay)] p-4">
                <p className="text-sm font-medium">Prévia: assim vai ficar no seu perfil</p>
                <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
                  <div className="h-28 bg-[var(--brand-red-dark)] sm:h-40">
                    {(pending.cover?.url ?? me.cover) ? (
                      <img src={pending.cover?.url ?? me.cover ?? ''} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="flex items-end gap-3 bg-[var(--bg-elevated)] px-4 pb-4">
                    <div className="-mt-8">
                      <Avatar src={pending.avatar?.url ?? me.avatar} name={me.name} size="xl" glow />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{me.name}</p>
                      <p className="truncate text-sm text-muted">@{me.username}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={confirmMedia} disabled={savingMedia}>
                    {savingMedia ? 'Salvando…' : 'Salvar'}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      discard('avatar');
                      discard('cover');
                    }}
                    disabled={savingMedia}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            ) : null}
            <Field label="Bio">
              <Textarea value={me.bio ?? ''} onChange={(e) => setMe({ ...me, bio: e.target.value })} />
            </Field>
            <Field label="Cidade">
              <Input value={me.city ?? ''} onChange={(e) => setMe({ ...me, city: e.target.value })} />
            </Field>
            <div className="space-y-3">
              <p className="text-label text-muted">Localização</p>
              <LocationMap
                point={draftPoint}
                avatar={me.avatar}
                placeName={draftPoint ? draftPlaceName : null}
                interactive
                onPick={setDraftPoint}
              />
              {draftPoint ? (
                <Field label="Nome do lugar">
                  <Input
                    value={draftPlaceName}
                    maxLength={40}
                    placeholder="casa"
                    onChange={(e) => setDraftPlaceName(e.target.value)}
                  />
                </Field>
              ) : null}
              <Button variant="ghost" disabled={!savedPoint} onClick={clearLocation}>
                Limpar localização
              </Button>
            </div>
            <Button onClick={save}>Salvar perfil</Button>
          </section>

          <form onSubmit={changePassword} className="card space-y-4 p-6">
            <h2 className="text-lg font-medium">Senha</h2>
            <Field label="Senha atual">
              <Input type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} />
            </Field>
            <Field label="Nova senha">
              <Input type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} minLength={8} required />
            </Field>
            <Button type="submit">Alterar senha</Button>
          </form>

          <section className="card space-y-3 p-6">
            <h2 className="text-lg font-medium">Privacidade</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={me.isPublic}
                onChange={(e) => setMe({ ...me, isPublic: e.target.checked })}
              />
              Perfil público
            </label>
            <Button onClick={save}>Salvar privacidade</Button>
          </section>

          <section className="card p-6">
            <h2 className="text-lg font-medium">Música</h2>
            <p className="mt-2 text-sm text-muted">Conecte o Spotify em Música para ver a faixa atual e playlists.</p>
            <a href="/music" className="mt-3 inline-block text-[var(--accent)]">
              Ir para música
            </a>
          </section>
        </div>
      ) : null}
    </>
  );
}
