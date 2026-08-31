'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Review } from '@resenhometro/shared';
import { Comments } from '@/components/Comments';
import { Reactions } from '@/components/Reactions';
import { RequireAuth } from '@/components/RequireAuth';
import { api, apiErrorMessage } from '@/lib/api';

export default function ReviewPage() {
  const params = useParams<{ id: string }>();
  const [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const { data } = await api.get<Review>(`/reviews/${params.id}`);
    setReview(data);
  }

  useEffect(() => {
    load().catch((err) => setError(apiErrorMessage(err, 'Resenha não encontrada')));
  }, [params.id]);

  if (!review) {
    return (
      <RequireAuth>
        <p>{error || 'Carregando...'}</p>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <article className="card space-y-4 p-6">
        <p className="text-amber-300">{'★'.repeat(review.rating)}</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">{review.title}</h1>
        <p className="text-slate-300">{review.content}</p>
        <div className="flex flex-wrap gap-2">
          {review.tags?.map((tag) => (
            <span key={tag} className="text-sm text-[var(--accent)]">
              #{tag}
            </span>
          ))}
        </div>
        {review.role ? (
          <Link href={`/roles/${review.role.id}`} className="text-sm text-slate-400 hover:text-white">
            Sobre o rolê {review.role.title}
          </Link>
        ) : null}
        <div className="grid gap-2 text-sm text-slate-400 sm:grid-cols-2">
          {Object.entries(review.ratings ?? {}).map(([key, value]) => (
            <p key={key}>
              {key}: {value}/5
            </p>
          ))}
        </div>
        <Reactions targetType="review" targetId={review.id} items={review.reactions ?? []} onChange={() => load()} />
        <Comments
          comments={review.comments ?? []}
          onChanged={load}
          onSubmit={async (content, parentId) => {
            await api.post(`/reviews/${review.id}/comments`, { content, parentId });
            await load();
          }}
        />
      </article>
    </RequireAuth>
  );
}
