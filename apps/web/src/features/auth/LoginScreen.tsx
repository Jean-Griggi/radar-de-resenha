'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { BrandSymbol } from '@/components/BrandMark';
import { Button } from '@/components/Button';
import { Corners } from '@/components/Corners';
import { Field, FormError, Input } from '@/components/Field';
import { api, apiErrorMessage } from '@/lib/api';
import { AuthStage } from './AuthStage';
import { getUser, setAuth, type AuthUser } from './session';

/** Raio (px) em que o cursor “chama” o botão, e quanto ele desliza (px) com o cursor colado. */
const MAGNET_RADIUS = 160;
const MAGNET_PULL = 8;
/** Mola do plano (tabela de movimento): rigidez 300, amortecimento 30. */
const SPRING_STIFFNESS = 300;
const SPRING_DAMPING = 30;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Lê um token de duração (`520ms`) em milissegundos. */
const tokenMs = (name: string) => parseFloat(getComputedStyle(document.documentElement).getPropertyValue(name)) || 0;

/** O fio não pode chegar a escala 0 (matriz singular some com o traço); 0,001 é reto para o olho. */
const bow = (value: number) => {
  const clamped = Math.max(-1, Math.min(1, value));
  return Math.abs(clamped) < 0.001 ? 0.001 : clamped;
};

/**
 * Magnetismo do botão “Entrar” (plano 6.2): só com ponteiro fino e hover, sem movimento reduzido e sem erro.
 * Com o cursor a menos de 160 px, o botão desliza até 8 px na direção dele e os dois fios arqueiam levemente para ele;
 * ao sair, tudo volta numa mola (300/30) integrada em requestAnimationFrame — sem biblioteca, só `transform`.
 * O laço só roda enquanto algo se move e para com a aba oculta.
 */
function useEnterMagnet(
  enabled: boolean,
  anchorRef: RefObject<HTMLDivElement | null>,
  shiftRef: RefObject<HTMLDivElement | null>,
  fioHRef: RefObject<SVGPathElement | null>,
  fioVRef: RefObject<SVGPathElement | null>,
) {
  useEffect(() => {
    const shift = shiftRef.current;
    if (!enabled || !shift) return;
    const pointerOk = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!pointerOk.matches || reduce.matches) return;

    const keys = ['x', 'y', 'bx', 'by'] as const;
    type Axis = (typeof keys)[number];
    const pos: Record<Axis, number> = { x: 0, y: 0, bx: 0, by: 0 };
    const vel: Record<Axis, number> = { x: 0, y: 0, bx: 0, by: 0 };
    const target: Record<Axis, number> = { x: 0, y: 0, bx: 0, by: 0 };
    let frame = 0;
    let last = 0;

    const paint = () => {
      shift.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      if (fioHRef.current) fioHRef.current.style.transform = `scaleY(${bow(pos.by)})`;
      if (fioVRef.current) fioVRef.current.style.transform = `scaleX(${bow(pos.bx)})`;
    };

    const step = (now: number) => {
      frame = 0;
      const dt = Math.min(Math.max((now - last) / 1000, 0), 1 / 30);
      last = now;
      let moving = false;
      for (const key of keys) {
        const accel = SPRING_STIFFNESS * (target[key] - pos[key]) - SPRING_DAMPING * vel[key];
        vel[key] += accel * dt;
        pos[key] += vel[key] * dt;
        if (Math.abs(vel[key]) > 0.01 || Math.abs(target[key] - pos[key]) > 0.01) moving = true;
        else {
          pos[key] = target[key];
          vel[key] = 0;
        }
      }
      paint();
      if (moving && !document.hidden) frame = requestAnimationFrame(step);
    };

    const kick = () => {
      if (frame || document.hidden) return;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };

    const release = () => {
      for (const key of keys) target[key] = 0;
      kick();
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
      const anchor = anchorRef.current;
      if (!anchor) return;
      const rect = anchor.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist >= MAGNET_RADIUS || dist === 0) {
        release();
        return;
      }
      const strength = 1 - dist / MAGNET_RADIUS;
      const ux = dx / dist;
      const uy = dy / dist;
      target.x = ux * strength * MAGNET_PULL;
      target.y = uy * strength * MAGNET_PULL;
      target.bx = ux * strength;
      target.by = uy * strength;
      kick();
    };

    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        kick();
      }
    };

    window.addEventListener('pointermove', onMove);
    document.documentElement.addEventListener('pointerleave', release);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', release);
      document.removeEventListener('visibilitychange', onVisibility);
      shift.style.transform = '';
      if (fioHRef.current) fioHRef.current.style.transform = '';
      if (fioVRef.current) fioVRef.current.style.transform = '';
    };
  }, [enabled, anchorRef, shiftRef, fioHRef, fioVRef]);
}

type Phase = 'rest' | 'open' | 'closing';

export function LoginScreen() {
  const router = useRouter();
  const titleId = useId();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('rest');
  const anchorRef = useRef<HTMLDivElement>(null);
  const shiftRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fioHRef = useRef<SVGPathElement>(null);
  const fioVRef = useRef<SVGPathElement>(null);
  const hasOpened = useRef(false);

  const hasError = fieldError !== '' || formError !== '';

  useEffect(() => {
    if (getUser()) router.replace('/');
  }, [router]);

  // O botão “Entrar” é a única ação da tela: nasce com o foco (plano 6.2, teclado).
  useEffect(() => {
    buttonRef.current?.focus({ preventScroll: true });
  }, []);

  useEnterMagnet(phase === 'rest' && !hasError, anchorRef, shiftRef, fioHRef, fioVRef);

  // O botão cresce a partir do vértice e vira o painel: o painel (centrado no vértice) anima de “tamanho do botão” a 1.
  // Só `transform` e `opacity`. Com toque ou movimento reduzido o CSS faz folha inferior / fade, sem crescimento.
  useLayoutEffect(() => {
    if (phase !== 'open') return;
    hasOpened.current = true;
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!panel || !button) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || window.matchMedia('(pointer: coarse)').matches) return;
    const from = button.getBoundingClientRect();
    const to = panel.getBoundingClientRect();
    if (!to.width || !to.height) return;
    const duration = tokenMs('--k-dur-scene');
    const easing = getComputedStyle(document.documentElement).getPropertyValue('--k-ease-arrive').trim();
    panel.animate(
      [{ transform: `scale(${from.width / to.width}, ${from.height / to.height})` }, { transform: 'none' }],
      { duration, easing },
    );
    panel.querySelector('.auth-panel__scroll')?.animate([{ opacity: 0 }, { opacity: 0, offset: 0.4 }, { opacity: 1 }], { duration, easing });
  }, [phase]);

  useEffect(() => {
    if (phase === 'open') formRef.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, [phase]);

  // Saída: fade rápido (leave) e volta ao repouso, devolvendo o foco ao botão.
  useEffect(() => {
    if (phase !== 'closing') return;
    const timer = window.setTimeout(() => setPhase('rest'), tokenMs('--k-dur-quick'));
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === 'rest' && hasOpened.current) buttonRef.current?.focus({ preventScroll: true });
  }, [phase]);

  // Erro de senha: o foco vai para o campo com erro.
  useEffect(() => {
    if (fieldError) formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus({ preventScroll: true });
  }, [fieldError]);

  // Esc fecha mesmo que o foco tenha saído do painel.
  useEffect(() => {
    if (phase !== 'open') return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  function openPanel() {
    if (phase === 'rest') setPhase('open');
  }

  function close() {
    setPhase((current) => (current === 'open' ? 'closing' : current));
    setFieldError('');
    setFormError('');
    setPassword('');
  }

  // Foco preso dentro do painel enquanto aberto.
  function onPanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Tab') return;
    const items = Array.from(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    const first = items[0];
    const lastItem = items[items.length - 1];
    if (!first || !lastItem) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      lastItem.focus();
    } else if (!event.shiftKey && document.activeElement === lastItem) {
      event.preventDefault();
      first.focus();
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setFieldError('');
    setFormError('');
    setLoading(true);
    try {
      const { data } = await api.post<{ user: AuthUser; token?: string }>('/auth/login', { email, password });
      setAuth(data.user, data.token);
      router.replace('/');
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 401) setFieldError('Senha incorreta. Tente de novo.');
      else setFormError(apiErrorMessage(err, 'Não foi possível entrar. Tente de novo.'));
    } finally {
      setLoading(false);
    }
  }

  const panelOpen = phase !== 'rest';

  return (
    <AuthStage phrase phraseOut={panelOpen} fioHRef={fioHRef} fioVRef={fioVRef}>
      {/* Clique no fundo (repouso) também abre o painel. */}
      {!panelOpen ? <div className="auth-stage__hit" onClick={openPanel} aria-hidden /> : null}

      <div ref={anchorRef} className="auth-enter" data-open={panelOpen ? '' : undefined}>
        <div ref={shiftRef} className="auth-enter__shift">
          <button
            ref={buttonRef}
            type="button"
            className="button button--primary"
            onClick={openPanel}
            tabIndex={panelOpen ? -1 : undefined}
            aria-hidden={panelOpen || undefined}
          >
            <BrandSymbol />
            Entrar
          </button>
        </div>
      </div>

      {panelOpen ? (
        <>
          <div className="k-entry-scrim" data-state={phase} onClick={close} aria-hidden />
          <div ref={panelRef} className="auth-entry" data-state={phase}>
            <Corners
              size={22}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="auth-panel auth-panel--entry k-glass"
              onKeyDown={onPanelKeyDown}
            >
              <div className="auth-panel__scroll">
                <h2 id={titleId} className="auth-panel__title k-display">
                  Chegou na quina.
                </h2>
                <p className="auth-panel__lead">Entre com seu e-mail.</p>
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
                  <Field label="Senha" error={fieldError}>
                    <Input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={6}
                      required
                      autoComplete="current-password"
                    />
                  </Field>
                  {formError ? <FormError>{formError}</FormError> : null}
                  <div className="auth-panel__actions">
                    <Button type="submit" loading={loading}>
                      {loading ? 'Entrando...' : 'Entrar'}
                    </Button>
                    <Button variant="ghost" onClick={close}>
                      Cancelar
                    </Button>
                  </div>
                  <p className="auth-panel__links">
                    <Link href="/esqueci-senha">Esqueci a senha</Link>
                    <Link href="/cadastro">Criar conta</Link>
                  </p>
                </form>
              </div>
            </Corners>
          </div>
        </>
      ) : null}
    </AuthStage>
  );
}
