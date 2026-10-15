'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Corners } from '@/components/Corners';
import { Field, FormError, Input } from '@/components/Field';
import { api, apiErrorMessage } from '@/lib/api';
import { AuthStage } from './AuthStage';

export function RedefinirSenhaScreen() {
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
    <AuthStage>
      <Corners size={22} className={`auth-panel k-glass${error ? ' auth-panel--error' : ''}`}>
        <h1 className="auth-panel__title k-display">Nova senha</h1>
        <p className="auth-panel__lead">Escolha uma senha com pelo menos 8 caracteres.</p>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Nova senha">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required autoComplete="new-password" />
          </Field>
          <Field label="Confirmar senha">
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={8} required autoComplete="new-password" />
          </Field>
          {error ? <FormError>{error}</FormError> : null}
          <Button type="submit" loading={loading} className="w-full">
            {loading ? 'Salvando...' : 'Salvar senha'}
          </Button>
          <p className="auth-panel__links">
            <Link href="/login">Voltar ao login</Link>
          </p>
        </form>
      </Corners>
    </AuthStage>
  );
}
