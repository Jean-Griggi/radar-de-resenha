'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useRef, useState, type MouseEvent, type RefObject } from 'react';
import { BrandSymbol } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { Corners } from '@/components/Corners';
import { Field, FormError, Input } from '@/components/Field';
import { Sheet } from '@/components/Modal';
import { api, apiErrorMessage } from '@/lib/api';
import { AuthStage } from './AuthStage';
import { getUser, setAuth, type AuthUser } from './session';

/**
 * Magnetismo do botão “Entrar”: só com ponteiro fino, sem movimento reduzido e sem erro.
 * O deslocamento vai no `transform` de um invólucro (até 8 px), num frame só — sem setState no mousemove.
 * O botão em si não recebe transform, para a largura continuar sendo a do texto.
 */
function useEnterMagnet(enabled: boolean, anchorRef: RefObject<HTMLDivElement | null>, shiftRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const shift = shiftRef.current;
    if (!enabled || !shift) return;
    const fine = window.matchMedia('(pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!fine.matches || reduce.matches) return;

    let frame = 0;
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (dist >= 160 || dist === 0) {
          shift.style.transform = 'translate(0px, 0px)';
          return;
        }
        const pull = (1 - dist / 160) * 8;
        shift.style.transform = `translate(${(dx / dist) * pull}px, ${(dy / dist) * pull}px)`;
      });
    };

    window.addEventListener('pointermove', onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      shift.style.transform = '';
    };
  }, [enabled, anchorRef, shiftRef]);
}

export function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(false);
  const [sheet, setSheet] = useState(false);
  const anchorRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (getUser()) router.replace('/');
  }, [router]);

  // Devolve o foco ao botão só depois de fechar o painel. Na montagem não: foco programático
  // acende o :focus-visible e o anel apareceria sem a pessoa ter usado o teclado.
  const mounted = useRef(false);
  useEffect(() => {
    if (mounted.current && !panel && !sheet) buttonRef.current?.focus();
    mounted.current = true;
  }, [panel, sheet]);

  useEffect(() => {
    if (panel) formRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, [panel]);

  useEnterMagnet(!panel && !sheet && error === '', anchorRef, shiftRef);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post<{ user: AuthUser; token?: string }>('/auth/login', { email, password });
      setAuth(data.user, data.token);
      router.replace('/');
    } catch (err) {
      setError(apiErrorMessage(err, 'E-mail ou senha inválidos'));
    } finally {
      setLoading(false);
    }
  }

  function openPanel(event: MouseEvent<HTMLButtonElement>) {
    const pointerType = 'pointerType' in event.nativeEvent ? (event.nativeEvent as PointerEvent).pointerType : '';
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    if (coarse || pointerType === 'touch') setSheet(true);
    else setPanel(true);
  }

  const form = (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <Field label="E-mail">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          data-autofocus=""
        />
      </Field>
      <Field label="Senha">
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required autoComplete="current-password" />
      </Field>
      {error ? <FormError>{error}</FormError> : null}
      <Button type="submit" loading={loading} className="w-full">
        {loading ? 'Entrando...' : 'Entrar'}
      </Button>
      <p className="auth-panel__links">
        <Link href="/esqueci-senha">Esqueci a senha</Link>
        <Link href="/cadastro">Criar conta</Link>
      </p>
    </form>
  );

  return (
    <AuthStage phrase suppressPhrase={panel || sheet}>
      {panel ? (
        <Corners size={22} className={`auth-panel auth-panel--quina${error ? ' auth-panel--error' : ''}`}>
          <div className="auth-panel__scroll">{form}</div>
        </Corners>
      ) : (
        <div ref={anchorRef} className="auth-enter">
          <div ref={shiftRef} className="auth-enter__shift">
            <button ref={buttonRef} type="button" className="button button--primary" onClick={openPanel}>
              <BrandSymbol />
              Entrar
            </button>
          </div>
        </div>
      )}
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Entrar">
        <div className={error ? 'auth-panel--error' : undefined}>{panel ? null : form}</div>
      </Sheet>
    </AuthStage>
  );
}
