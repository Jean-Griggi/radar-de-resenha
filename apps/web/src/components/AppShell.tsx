'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { clearAuth, getUser, type AuthUser } from '@/lib/auth';
import { Avatar } from './Avatar';
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
  const [unread, setUnread] = useState(0);
  const { setTrack } = usePlayer();

  useEffect(() => {
    setUserState(getUser());
    api.get<{ count: number }>('/notifications/unread-count').then(({ data }) => setUnread(data.count)).catch(() => undefined);
    api
      .get<{ nowPlaying?: { title: string; artist: string; cover: string | null; spotifyUrl: string | null } | null }>('/spotify/status')
      .then(({ data }) => {
        if (data.nowPlaying) setTrack(data.nowPlaying);
      })
      .catch(() => undefined);
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
      <header className="sticky top-0 z-30 border-b border-line bg-[var(--header)] backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button type="button" className="rounded-lg p-2 text-muted lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Abrir menu">
            ☰
          </button>
          <Link href="/" className="hidden text-lg font-bold tracking-[0.2em] text-fg sm:block">
            RESENHÔMETRO
          </Link>
          <form onSubmit={search} className="flex-1">
            <label className="sr-only" htmlFor="search">
              Buscar
            </label>
            <input
              id="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar pessoas, rolês, resenhas, tags..."
              className="w-full rounded-full border border-line bg-overlay px-4 py-2 text-sm text-fg outline-none focus:ring-2 focus:ring-violet-500/40"
            />
          </form>
          <ThemeToggle />
          <Link href="/notifications" className="relative rounded-full p-2 text-muted hover:bg-overlay" aria-label="Notificações">
            🔔
            {unread > 0 ? (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-fuchsia-400" />
            ) : null}
          </Link>
          <div className="relative">
            <button type="button" onClick={() => setMenu((v) => !v)} className="flex items-center gap-2 rounded-full p-1 hover:bg-overlay">
              <Avatar src={user?.avatar} name={user?.name} size="sm" glow />
              <span className="hidden text-sm md:block">{user?.name}</span>
            </button>
            {menu ? (
              <div className="absolute right-0 mt-2 w-48 rounded-xl border border-line bg-card p-2 text-sm shadow-xl">
                <Link href={profileHref} className="block rounded-lg px-3 py-2 hover:bg-overlay">
                  Perfil
                </Link>
                <Link href="/settings" className="block rounded-lg px-3 py-2 hover:bg-overlay">
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

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[230px_minmax(0,1fr)] xl:grid-cols-[230px_minmax(0,1fr)_280px]">
        <aside className={`${open ? 'block' : 'hidden'} lg:block`}>
          <div className="card sticky top-24 p-3">
            <p className="px-3 pb-3 text-xs tracking-[0.25em] text-slate-500 lg:hidden">RESENHÔMETRO</p>
            <nav className="space-y-1">
              {NAV.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${active ? 'nav-active text-fg' : 'text-muted hover:bg-overlay'}`}
                    onClick={() => setOpen(false)}
                  >
                    <span className="w-5 text-center text-violet-300">{item.icon}</span>
                    {item.label}
                  </Link>
                );
              })}
              <Link
                href={profileHref}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${pathname.startsWith('/perfil') ? 'nav-active text-fg' : 'text-muted hover:bg-overlay'}`}
              >
                <span className="w-5 text-center text-violet-300">◉</span>
                Perfil
              </Link>
            </nav>
            <div className="mt-6 border-t border-line pt-3">
              <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-overlay">
                <span className="w-5 text-center">⚙</span>
                Configurações
              </Link>
              <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-overlay">
                <span className="w-5 text-center">→</span>
                Sair
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0 pb-24">{children}</main>

        <aside className="hidden xl:block">
          <div className="sticky top-24 space-y-4">{right ?? <DefaultRail />}</div>
        </aside>
      </div>
      <MiniPlayer />
    </div>
  );
}

function DefaultRail() {
  const [roles, setRoles] = useState<{ id: string; title: string; date: string | null; time: string | null }[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string; username: string; avatar: string | null }[]>([]);

  useEffect(() => {
    api.get<{ upcoming: typeof roles }>('/calendar').then(({ data }) => setRoles(data.upcoming ?? [])).catch(() => undefined);
    api.get<typeof people>('/suggestions').then(({ data }) => setPeople(data)).catch(() => undefined);
  }, []);

  return (
    <>
      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted">PRÓXIMOS ROLÊS</h2>
        <ul className="space-y-3">
          {roles.length === 0 ? <li className="text-sm text-muted">Nada marcado ainda.</li> : null}
          {roles.map((role) => (
            <li key={role.id}>
              <Link href={`/roles/${role.id}`} className="block rounded-lg hover:bg-overlay">
                <p className="text-sm text-fg">{role.title}</p>
                <p className="text-xs text-muted">
                  {role.date} {role.time}
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
    </>
  );
}
