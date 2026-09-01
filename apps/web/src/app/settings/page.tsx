'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/Card';
import { Field, Input, Textarea } from '@/components/Field';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { postFile, IMAGE_ACCEPT } from '@/lib/upload';
import { setUser, type AuthUser } from '@/lib/auth';

export default function SettingsPage() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get<AuthUser>('/auth/me', { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setMe(data);
        setUser(data);
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
      const { data } = await api.put<AuthUser>('/users/me', me);
      setMe(data);
      setUser(data);
      toast.push('Perfil atualizado');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  async function upload(kind: 'avatar' | 'cover', file: File) {
    try {
      const data = await postFile<AuthUser>(`/users/me/${kind}`, kind, file);
      setMe(data);
      setUser(data);
      toast.push(kind === 'avatar' ? 'Foto de perfil salva' : 'Capa salva');
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Falha no envio do arquivo'), 'error');
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
    <RequireAuth>
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
              <Input type="file" accept={IMAGE_ACCEPT} onChange={(e) => e.target.files?.[0] && upload('avatar', e.target.files[0])} />
            </Field>
            <Button variant="ghost" onClick={() => removeMedia('avatar')}>
              Remover avatar
            </Button>
            <Field label="Capa">
              <Input type="file" accept={IMAGE_ACCEPT} onChange={(e) => e.target.files?.[0] && upload('cover', e.target.files[0])} />
              <p className="mt-1 text-xs text-muted">JPEG, PNG, WebP ou HEIC. No iPhone, se não abrir, envie JPEG.</p>
            </Field>
            <Button variant="ghost" onClick={() => removeMedia('cover')}>
              Remover capa
            </Button>
            <Field label="Bio">
              <Textarea value={me.bio ?? ''} onChange={(e) => setMe({ ...me, bio: e.target.value })} />
            </Field>
            <Field label="Cidade">
              <Input value={me.city ?? ''} onChange={(e) => setMe({ ...me, city: e.target.value })} />
            </Field>
            <Button onClick={save}>Salvar perfil</Button>
          </section>

          <form onSubmit={changePassword} className="card space-y-4 p-6">
            <h2 className="text-lg font-medium">Senha</h2>
            <Field label="Senha atual">
              <Input type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} />
            </Field>
            <Field label="Nova senha">
              <Input type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} />
            </Field>
            <Button type="submit">Alterar senha</Button>
          </form>

          <section className="card space-y-3 p-6">
            <h2 className="text-lg font-medium">Privacidade</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean((me as AuthUser & { isPublic?: boolean }).isPublic ?? true)}
                onChange={(e) => setMe({ ...me, isPublic: e.target.checked } as AuthUser)}
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
    </RequireAuth>
  );
}
