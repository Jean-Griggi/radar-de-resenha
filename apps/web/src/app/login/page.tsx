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
    <main className="auth-screen relative z-10 flex min-h-screen flex-col items-center px-4 pt-14">
      <ThemeToggle className="theme-toggle-corner" />
      <div className="login-brand">
        <BrandWordmark large />
      </div>
      <form onSubmit={onSubmit} className="card composer mx-auto w-full max-w-md space-y-4 p-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-h2 text-fg">Boas-vindas!</h1>
          <p className="text-sm text-muted">Entre para curtir os melhores rolês com sua galera.</p>
        </div>
        <Field label="E-mail">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </Field>
        <Field label="Senha">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="current-password" />
        </Field>
        <p className="-mt-2 text-right text-sm">
          <Link href="/esqueci-senha" className="text-[var(--accent)] hover:underline">
            Esqueci a senha
          </Link>
        </p>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
      <p className="mx-auto mt-4 w-full max-w-md text-center text-sm text-muted">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="font-semibold text-[var(--primary)] hover:underline">
          Criar conta
        </Link>
      </p>
    </main>
  );
}
