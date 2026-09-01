'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { BrandWordmark } from '@/components/BrandWordmark';
import { Field, Input } from '@/components/Field';
import { ThemeToggle } from '@/components/Theme';
import { api, apiErrorMessage } from '@/lib/api';

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get('token') ?? '');
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('As senhas não conferem');
      return;
    }
    if (!token) {
      setError('Link inválido. Peça outro e-mail em Esqueci a senha.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      router.replace('/login');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível redefinir a senha'));
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
      <h1 className="mt-2 text-3xl font-semibold text-fg sm:text-4xl">Nova senha</h1>
      <p className="mt-3 mb-8 text-muted">Escolha uma senha com pelo menos 6 caracteres.</p>
      <form onSubmit={onSubmit} className="card composer space-y-4 p-6">
        <Field label="Nova senha">
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="new-password" />
        </Field>
        <Field label="Confirmar senha">
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required autoComplete="new-password" />
        </Field>
        {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Salvando...' : 'Salvar senha'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
          Voltar ao login
        </Link>
      </p>
    </main>
  );
}
