'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { BrandMascot, BrandWordmark } from '@/components/BrandWordmark';
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
      <div className="mb-8 flex justify-end">
        <ThemeToggle />
      </div>
      <h1 className="sr-only">Entrar no Redesenha</h1>
      <div className="login-brand">
        <BrandMascot />
        <BrandWordmark large mascot={false} />
      </div>
      <form onSubmit={onSubmit} className="card space-y-4 p-6">
        <Field label="E-mail">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Senha">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="current-password" />
        </Field>
        <p className="-mt-2 text-right text-sm">
          <Link href="/esqueci-senha" className="text-violet-400 hover:underline">
            Esqueci a senha
          </Link>
        </p>
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
