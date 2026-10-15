'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Image as ImageIcon,
  LogOut,
  Map as MapIcon,
  MessageSquare,
  Music,
  Settings,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

/** As áreas do app (D25). Saíram do menu do avatar: vão para a barra de áreas (≥ 1024 px) e para o painel (< 1024 px). */
export const AREAS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/chat', label: 'Mensagens', icon: MessageSquare },
  { href: '/calendar', label: 'Calendário', icon: CalendarDays },
  { href: '/music', label: 'Música', icon: Music },
  { href: '/stats', label: 'Estatísticas', icon: BarChart3 },
  { href: '/amigos', label: 'Amigos', icon: Users },
  { href: '/mapa', label: 'Mapa', icon: MapIcon },
  { href: '/photos', label: 'Fotos', icon: ImageIcon },
];

export function areaActive(pathname: string, href: string) {
  return pathname.startsWith(href);
}

/**
 * Barra de áreas (≥ 1024 px): sticky logo abaixo do cabeçalho, no mesmo contêiner dele. Item ativo = ponto sódio +
 * peso 600 + `aria-current="page"`. Os links são irmãos diretos (sem `<li>`) porque o efeito de "marcador de
 * página" no hover usa seletores de irmão (`+` e `:has`).
 */
export function AreasBar({ pathname }: { pathname: string }) {
  return (
    <nav aria-label="Áreas" className="k-areas">
      <div className="k-container k-areas__row">
        {AREAS.map((area) => {
          const active = areaActive(pathname, area.href);
          return (
            <Link
              key={area.href}
              href={area.href}
              className="k-areas__link"
              aria-current={active ? 'page' : undefined}
              title={area.label}
            >
              <span className={`k-areas__dot${active ? ' k-areas__dot--on' : ''}`} aria-hidden />
              <area.icon size={20} strokeWidth={1.75} aria-hidden />
              <span className="k-areas__label">{area.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/**
 * Painel (< 1024 px), aberto pelo avatar do cabeçalho: dois grupos (ÁREAS e CONTA) em linhas de 56 px.
 * É um menu de navegação, não um modal: sem trava de foco e sem travar a rolagem do corpo. Fecha com `Esc`
 * (devolvendo o foco ao botão), clique fora, escolha de uma linha e mudança de rota.
 */
export function AccountPanel({
  pathname,
  profileHref,
  onLogout,
  avatar,
}: {
  pathname: string;
  profileHref: string;
  onLogout: () => void;
  avatar: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  // Saída só em opacidade: o painel segue montado até o fade acabar.
  const [closing, setClosing] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const areasLabel = useId();
  const accountLabel = useId();

  const close = useCallback((returnFocus: boolean) => {
    setOpen(false);
    setClosing(true);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => setClosing(false), 240);
    return () => window.clearTimeout(timer);
  }, [closing]);

  // Mudança de rota fecha.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Foco na primeira linha ao abrir.
  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>('a, button')?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [open, close]);

  const accountRows = [
    { href: profileHref, label: 'Perfil', icon: User, active: pathname.startsWith('/perfil') },
    { href: '/settings', label: 'Configurações', icon: Settings, active: pathname.startsWith('/settings') },
  ];

  return (
    <div className="k-account lg:hidden">
      <button
        ref={buttonRef}
        type="button"
        className="k-account__button"
        aria-label="Menu"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close(false) : (setClosing(false), setOpen(true)))}
      >
        {avatar}
      </button>
      {open || closing ? (
        <div
          id={panelId}
          ref={panelRef}
          className={`k-panel${open ? '' : ' k-panel--out'}`}
          onClick={(event) => {
            // Escolher uma linha fecha o painel.
            if ((event.target as HTMLElement).closest('a, button')) close(false);
          }}
        >
          <p id={areasLabel} className="k-meta k-panel__label">
            Áreas
          </p>
          <ul className="k-panel__list" aria-labelledby={areasLabel}>
            {AREAS.map((area) => {
              const active = areaActive(pathname, area.href);
              return (
                <li key={area.href}>
                  <Link
                    href={area.href}
                    className={`k-panel__row${active ? ' k-panel__row--active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <area.icon size={20} strokeWidth={1.75} aria-hidden />
                    <span className="k-panel__text">{area.label}</span>
                    <ArrowRight size={18} aria-hidden className="k-panel__arrow" />
                  </Link>
                </li>
              );
            })}
          </ul>
          <p id={accountLabel} className="k-meta k-panel__label">
            Conta
          </p>
          <ul className="k-panel__list" aria-labelledby={accountLabel}>
            {accountRows.map((row) => (
              <li key={row.href}>
                <Link
                  href={row.href}
                  className={`k-panel__row${row.active ? ' k-panel__row--active' : ''}`}
                  aria-current={row.active ? 'page' : undefined}
                >
                  <row.icon size={20} strokeWidth={1.75} aria-hidden />
                  <span className="k-panel__text">{row.label}</span>
                  <ArrowRight size={18} aria-hidden className="k-panel__arrow" />
                </Link>
              </li>
            ))}
            <li>
              <button type="button" className="k-panel__row k-panel__row--danger" onClick={onLogout}>
                <LogOut size={20} strokeWidth={1.75} aria-hidden />
                <span className="k-panel__text">Sair</span>
              </button>
            </li>
          </ul>
        </div>
      ) : null}
    </div>
  );
}
