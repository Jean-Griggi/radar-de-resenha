'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Corners } from '@/components/Corners';
import { Field, FormError, Input } from '@/components/Field';
import { api, apiErrorMessage } from '@/lib/api';
import { AuthStage } from './AuthStage';
import { getUser, setAuth, type AuthUser } from './session';

export function CadastroScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getUser()) router.replace('/');
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<{ user: AuthUser; token?: string }>('/auth/register', {
        name,
        email,
        password,
        username: username || undefined,
      });
      setAuth(data.user, data.token);
      router.replace('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível cadastrar'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthStage>
      <Corners size={22} className={`auth-panel${error ? ' auth-panel--error' : ''}`}>
        <h1 className="auth-panel__title k-display">Crie seu perfil.</h1>
        <p className="auth-panel__lead">Registre rolês, fotos, áudios e a trilha da noite.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nome">
            <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} required />
          </Field>
          <Field label="Username">
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="opcional" />
          </Field>
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
          </Field>
          {error ? <FormError>{error}</FormError> : null}
          <Button type="submit" loading={loading} className="w-full">
            {loading ? 'Cadastrando...' : 'Criar conta'}
          </Button>
          <p className="auth-panel__links">
            <Link href="/login">Entrar</Link>
          </p>
        </form>
      </Corners>
    </AuthStage>
  );
}
