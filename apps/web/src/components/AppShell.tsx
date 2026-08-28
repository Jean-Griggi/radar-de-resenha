'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { clearAuth, getUser, type AuthUser } from '@/lib/auth';
import { formatShortDate } from '@/lib/format';
import {
  getSpotifyConnectedFlag,
  peekSpotifyStatus,
  peekSuggestions,
  peekUnreadCount,
  peekUpcomingRoles,
  setCachedSpotifyStatus,
  setCachedSuggestions,
  setCachedUnreadCount,
  setCachedUpcomingRoles,
  setSpotifyConnectedFlag,
  withInflight,
  type RailPerson,
  type RailRole,
} from '@/lib/shellCache';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';
import { MiniPlayer, usePlayer } from './Player';
import { ThemeToggle } from './Theme';

const NAV = [
  { href: '/', label: 'Início', icon: '⌂' },
  { href: '/explore', label: 'Explorar', icon: '◎' },
  { href: '/roles', label: 'Rolês', icon: '✦' },
  { href: '/calendar', label: 'Calendário', icon: '▦' },
  { href: '/music', label: 'Música', icon: '♪' },
  { href: '/stats', label: 'Estatísticas', icon: '▮' },
  { href: '/amigos', label: 'Amigos', icon: '☺' },
  { href: '/photos', label: 'Fotos', icon: '▣' },
];

export function AppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return <ShellFrame right={right}>{children}</ShellFrame>;
}

function ShellFrame({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [unread, setUnread] = useState(() => peekUnreadCount() ?? 0);
  const { setTrack } = usePlayer();

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    setUserState(getUser());

    let cancelled = false;

    async function refreshUnread(force = false) {
      try {
        const cached = force ? null : peekUnreadCount();
        const count =
          cached ??
          (await withInflight('unread', async () => {
            const { data } = await api.get<{ count: number }>('/notifications/unread-count');
            setCachedUnreadCount(data.count);
            return data.count;
          }));
        if (!cancelled) setUnread(count);
      } catch {
        /* unread is decorative */
      }
    }

    async function loadSpotify() {
      const known = getSpotifyConnectedFlag();
      if (known === false) return;

      const cached = peekSpotifyStatus();
      if (cached) {
        if (cached.nowPlaying) setTrack(cached.nowPlaying);
        return;
      }

      try {
        const data = await withInflight('spotify', async () => {
          const { data: status } = await api.get<{
            connected?: boolean;
            nowPlaying?: { title: string; artist: string; cover: string | null; spotifyUrl: string | null } | null;
          }>('/spotify/status');
          setSpotifyConnectedFlag(Boolean(status.connected));
          setCachedSpotifyStatus(status);
          return status;
        });
        if (!cancelled && data.nowPlaying) setTrack(data.nowPlaying);
      } catch {
        /* player stays empty */
      }
    }

    void refreshUnread();
    void loadSpotify();

    function onVisibility() {
      if (document.visibilityState === 'visible') void refreshUnread();
    }

    document.addEventListener('visibilitychange', onVisibility);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshUnread(true);
    }, 120_000);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [setTrack]);

  function search(event: FormEvent) {
    event.preventDefault();
    if (!q.trim()) return;
    router.push(`/explore?q=${encodeURIComponent(q.trim())}`);
    setOpen(false);
  }

  function logout() {
    clearAuth();
    router.replace('/login');
  }

  const profileHref = user?.username ? `/perfil/${user.username}` : '/perfil';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-[var(--header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:gap-4 sm:px-4">
          <button
            type="button"
            className="shrink-0 rounded-lg p-2 text-muted lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="sidebar-nav"
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
          >
            {open ? '✕' : '☰'}
          </button>
          <Link href="/" className="shrink-0 text-sm font-bold tracking-[0.18em] text-fg sm:text-lg sm:tracking-[0.2em]">
            <span className="sm:hidden">RESENHA</span>
            <span className="hidden sm:inline">RESENHÔMETRO</span>
          </Link>
          <form onSubmit={search} className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="search">
              Buscar
            </label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar pessoas, rolês e tags"
              className="w-full rounded-full border border-line bg-overlay px-3 py-2 text-sm text-fg outline-none focus:ring-2 focus:ring-violet-500/40 sm:px-4"
            />
          </form>
          <ThemeToggle />
          <Link href="/notifications" className="relative shrink-0 rounded-full p-2 text-muted hover:bg-overlay" aria-label="Notificações">
            🔔
            {unread > 0 ? <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-fuchsia-400" /> : null}
          </Link>
          <div className="relative shrink-0">
            <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-full p-1 hover:bg-overlay">
              <Avatar src={user?.avatar} name={user?.name} size="sm" glow />
              <span className="hidden max-w-28 truncate text-sm lg:block">{user?.name}</span>
            </button>
            {menu ? (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-card p-2 text-sm shadow-xl">
                <Link href={profileHref} className="block rounded-lg px-3 py-2 hover:bg-overlay" onClick={() => setMenu(false)}>
                  Perfil
                </Link>
                <Link href="/settings" className="block rounded-lg px-3 py-2 hover:bg-overlay" onClick={() => setMenu(false)}>
                  Configurações
                </Link>
                <button type="button" onClick={logout} className="block w-full rounded-lg px-3 py-2 text-left text-rose-400 hover:bg-overlay">
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      {open ? (
        <button
          type="button"
          className="fixed inset-x-0 top-14 bottom-0 z-40 bg-black/50 lg:hidden"
          aria-label="Fechar menu"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="sidebar-nav"
        className={`fixed top-14 bottom-0 left-0 z-50 w-[min(18rem,86vw)] overflow-y-auto p-3 transition-transform duration-200 lg:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="card h-full p-3">
          <SidebarNav pathname={pathname} profileHref={profileHref} onNavigate={() => setOpen(false)} onLogout={logout} />
        </div>
      </aside>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-3 py-4 sm:px-4 sm:py-6 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_280px]">
        <aside className="hidden lg:sticky lg:top-24 lg:block lg:self-start">
          <div className="card p-3">
            <SidebarNav pathname={pathname} profileHref={profileHref} onNavigate={() => setOpen(false)} onLogout={logout} />
          </div>
        </aside>

        <main className="min-w-0">
          <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
        </main>

        <aside className="min-w-0 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:col-span-2 xl:col-span-1 xl:pb-0">
          <div className="space-y-4 xl:sticky xl:top-24">{right ?? <DefaultRail />}</div>
        </aside>
      </div>
      <MiniPlayer />
    </div>
  );
}

function SidebarNav({
  pathname,
  profileHref,
  onNavigate,
  onLogout,
}: {
  pathname: string;
  profileHref: string;
  onNavigate: () => void;
  onLogout: () => void;
}) {
  return (
    <>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? 'nav-active text-fg' : 'text-muted hover:bg-overlay'}`}
              onClick={onNavigate}
            >
              <span className="w-5 text-center text-violet-300">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
        <Link
          href={profileHref}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname.startsWith('/perfil') ? 'nav-active text-fg' : 'text-muted hover:bg-overlay'}`}
          onClick={onNavigate}
        >
          <span className="w-5 text-center text-violet-300">◉</span>
          Perfil
        </Link>
      </nav>
      <div className="mt-6 border-t border-line pt-3">
        <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-overlay" onClick={onNavigate}>
          <span className="w-5 text-center">⚙</span>
          Configurações
        </Link>
        <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-overlay">
          <span className="w-5 text-center">→</span>
          Sair
        </button>
      </div>
    </>
  );
}

function DefaultRail() {
  const [roles, setRoles] = useState<RailRole[]>(() => peekUpcomingRoles() ?? []);
  const [people, setPeople] = useState<RailPerson[]>(() => peekSuggestions() ?? []);

  useEffect(() => {
    let cancelled = false;

    async function loadRail() {
      try {
        const nextRoles =
          peekUpcomingRoles() ??
          (await withInflight('calendar', async () => {
            const { data } = await api.get<{ upcoming: RailRole[] }>('/calendar');
            const upcoming = data.upcoming ?? [];
            setCachedUpcomingRoles(upcoming);
            return upcoming;
          }));
        if (!cancelled) setRoles(nextRoles);
      } catch {
        /* rail stays empty */
      }

      try {
        const nextPeople =
          peekSuggestions() ??
          (await withInflight('suggestions', async () => {
            const { data } = await api.get<RailPerson[]>('/suggestions');
            setCachedSuggestions(data);
            return data;
          }));
        if (!cancelled) setPeople(nextPeople);
      } catch {
        /* rail stays empty */
      }
    }

    void loadRail();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted">PRÓXIMOS ROLÊS</h2>
        <ul className="space-y-3">
          {roles.length === 0 ? <li className="text-sm text-muted">Nada marcado ainda.</li> : null}
          {roles.map((role) => (
            <li key={role.id}>
              <Link href={`/roles/${role.id}`} className="block rounded-lg hover:bg-overlay">
                <p className="text-sm text-fg">{role.title}</p>
                <p className="text-xs text-muted">
                  {formatShortDate(role.date)} {role.time ?? ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted">SUGESTÕES</h2>
        <ul className="space-y-3">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-2">
              <Avatar src={person.avatar} name={person.name} size="sm" />
              <Link href={`/perfil/${person.username}`} className="min-w-0">
                <p className="truncate text-sm">{person.name}</p>
                <p className="truncate text-xs text-muted">@{person.username}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
