'use client';

import { useEffect, useState } from 'react';
import type { YearReview } from '@resenhometro/shared';
import { RequireAuth } from '@/components/RequireAuth';
import { api } from '@/lib/api';

export default function YearReviewPage() {
  const year = new Date().getFullYear();
  const [data, setData] = useState<YearReview | null>(null);

  useEffect(() => {
    api.get<YearReview>('/year-review', { params: { year } }).then(({ data }) => setData(data));
  }, [year]);

  if (!data) {
    return (
      <RequireAuth>
        <p>Montando retrospectiva...</p>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="space-y-4">
        <section className="overflow-hidden rounded-2xl bg-[linear-gradient(160deg,var(--ink),var(--brand-red-dark),var(--accent))] p-6 sm:rounded-3xl sm:p-10">
          <p className="text-sm tracking-[0.3em] text-white/70">REDESENHA WRAPPED</p>
          <h1 className="mt-2 text-2xl font-semibold sm:text-4xl">Seu {data.year} no Redesenha</h1>
        </section>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            [data.totalRoles, 'rolês'],
            [data.places, 'lugares'],
            [data.people, 'pessoas'],
            [data.reviews, 'resenhas'],
          ].map(([value, label]) => (
            <div key={String(label)} className="card p-5 text-center">
              <p className="text-3xl font-semibold">{value}</p>
              <p className="text-sm text-slate-400">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-6">
            <p className="text-sm text-slate-400">Seu mês mais agitado</p>
            <p className="text-2xl">{data.busiestMonth || 'Ainda em construção'}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-slate-400">Sua categoria favorita</p>
            <p className="text-2xl">{data.topCategory || '—'}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-slate-400">Sua música mais associada</p>
            <p className="text-2xl">{data.topTrack ? `${data.topTrack.title} — ${data.topTrack.artist}` : '—'}</p>
          </div>
          <div className="card p-6">
            <p className="text-sm text-slate-400">Seu parceiro de rolê</p>
            <p className="text-2xl">{data.topPartner?.name || '—'}</p>
          </div>
        </div>
      </div>
    </RequireAuth>
  );
}
