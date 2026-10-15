'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { Bell, Compass, House, Plus, Search, Sparkles, User } from 'lucide-react';
import { api } from '@/lib/api';
import { clearAuth, getUser, type AuthUser } from '@/lib/auth';
import { formatMeta, plural } from '@/lib/format';
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
import { ErrorBoundary } from './ErrorBoundary';
import { Ficha, FichaRow } from './FichaRow';
import { Menu, type MenuItem } from './Menu';
import { ChatPreview } from '@/features/chat';
import { usePlayer } from './Player';
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
  { href: '/chat', label: 'Mensagens' },
  { href: '/calendar', label: 'Calendário' },
  { href: '/music', label: 'Música' },
  { href: '/stats', label: 'Estatísticas' },
  { href: '/amigos', label: 'Amigos' },
  { href: '/mapa', label: 'Mapa' },
  { href: '/photos', label: 'Fotos' },
];

const SUGGESTIONS_SHOWN = 5;

function navActive(pathname: string, href: string) {
  if (href === '/') return pathname === '/';
  if (href === '/roles') return pathname.startsWith('/roles') && !pathname.startsWith('/roles/new');
  return pathname.startsWith(href);
}

export function AppShell({ children, right }: { children: ReactNode; right?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [q, setQ] = useState('');
  const [unread, setUnread] = useState(() => peekUnreadCount() ?? 0);
  const { setTrack } = usePlayer();

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

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {
      /* local session still cleared */
    }
    clearAuth();
    router.replace('/login');
  }

  const profileHref = user?.username ? `/perfil/${user.username}` : '/perfil';

  const accountItems: MenuItem[] = [
    { label: 'Perfil', href: profileHref },
    ...MORE_NAV.map((item) => ({ label: item.label, href: item.href })),
    { label: 'Configurações', href: '/settings' },
    { label: 'Sair', onSelect: logout, tone: 'danger', separatorBefore: true },
  ];

  return (
    <div className="min-h-screen">
      <header className="shell-chrome k-header sticky top-0 z-40">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-2 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-4 sm:py-3 2xl:max-w-[1536px]">
          <BrandWordmark href="/" />
          <nav className="hidden items-stretch self-stretch lg:flex" aria-label="Principal">
            {TOP_NAV.map((item) => {
              const active = navActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`top-nav-link ${active ? 'nav-active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="hidden shrink-0 lg:block">
            <Link href="/roles/new" className="nav-create" aria-label="Criar rolê">
              <Plus size={22} strokeWidth={2.5} aria-hidden />
            </Link>
          </div>
          <form onSubmit={search} className="relative min-w-0 flex-1" role="search">
            <label className="sr-only" htmlFor="search">
              Buscar
            </label>
            <Search size={16} strokeWidth={2} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-k-text-muted" aria-hidden />
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar"
              className="input pr-4 pl-10 sm:px-4 sm:pl-10"
            />
          </form>
          <ThemeToggle />
          <Link href="/notifications" className="icon-btn relative" aria-label={unread > 0 ? `Notificações, ${plural(unread, 'não lida', 'não lidas')}` : 'Notificações'}>
            <Bell size={20} strokeWidth={2} aria-hidden />
            {unread > 0 ? <span className="chat-badge chat-badge--header">{unread > 9 ? '9+' : unread}</span> : null}
          </Link>
          <Menu
            key={pathname}
            className="shrink-0"
            label="Menu da conta"
            items={accountItems}
            trigger={
              <>
                <Avatar src={user?.avatar} name={user?.name} size="sm" />
                <span className="hidden max-w-28 truncate text-sm lg:block">{user?.name}</span>
              </>
            }
          />
        </div>
      </header>

      <div
        className={
          pathname === '/'
            ? 'mx-auto grid w-full grid-cols-1 gap-6 px-3 py-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-6 lg:pb-28 xl:max-w-[calc(680px+22.5rem+1.5rem)] xl:grid-cols-[minmax(0,680px)_minmax(20rem,22.5rem)]'
            : 'mx-auto grid max-w-7xl grid-cols-1 gap-6 px-3 py-4 pb-[calc(8.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-6 lg:pb-28 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,22.5rem)] 2xl:max-w-[1536px]'
        }
      >
        <main className="min-w-0">
          <ErrorBoundary resetKey={pathname}>{children}</ErrorBoundary>
        </main>

        <aside className="hidden min-w-0 xl:block" aria-label="Sua agenda">
          <ShellAside right={right} />
        </aside>
      </div>
      <nav className="shell-chrome k-tabbar fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Principal">
        <ul className="k-tabbar__list">
          {BOTTOM_NAV.map((item) => {
            const href = item.profile ? profileHref : item.href;
            const active = item.profile ? pathname.startsWith('/perfil') : item.create ? pathname.startsWith('/roles/new') : navActive(pathname, item.href);
            if (item.create) {
              return (
                <li key={item.href} className="k-tabbar__slot">
                  <Link href={href} className="k-tabbar__create" aria-label="Criar rolê">
                    <Plus size={24} strokeWidth={2.5} aria-hidden />
                  </Link>
                </li>
              );
            }
            return (
              <li key={item.href} className="k-tabbar__slot">
                <Link href={href} className={`k-tabbar__link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                  <span className="k-tabbar__dot" aria-hidden />
                  <item.icon size={22} strokeWidth={active ? 2 : 1.5} aria-hidden />
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
  // Sem position: sticky: a lista longa de sugestões deixaria o fim inalcançável. Rolagem normal.
  return <div className="space-y-8">{right ?? <DefaultRail />}</div>;
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

  function renderPerson(person: RailPerson) {
    return (
      <li key={person.id} className="k-agenda__person">
        <Avatar src={person.avatar} name={person.name} size="sm" />
        <Link href={`/perfil/${person.username}`} className="min-w-0 flex-1 break-words">
          <p className="k-agenda__person-name">{person.name}</p>
          <p className="k-meta break-all">@{person.username}</p>
        </Link>
        <button
          type="button"
          className="button button--secondary shrink-0"
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
    );
  }

  return (
    <div className="grid gap-8">
      <section className="k-agenda" aria-labelledby="agenda-title">
        <h2 id="agenda-title" className="k-meta k-agenda__heading">
          Sua agenda
        </h2>
        {roles.length === 0 ? <p className="k-agenda__empty">Nada marcado ainda.</p> : null}
        <Ficha>
          {roles.map((role) => (
            <FichaRow key={role.id} href={`/roles/${role.id}`} label={formatMeta(role.date, role.time)}>
              <span className="k-display k-agenda__name">{role.title}</span>
            </FichaRow>
          ))}
        </Ficha>
        <Link href="/roles/new" className="k-agenda__create">
          Marcar um rolê
        </Link>
      </section>
      <section aria-labelledby="suggestions-title">
        <h2 id="suggestions-title" className="k-meta k-agenda__heading">
          Sugestões
        </h2>
        {people.length === 0 ? <p className="k-agenda__empty">Ninguém para seguir agora.</p> : null}
        <ul className="k-agenda__people">{people.slice(0, SUGGESTIONS_SHOWN).map(renderPerson)}</ul>
        {people.length > SUGGESTIONS_SHOWN ? (
          <details className="k-agenda__more">
            <summary>Ver mais ({people.length - SUGGESTIONS_SHOWN})</summary>
            <ul className="k-agenda__people">{people.slice(SUGGESTIONS_SHOWN).map(renderPerson)}</ul>
          </details>
        ) : null}
      </section>
      <div className="sm:col-span-2 xl:col-span-1">
        <ChatPreview placement="rail" />
      </div>
    </div>
  );
}
