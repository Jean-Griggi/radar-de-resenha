'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { Bell, Compass, House, Plus, Search, Sparkles, User } from 'lucide-react';
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
import { BrandWordmark } from './BrandWordmark';
import { ChatColumn, ChatDock, ChatHeaderButton, ChatMobile, ChatProvider, useChat } from './Chat';
import { ErrorBoundary } from './ErrorBoundary';
import { MiniPlayer, usePlayer } from './Player';
import { ThemeToggle } from './Theme';

const TOP_NAV = [
  { href: '/', label: 'Feed' },
  { href: '/explore', label: 'Explorar' },
  { href: '/roles', label: 'Rolês' },
];

const BOTTOM_NAV = [
  { href: '/', label: 'Feed', icon: House },
  { href: '/explore', label: 'Explorar', icon: Compass },
  { href: '/roles/new', label: 'Criar', icon: Plus, create: true },
  { href: '/roles', label: 'Rolês', icon: Sparkles },
  { href: '/perfil', label: 'Perfil', icon: User, profile: true },
];

const MORE_NAV = [
  { href: '/calendar', label: 'Calendário' },
  { href: '/music', label: 'Música' },
  { href: '/stats', label: 'Estatísticas' },
  { href: '/amigos', label: 'Amigos' },
  { href: '/photos', label: 'Fotos' },
];

function navActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/roles') return pathname.startsWith('/roles') && !pathname.startsWith('/roles/new');
  return pathname.startsWith(href);
}

export function AppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <ChatProvider>
      <ShellFrame right={right}>{children}</ShellFrame>
    </ChatProvider>
  );
}

function ShellFrame({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState('');
  const [unread, setUnread] = useState(() => peekUnreadCount() ?? 0);
  const { setTrack } = usePlayer();

  useEffect(() => {
    setMenu(false);
  }, [pathname]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menu]);

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
  }

  function logout() {
    clearAuth();
    router.replace('/login');
  }

  const profileHref = user?.username ? `/perfil/${user.username}` : '/perfil';

  return (
    <div className="min-h-screen">
      <header className="shell-chrome sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-4 sm:py-3 2xl:max-w-[1536px]">
          <BrandWordmark href="/" />
          <nav className="hidden items-stretch self-stretch lg:flex" aria-label="Principal">
            {TOP_NAV.map((item) => {
              const active = navActive(pathname, item.href);
              return (
                <Link key={item.href} href={item.href} className={`top-nav-link ${active ? 'nav-active' : ''}`}>
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden shrink-0 lg:block">
            <Link href="/roles/new" className="button button--primary gap-1.5" aria-label="Criar rolê">
              <Plus size={16} strokeWidth={2.5} aria-hidden />
              Criar
            </Link>
          </div>
          <form onSubmit={search} className="relative min-w-0 flex-1">
            <label className="sr-only" htmlFor="search">
              Buscar
            </label>
            <Search size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar"
              className="input composer rounded-full bg-[var(--overlay)] pr-4 pl-10 sm:px-4 sm:pl-10"
            />
          </form>
          <ThemeToggle />
          <ChatHeaderButton />
          <Link href="/notifications" className="icon-btn relative" aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : 'Notificações'}>
            <Bell size={20} strokeWidth={2} aria-hidden />
            {unread > 0 ? <span className="chat-badge chat-badge--header">{unread > 9 ? '9+' : unread}</span> : null}
          </Link>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={() => setMenu((v) => !v)}
              className="flex h-11 min-w-11 items-center gap-2 rounded-full p-1 hover:bg-overlay"
              aria-expanded={menu}
              aria-haspopup="menu"
              aria-label="Menu da conta"
            >
              <Avatar src={user?.avatar} name={user?.name} size="sm" glow />
              <span className="hidden max-w-28 truncate text-sm lg:block">{user?.name}</span>
            </button>
            {menu ? (
              <div className="absolute right-0 mt-2 w-52 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-elevated)] p-2 text-sm shadow-[var(--shadow-lg)]" role="menu">
                <Link href={profileHref} className="block min-h-11 rounded-lg px-3 py-2.5 hover:bg-overlay" role="menuitem" onClick={() => setMenu(false)}>
                  Perfil
                </Link>
                {MORE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block min-h-11 rounded-lg px-3 py-2.5 hover:bg-overlay"
                    role="menuitem"
                    onClick={() => setMenu(false)}
                  >
                    {item.label}
                  </Link>
                ))}
                <Link href="/settings" className="block min-h-11 rounded-lg px-3 py-2.5 hover:bg-overlay" role="menuitem" onClick={() => setMenu(false)}>
                  Configurações
                </Link>
                <button type="button" onClick={logout} className="block min-h-11 w-full rounded-lg px-3 py-2.5 text-left text-[var(--accent)] hover:bg-overlay" role="menuitem">
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-3 py-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-6 lg:pb-28 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,22.5rem)] 2xl:max-w-[1536px]">
        <main className="min-w-0">
          <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
        </main>

        <aside className="hidden min-w-0 xl:block">
          <ShellAside right={right} />
        </aside>
      </div>
      <MiniPlayer />
      <ChatMobile />
      <nav className="shell-chrome fixed inset-x-0 bottom-0 z-50 border-t border-line pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Principal">
        <ul className="grid grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const href = item.profile ? profileHref : item.href;
            const active = item.profile ? pathname.startsWith('/perfil') : item.create ? pathname.startsWith('/roles/new') : navActive(pathname, item.href);
            if (item.create) {
              return (
                <li key={item.href} className="flex items-center justify-center">
                  <Link href={href} className="nav-create" aria-label="Criar rolê">
                    <Plus size={22} strokeWidth={2.5} aria-hidden />
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href}>
                <Link href={href} className={`nav-bottom-link ${active ? 'is-active' : ''}`}>
                  <item.icon size={20} strokeWidth={active ? 2.4 : 2} aria-hidden />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function ShellAside({ right }: { right?: ReactNode }) {
  const { mode, hydrated, isDesktop } = useChat();
  const chatOpen = hydrated && isDesktop && mode === 'open';

  if (chatOpen) return <ChatColumn />;

  return (
    <div className="space-y-4 xl:sticky xl:top-[4.75rem]">
      <ChatDock />
      {right ?? <DefaultRail />}
    </div>
  );
}

function DefaultRail() {
  const [roles, setRoles] = useState<RailRole[]>(() => peekUpcomingRoles() ?? []);
  const [people, setPeople] = useState<RailPerson[]>(() => peekSuggestions() ?? []);
  const [following, setFollowing] = useState<string | null>(null);

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
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted">PRÓXIMOS ROLÊS</h2>
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
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted">SUGESTÕES</h2>
        {people.length === 0 ? <p className="text-sm text-muted">Ninguém para seguir agora.</p> : null}
        <ul className="space-y-3">
          {people.map((person) => (
            <li key={person.id} className="flex items-center gap-2">
              <Avatar src={person.avatar} name={person.name} size="sm" />
              <Link href={`/perfil/${person.username}`} className="min-w-0 flex-1">
                <p className="truncate text-sm">{person.name}</p>
                <p className="truncate text-xs text-muted">@{person.username}</p>
              </Link>
              <button
                type="button"
                className="button button--primary shrink-0 px-3 text-xs"
                disabled={following === person.id}
                onClick={async () => {
                  setFollowing(person.id);
                  try {
                    await api.post(`/users/${person.id}/follow`);
                    const next = people.filter((item) => item.id !== person.id);
                    setPeople(next);
                    setCachedSuggestions(next);
                  } finally {
                    setFollowing(null);
                  }
                }}
              >
                Seguir
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
