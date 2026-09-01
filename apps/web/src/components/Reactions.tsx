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
    <div className="flex flex-wrap gap-1" role="group" aria-label="Reações">
      {(Object.keys(REACTION_EMOJI) as ReactionType[]).map((type) => {
        const current = items.find((item) => item.type === type);
        const reacted = Boolean(current?.reacted);
        const count = current?.count || 0;
        return (
          <button
            key={type}
            type="button"
            disabled={pending !== null}
            onClick={() => toggle(type)}
            className="reaction-btn disabled:opacity-40"
            aria-pressed={reacted}
            aria-label={`Reagir com ${REACTION_EMOJI[type]}`}
          >
            <span aria-hidden>{REACTION_EMOJI[type]}</span>
            {count > 0 ? <span className="text-xs tabular-nums">{count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
