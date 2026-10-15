'use client';

import { FormEvent, useEffect, useId, useState } from 'react';
import { Plus } from 'lucide-react';
import type { Comment as CommentType } from '@resenhometro/shared';
import { api, apiErrorMessage, isApiCanceled } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatTimeAgo } from '@/lib/format';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Reactions } from './Reactions';

export function Comments({
  comments,
  onSubmit,
  onChanged,
  compact = false,
  accent = !compact,
}: {
  comments: CommentType[];
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  onChanged?: () => void;
  compact?: boolean;
  /** "Enviar" fica sódio SÓ com texto (tela de detalhe, onde é a ação principal); no feed é sempre secundário. */
  accent?: boolean;
}) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const fieldId = useId();
  const reasonId = useId();
  const me = getUser();
  const empty = !text.trim();

  async function submit(event: FormEvent, parentId?: string) {
    event.preventDefault();
    if (!text.trim()) return;
    await onSubmit(text.trim(), parentId);
    setText('');
    setReplyTo(null);
  }

  return (
    <section className={`k-measure ${compact ? 'space-y-3' : 'space-y-4'}`}>
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
              className="input"
              aria-describedby={empty ? reasonId : undefined}
            />
          ) : (
            <textarea
              id={fieldId}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={replyTo ? 'Escreva uma resposta...' : 'Escreva um comentário...'}
              className="input min-h-20"
              aria-describedby={empty ? reasonId : undefined}
            />
          )}
          <div className="mt-2 flex items-center gap-2">
            {/* Sódio só com texto (a ação principal da tela); vazio = secundário e desabilitado, com o motivo em texto. */}
            <Button
              type="submit"
              variant={accent && !empty ? 'primary' : 'secondary'}
              disabled={empty}
              aria-describedby={empty ? reasonId : undefined}
            >
              {compact ? 'Enviar' : 'Publicar'}
            </Button>
            {replyTo ? (
              <button type="button" className="text-xs text-muted" onClick={() => setReplyTo(null)}>
                Cancelar resposta
              </button>
            ) : null}
          </div>
          {empty ? (
            <p id={reasonId} className="k-reason">
              Escreva um comentário.
            </p>
          ) : null}
        </div>
      </form>
      <ul className={compact ? 'max-h-52 space-y-3 overflow-y-auto pr-1' : 'space-y-4'}>
        {comments.length === 0 ? <li className="k-reason">Seja o primeiro a comentar.</li> : null}
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

export function FeedComments({
  targetType,
  targetId,
  accent = false,
  collapsible = false,
}: {
  targetType: string;
  targetId: string;
  accent?: boolean;
  /** No feed: bloco recolhido (<details>), com a contagem no resumo; o formulário e a lista só aparecem abertos. */
  collapsible?: boolean;
}) {
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

  const body = (
    <>
      {error ? <p className="mb-2 text-xs text-[var(--k-danger)]">{error}</p> : null}
      <Comments
        compact
        accent={accent}
        comments={comments}
        onSubmit={async (content, parentId) => {
          const { data } = await api.post<CommentType[]>('/comments', { targetType, targetId, content, parentId });
          setComments(data);
        }}
        onChanged={load}
      />
    </>
  );

  if (collapsible) {
    const total = comments.reduce((sum, item) => sum + 1 + (item.replies?.length ?? 0), 0);
    return (
      <details className="k-comments">
        <summary>
          Comentários
          {total > 0 ? <span className="k-meta">{total}</span> : null}
          <Plus size={16} aria-hidden className="k-comments__icon" />
        </summary>
        <div className="k-comments__body">{body}</div>
      </details>
    );
  }

  return (
    <div>
      <p className="mb-2 text-label text-muted">Comentários</p>
      {body}
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
        <div className="rounded-none bg-overlay px-3 py-2">
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
              className="hover:text-[var(--k-danger)]"
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
