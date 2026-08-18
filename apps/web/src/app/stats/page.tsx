'use client';

import { useEffect, useState } from 'react';
import type { StatsOverview } from '@resenhometro/shared';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';

function Bars({ items, label }: { items: { label: string; count: number }[]; label: string }) {
  const max = Math.max(...items.map((item) => item.count), 1);
  return (
    <section className="card p-5">
      <h2 className="mb-4 font-medium">{label}</h2>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.label} className="grid grid-cols-[8rem_1fr_2rem] items-center gap-2 text-sm">
            <span className="truncate text-slate-300">{item.label}</span>
            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-sky-400" style={{ width: `${(item.count / max) * 100}%` }} />
            </div>
            <span className="text-right text-slate-400">{item.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<StatsOverview | null>(null);

  useEffect(() => {
    api.get<StatsOverview>('/stats').then(({ data }) => setStats(data));
  }, []);

  if (!stats) {
    return (
      <RequireAuth>
        <p>Carregando estatísticas...</p>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(120deg,#1e1b4b,#4c1d95,#0ea5e9)] p-8">
        <p className="text-sm text-white/80">Dashboard</p>
        <h1 className="text-3xl font-semibold">Sua vida social em números</h1>
        <a href="/year-review" className="mt-3 inline-block text-sm text-white/80 underline">
          Ver retrospectiva anual
        </a>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {[
          ['Rolês', stats.totalRoles],
          ['Resenhas', stats.totalReviews],
          ['Participações', stats.participations],
          ['Amigos', stats.friends],
          ['Lugares', stats.placesVisited],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Bars label="Rolês por mês" items={stats.rolesByMonth.map((item) => ({ label: item.month, count: item.count }))} />
        <Bars label="Por categoria" items={stats.rolesByCategory.map((item) => ({ label: item.category, count: item.count }))} />
        <Bars label="Dias mais ativos" items={stats.rolesByWeekday.map((item) => ({ label: item.weekday, count: item.count }))} />
        <Bars label="Horários" items={stats.hourDistribution.map((item) => ({ label: `${item.hour}h`, count: item.count }))} />
        <Bars label="Lugares mais visitados" items={stats.topPlaces.map((item) => ({ label: item.name, count: item.count }))} />
        <Bars label="Pessoas mais presentes" items={stats.topPeople.map((item) => ({ label: item.user.name, count: item.count }))} />
        <Bars label="Artistas" items={stats.topArtists.map((item) => ({ label: item.name, count: item.count }))} />
        <section className="card p-5">
          <h2 className="mb-3 font-medium">Média das avaliações</h2>
          <p className="text-3xl">{stats.ratingsAverage ?? '—'}</p>
          <ul className="mt-3 space-y-1 text-sm text-slate-300">
            {Object.entries(stats.ratingsByCategory).map(([key, value]) => (
              <li key={key}>
                {key}: {value}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </RequireAuth>
  );
}
