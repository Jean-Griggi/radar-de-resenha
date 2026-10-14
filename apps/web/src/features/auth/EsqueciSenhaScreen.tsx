'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { Corners } from '@/components/Corners';
import { Field, FormError, Input } from '@/components/Field';
import { api, apiErrorMessage } from '@/lib/api';
import { AuthStage } from './AuthStage';

export function EsqueciSenhaScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setDone(true);
    } catch (err) {
      setError(apiErrorMessage(err, 'Não foi possível fazer o pedido. Tente de novo.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthStage>
      <Corners size={22} className={`auth-panel${error ? ' auth-panel--error' : ''}`}>
        <h1 className="auth-panel__title k-display">Esqueceu a senha?</h1>
        <p className="auth-panel__lead">Informe o e-mail da conta e peça o link de redefinição.</p>
        {done ? (
          <div className="space-y-4">
            <p>
              Pedido recebido. Se esse e-mail tiver conta, o link de redefinição chega por e-mail. Confira a caixa de entrada e o spam.
            </p>
            <p className="auth-panel__links">
              <Link href="/login">Voltar ao login</Link>
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="E-mail">
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </Field>
            {error ? <FormError>{error}</FormError> : null}
            <Button type="submit" loading={loading} className="w-full">
              {loading ? 'Enviando...' : 'Pedir link'}
            </Button>
            <p className="auth-panel__links">
              <Link href="/login">Entrar</Link>
            </p>
          </form>
        )}
      </Corners>
    </AuthStage>
  );
}
