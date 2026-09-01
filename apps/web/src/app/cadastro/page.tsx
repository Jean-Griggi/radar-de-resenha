'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { BrandWordmark } from '@/components/BrandWordmark';
import { Field, Input } from '@/components/Field';
import { ThemeToggle } from '@/components/Theme';
import { api, apiErrorMessage } from '@/lib/api';
import { getToken, setAuth, type AuthUser } from '@/lib/auth';

export default function CadastroPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace('/');
  }, [router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/register', {
        name,
        email,
        password,
        username: username || undefined,
      });
      setAuth(data.token, data.user);
      router.replace('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível cadastrar'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-screen relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 pt-14">
      <ThemeToggle className="theme-toggle-corner" />
      <div className="login-brand">
        <BrandWordmark large />
      </div>
      <h1 className="mt-2 text-3xl font-semibold text-fg sm:text-4xl">Crie seu perfil.</h1>
      <p className="mt-3 mb-8 text-muted">Registre rolês, fotos, áudios e a trilha da noite.</p>
      <form onSubmit={onSubmit} className="card composer space-y-4 p-6">
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
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
        </Field>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Cadastrando...' : 'Criar conta'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Já tem conta?{' '}
        <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
