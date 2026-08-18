'use client';

import Link from 'next/link';
import { useMemo, useState, useEffect } from 'react';
import type { CalendarEvent } from '@resenhometro/shared';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';

export default function CalendarPage() {
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [upcoming, setUpcoming] = useState<CalendarEvent[]>([]);
  const [past, setPast] = useState<CalendarEvent[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  const month = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;

  useEffect(() => {
    api.get<{ events: CalendarEvent[]; upcoming: CalendarEvent[]; past: CalendarEvent[] }>('/calendar', { params: { month } }).then(({ data }) => {
      setEvents(data.events);
      setUpcoming(data.upcoming);
      setPast(data.past);
    });
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

  const selectedEvents = events.filter((event) => event.date === selected);

  return (
    <RequireAuth>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Calendário</h1>
        <div className="flex gap-2">
          <button type="button" className="rounded-lg bg-white/5 px-3 py-1" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            ←
          </button>
          <p className="px-2 py-1 capitalize">
            {cursor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </p>
          <button type="button" className="rounded-lg bg-white/5 px-3 py-1" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            →
          </button>
        </div>
      </div>
      <div className="card p-4">
        <div className="grid grid-cols-7 gap-2 text-center text-xs text-slate-400">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {days.map((day, index) => {
            const date = day ? `${month}-${String(day).padStart(2, '0')}` : '';
            const has = events.some((event) => event.date === date);
            return (
              <button
                key={index}
                type="button"
                disabled={!day}
                onClick={() => setSelected(date)}
                className={`relative min-h-16 rounded-xl p-2 text-left text-sm ${selected === date ? 'bg-violet-500/30' : 'bg-white/5'} ${!day ? 'opacity-0' : ''}`}
              >
                {day}
                {has ? <span className="absolute right-2 bottom-2 h-2 w-2 rounded-full bg-fuchsia-400" /> : null}
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
                <Link href={`/roles/${event.roleId}`}>
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
          {upcoming.map((event) => (
            <Link key={event.id} href={`/roles/${event.roleId}`} className="block py-1 text-sm">
              {event.date} {event.time} — {event.title}
            </Link>
          ))}
        </section>
        <section className="card p-5">
          <h2 className="mb-3 font-medium">Passados</h2>
          {past.map((event) => (
            <Link key={event.id} href={`/roles/${event.roleId}`} className="block py-1 text-sm">
              {event.date} — {event.title}
            </Link>
          ))}
        </section>
      </div>
    </RequireAuth>
  );
}
