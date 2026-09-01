'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { BrandWordmark } from '@/components/BrandWordmark';
import { Field, Input } from '@/components/Field';
import { ThemeToggle } from '@/components/Theme';
import { api, apiErrorMessage } from '@/lib/api';

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<{ ok: boolean; resetUrl?: string }>('/auth/forgot-password', { email });
      setDone(true);
      setResetUrl(data.resetUrl ?? '');
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível enviar o e-mail'));
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
      <h1 className="mt-2 text-3xl font-semibold text-fg sm:text-4xl">Esqueceu a senha?</h1>
      <p className="mt-3 mb-8 text-muted">Informe o e-mail da conta. Se ele existir, mandamos um link de redefinição.</p>
      {done ? (
        <div className="card space-y-4 p-6">
          <p className="text-sm text-fg">Se o e-mail existir, o link já foi enviado. Confira a caixa de entrada e o spam.</p>
          {resetUrl ? (
            <p className="text-sm text-muted">
              SMTP ainda não está configurado, então use este link local:{' '}
              <Link href={resetUrl} className="break-all text-[var(--accent)] hover:underline">
                redefinir senha
              </Link>
            </p>
          ) : null}
          <Link href="/login" className="block text-center text-sm text-[var(--accent)] hover:underline">
            Voltar ao login
          </Link>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="card composer space-y-4 p-6">
          <Field label="E-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}
          <Button type="submit" loading={loading} className="w-full">
            {loading ? 'Enviando...' : 'Enviar link'}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-sm text-muted">
        Lembrou a senha?{' '}
        <Link href="/login" className="font-semibold text-[var(--primary)] hover:underline">
          Entrar
        </Link>
      </p>
    </main>
  );
}
