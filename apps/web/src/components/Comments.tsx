'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import type { Comment as CommentType } from '@resenhometro/shared';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatTimeAgo } from '@/lib/format';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Reactions } from './Reactions';

export function Comments({
  comments,
  onSubmit,
  onChanged,
  compact = false,
}: {
  comments: CommentType[];
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  onChanged?: () => void;
  compact?: boolean;
}) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const fieldId = useId();
  const me = getUser();

  async function submit(event: FormEvent, parentId?: string) {
    event.preventDefault();
    if (!text.trim()) return;
    await onSubmit(text.trim(), parentId);
    setText('');
    setReplyTo(null);
  }

  return (
    <section className={compact ? 'space-y-3' : 'space-y-4'}>
      <form onSubmit={(event) => submit(event, replyTo ?? undefined)} className="flex gap-2">
        <Avatar src={me?.avatar} name={me?.name} size="sm" />
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={fieldId}>
            Comentário
          </label>
          {compact ? (
            <input
              id={fieldId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? 'Responder…' : 'Comentar…'}
              className="min-h-11 w-full rounded-full border-2 border-line bg-input px-3 text-sm text-fg"
            />
          ) : (
            <textarea
              id={fieldId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? 'Escreva uma resposta...' : 'Escreva um comentário...'}
              className="min-h-20 w-full rounded-xl border border-line bg-input px-3 py-2 text-sm text-fg focus:ring-2 focus:ring-[var(--accent)]"
            />
          )}
          <div className="mt-2 flex items-center gap-2">
            <Button type="submit">{compact ? 'Enviar' : 'Publicar'}</Button>
            {replyTo ? (
              <button type="button" className="text-xs text-muted" onClick={() => setReplyTo(null)}>
                Cancelar resposta
              </button>
            ) : null}
          </div>
        </div>
      </form>
      <ul className={compact ? 'max-h-52 space-y-3 overflow-y-auto pr-1' : 'space-y-4'}>
        {comments.length === 0 ? <li className="text-xs text-muted">Seja o primeiro a comentar.</li> : null}
        {comments.map((comment) => (
          <li key={comment.id} className="space-y-3">
            <CommentItem comment={comment} compact={compact} onReply={() => setReplyTo(comment.id)} onChanged={onChanged} />
            {comment.replies?.length ? (
              <ul className="ml-4 space-y-3 border-l border-line pl-3 sm:ml-6 sm:pl-4">
                {comment.replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentItem comment={reply} compact={compact} onReply={() => setReplyTo(reply.id)} onChanged={onChanged} />
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FeedComments({ targetType, targetId }: { targetType: string; targetId: string }) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const { data } = await api.get<CommentType[]>('/comments', { params: { targetType, targetId } });
      setComments(data);
      setError('');
    } catch (err) {
      if (isApiCanceled(err)) return;
      setError(apiErrorMessage(err, 'Não foi possível carregar os comentários'));
    }
  }

  useEffect(() => {
    void load();
  }, [targetType, targetId]);

  return (
    <div>
      <p className="mb-2 text-label text-muted">Comentários</p>
      {error ? <p className="mb-2 text-xs text-rose-300">{error}</p> : null}
      <Comments
        compact
        comments={comments}
        onSubmit={async (content, parentId) => {
          const { data } = await api.post<CommentType[]>('/comments', { targetType, targetId, content, parentId });
          setComments(data);
        }}
        onChanged={load}
      />
    </div>
  );
}

function CommentItem({
  comment,
  compact = false,
  onReply,
  onChanged,
}: {
  comment: CommentType;
  compact?: boolean;
  onReply: () => void;
  onChanged?: () => void;
}) {
  const me = getUser();
  return (
    <div className="flex gap-2">
      <Avatar src={comment.author?.avatar} name={comment.author?.name} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-overlay px-3 py-2">
          <p className="text-sm font-medium text-fg">{comment.author?.name}</p>
          <p className="text-sm text-fg">{comment.content}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted">
          <span>{formatTimeAgo(String(comment.createdAt))}</span>
          <button type="button" onClick={onReply} className="hover:text-fg">
            Responder
          </button>
          {me?.id === comment.authorId ? (
            <button
              type="button"
              onClick={async () => {
                await api.delete(`/comments/${comment.id}`);
                onChanged?.();
              }}
              className="hover:text-rose-300"
            >
              Excluir
            </button>
          ) : null}
        </div>
        {!compact && comment.reactions ? (
          <div className="mt-2">
            <Reactions targetType="comment" targetId={comment.id} items={comment.reactions} onChange={() => onChanged?.()} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
