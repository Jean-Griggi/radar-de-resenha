'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import type { CalendarEvent } from '@resenhometro/shared';
import { Skeleton } from '@/components/Card';
import { RequireAuth } from '@/components/RequireAuth';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { formatShortDate } from '@/lib/format';

export default function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
  const [past, setPast] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  );

  const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api
      .get<{ events: CalendarEvent[]; upcoming: CalendarEvent[]; past: CalendarEvent[] }>('/calendar', {
        params: { month },
        signal: controller.signal,
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setEvents(data.events);
        setUpcoming(data.upcoming);
        setPast(data.past);
        setError('');
      })
      .catch((err) => {
        if (isApiCanceled(err)) return;
        setError(apiErrorMessage(err, 'Não foi possível carregar o calendário'));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month]);

  const days = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = start.getDay();
    const total = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < offset; i += 1) cells.push(null);
    for (let d = 1; d <= total; d += 1) cells.push(d);
    return cells;
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const selectedEvents = selected ? (eventsByDate.get(selected) ?? []) : [];
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const ready = !loading && !error;

  return (
    <RequireAuth>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold sm:text-3xl">Calendário</h1>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg bg-white/5 px-3 py-1" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            ←
          </button>
          <p className="min-w-0 flex-1 px-2 py-1 text-center capitalize sm:flex-none">
            {cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          <button type="button" className="rounded-lg bg-white/5 px-3 py-1" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            →
          </button>
        </div>
      </div>
      {loading ? <Skeleton className="mb-4 h-80" /> : null}
      {error ? <p className="mb-5 text-rose-300">{error}</p> : null}
      {ready ? (
        <>
          <div className="card p-2 sm:p-4">
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400 sm:gap-2 sm:text-xs">
              {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, index) => (
                <span key={`${d}-${index}`}>{d}</span>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1 sm:gap-2">
              {days.map((day, index) => {
                const date = day ? `${month}-${String(day).padStart(2, '0')}` : '';
                const dayEvents = date ? (eventsByDate.get(date) ?? []) : [];
                const extra = Math.max(0, dayEvents.length - 2);
                const isToday = date === today;
                return (
                  <button
                    key={index}
                    type="button"
                    disabled={!day}
                    onClick={() => setSelected(date)}
                    className={`relative flex min-h-16 flex-col gap-0.5 overflow-hidden rounded-lg p-1 text-left sm:min-h-24 sm:rounded-xl sm:p-2 lg:min-h-28 ${
                      selected === date ? 'bg-violet-500/30 ring-1 ring-violet-400/50' : 'bg-white/5'
                    } ${isToday && selected !== date ? 'ring-1 ring-fuchsia-400/60' : ''} ${!day ? 'opacity-0' : ''}`}
                  >
                    <span className={`text-xs sm:text-sm ${isToday ? 'font-semibold text-violet-300' : ''}`}>{day}</span>
                    <span className="flex min-h-0 flex-1 flex-col gap-0.5">
                      {dayEvents.slice(0, 2).map((event) => (
                        <span
                          key={event.id}
                          className="block truncate rounded bg-fuchsia-500/25 px-1 py-0.5 text-[9px] leading-tight text-fg sm:text-[11px]"
                        >
                          {event.time ? `${event.time} ` : ''}
                          {event.title}
                        </span>
                      ))}
                      {extra > 0 ? <span className="px-1 text-[9px] text-violet-300 sm:text-[10px]">+{extra}</span> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {selected ? (
            <section className="card mt-4 p-5">
              <h2 className="mb-3 font-medium">
                {new Date(`${selected}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
              </h2>
              {selectedEvents.length === 0 ? <p className="text-slate-400">Nenhum rolê neste dia.</p> : null}
              <ul className="space-y-2">
                {selectedEvents.map((event) => (
                  <li key={event.id}>
                    <Link href={`/roles/${event.roleId}`} className="hover:text-violet-300">
                      {event.time || '--:--'} — {event.title} · {event.category}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <section className="card p-5">
              <h2 className="mb-3 font-medium">Próximos</h2>
              {upcoming.length === 0 ? <p className="text-sm text-slate-400">Nada marcado ainda.</p> : null}
              {upcoming.map((event) => (
                <Link key={event.id} href={`/roles/${event.roleId}`} className="block py-1 text-sm hover:text-violet-300">
                  {formatShortDate(event.date)} {event.time ?? ''} — {event.title}
                </Link>
              ))}
            </section>
            <section className="card p-5">
              <h2 className="mb-3 font-medium">Passados</h2>
              {past.length === 0 ? <p className="text-sm text-slate-400">Nenhum rolê passado.</p> : null}
              {past.map((event) => (
                <Link key={event.id} href={`/roles/${event.roleId}`} className="block py-1 text-sm hover:text-violet-300">
                  {formatShortDate(event.date)} — {event.title}
                </Link>
              ))}
            </section>
          </div>
        </>
      ) : null}
    </RequireAuth>
  );
}
