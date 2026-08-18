'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Input } from '@/components/Field';
import { ThemeToggle } from '@/components/Theme';
import { api, apiErrorMessage } from '@/lib/api';
import { getToken, setAuth, type AuthUser } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
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
      const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
      setAuth(data.token, data.user);
      router.replace('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'E-mail ou senha inválidos'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="mb-6 flex justify-end">
        <ThemeToggle />
      </div>
      <p className="text-xs tracking-[0.35em] text-violet-400">RESENHÔMETRO</p>
      <h1 className="mt-2 text-3xl font-semibold text-fg sm:text-4xl">Sua vida social, em um só lugar.</h1>
      <p className="mt-3 mb-8 text-muted">Entre para ver rolês, memórias e a trilha da galera.</p>
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <Field label="E-mail">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Senha">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="current-password" />
        </Field>
        {error ? <p className="text-sm text-rose-300">{error}</p> : null}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Não tem conta?{' '}
        <Link href="/cadastro" className="text-violet-400 hover:underline">
          Cadastre-se
        </Link>
      </p>
    </main>
  );
}
