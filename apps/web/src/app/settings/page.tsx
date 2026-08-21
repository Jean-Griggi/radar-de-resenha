'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input, Textarea } from '@/components/Field';
import { RequireAuth } from '@/components/RequireAuth';
import { useToast } from '@/components/Toast';
import { api, apiErrorMessage } from '@/lib/api';
import { postFile } from '@/lib/upload';
import { setUser, type AuthUser } from '@/lib/auth';

export default function SettingsPage() {
  const toast = useToast();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });

  useEffect(() => {
    api.get<AuthUser>('/auth/me').then(({ data }) => {
      setMe(data);
      setUser(data);
    });
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
      toast.push(apiErrorMessage(err, 'Falha no envio do arquivo'), 'error');
    }
  }

  async function changePassword(event: FormEvent) {
    event.preventDefault();
    try {
      await api.put('/auth/password', password);
      setPassword({ currentPassword: '', newPassword: '' });
      toast.push('Senha alterada');
    } catch (err) {
      toast.push(apiErrorMessage(err), 'error');
    }
  }

  if (!me) {
    return (
      <RequireAuth>
        <p>Carregando...</p>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <h1 className="mb-6 text-2xl font-semibold sm:text-3xl">Configurações</h1>
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
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload('avatar', e.target.files[0])} />
          </Field>
          <Button variant="ghost" onClick={() => api.delete('/users/me/avatar').then(({ data }) => { setMe(data); setUser(data); })}>
            Remover avatar
          </Button>
          <Field label="Capa">
            <Input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload('cover', e.target.files[0])} />
          </Field>
          <Button variant="ghost" onClick={() => api.delete('/users/me/cover').then(({ data }) => { setMe(data); setUser(data); })}>
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
            <input type="checkbox" checked={Boolean((me as AuthUser & { isPublic?: boolean }).isPublic ?? true)} onChange={(e) => setMe({ ...me, isPublic: e.target.checked } as AuthUser)} />
            Perfil público
          </label>
          <Button onClick={save}>Salvar privacidade</Button>
        </section>

        <section className="card p-6">
          <h2 className="text-lg font-medium">Música</h2>
          <p className="mt-2 text-sm text-slate-400">Conecte o Spotify em Música para ver a faixa atual e playlists.</p>
          <a href="/music" className="mt-3 inline-block text-violet-300">
            Ir para música
          </a>
        </section>
      </div>
    </RequireAuth>
  );
}
