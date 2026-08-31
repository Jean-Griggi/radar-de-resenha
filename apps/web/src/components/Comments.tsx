'use client';

import { FormEvent, useState } from 'react';
import type { Comment as CommentType } from '@resenhometro/shared';
import { api } from '@/lib/api';
import { getUser } from '@/lib/auth';
import { formatTimeAgo } from '@/lib/format';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Reactions } from './Reactions';

export function Comments({
  comments,
  onSubmit,
  onChanged,
}: {
  comments: CommentType[];
  onSubmit: (content: string, parentId?: string) => Promise<void>;
  onChanged?: () => void;
}) {
  const [text, setText] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const me = getUser();

  async function submit(event: FormEvent, parentId?: string) {
    event.preventDefault();
    if (!text.trim()) return;
    await onSubmit(text.trim(), parentId);
    setText('');
    setReplyTo(null);
  }

  return (
    <section className="space-y-4">
      <form onSubmit={(event) => submit(event, replyTo ?? undefined)} className="flex gap-3">
        <Avatar src={me?.avatar} name={me?.name} size="sm" />
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor="comment">
            Comentário
          </label>
          <textarea
            id="comment"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={replyTo ? 'Escreva uma resposta...' : 'Escreva um comentário...'}
            className="min-h-20 w-full rounded-xl border border-line bg-input px-3 py-2 text-sm text-fg focus:ring-2 focus:ring-[var(--accent)]"
          />
          <div className="mt-2 flex items-center gap-2">
            <Button type="submit">Publicar</Button>
            {replyTo ? (
              <button type="button" className="text-xs text-slate-400" onClick={() => setReplyTo(null)}>
                Cancelar resposta
              </button>
            ) : null}
          </div>
        </div>
      </form>
      <ul className="space-y-4">
        {comments.map((comment) => (
          <li key={comment.id} className="space-y-3">
            <CommentItem comment={comment} onReply={() => setReplyTo(comment.id)} onChanged={onChanged} />
            {comment.replies?.length ? (
              <ul className="ml-4 space-y-3 border-l border-line pl-3 sm:ml-8 sm:pl-4">
                {comment.replies.map((reply) => (
                  <li key={reply.id}>
                    <CommentItem comment={reply} onReply={() => setReplyTo(reply.id)} onChanged={onChanged} />
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

function CommentItem({
  comment,
  onReply,
  onChanged,
}: {
  comment: CommentType;
  onReply: () => void;
  onChanged?: () => void;
}) {
  const me = getUser();
  return (
    <div className="flex gap-3">
      <Avatar src={comment.author?.avatar} name={comment.author?.name} size="sm" />
      <div className="flex-1">
        <div className="rounded-2xl bg-overlay px-3 py-2">
          <p className="text-sm font-medium text-fg">{comment.author?.name}</p>
          <p className="text-sm text-fg">{comment.content}</p>
        </div>
        <div className="mt-1 flex items-center gap-3 text-xs text-muted">
          <span>{formatTimeAgo(String(comment.createdAt))}</span>
          <button type="button" onClick={onReply} className="hover:text-white">
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
        {comment.reactions ? (
          <div className="mt-2">
            <Reactions targetType="comment" targetId={comment.id} items={comment.reactions} onChange={() => onChanged?.()} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
