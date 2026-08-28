'use client';

import { useState } from 'react';
import { REACTION_EMOJI, type ReactionSummary, type ReactionType } from '@resenhometro/shared';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { useToast } from './Toast';

export function Reactions({
  targetType,
  targetId,
  items,
  onChange,
}: {
  targetType: string;
  targetId: string;
  items: ReactionSummary[];
  onChange?: (items: ReactionSummary[]) => void;
}) {
  const toast = useToast();
  const [pending, setPending] = useState<ReactionType | null>(null);

  async function toggle(type: ReactionType) {
    if (pending) return;
    setPending(type);
    try {
      const { data } = await api.post<ReactionSummary[]>('/reactions', { targetType, targetId, type });
      onChange?.(data);
    } catch (err) {
      if (isApiCanceled(err)) return;
      toast.push(apiErrorMessage(err, 'Não foi possível registrar a reação'), 'error');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
        const current = items.find((item) => item.type === type);
        return (
          <button
            key={type}
            type="button"
            disabled={pending !== null}
            onClick={() => toggle(type)}
            className={`rounded-full border px-2.5 py-1 text-sm transition disabled:opacity-60 ${
              current?.reacted ? 'border-violet-400/50 bg-violet-500/20' : 'border-line bg-overlay hover:border-violet-400/30'
            }`}
            aria-label={`Reagir com ${REACTION_EMOJI[type]}`}
          >
            {REACTION_EMOJI[type]} {current?.count || ''}
          </button>
        );
      })}
    </div>
  );
}
