'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { MusicItem, ReactionSummary } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { TrackList, TrackRow } from '@/components/TrackRow';
import { formatTimeAgo } from '@/lib/format';
import { Reactions } from './Reactions';

/**
 * Publicação na variante "sem rolê vinculado" (D3/D4): sem faixa de capa, sem "em …" e sem imagem.
 * Reações continuam as cinco do componente atual (D6). A música, se houver, toca no player global.
 */
export function Post({
  postId,
  authorName,
  username,
  avatar,
  createdAt,
  content,
  music,
  onPlay,
  reactions,
  onReactions,
  comments,
  transitionStyle,
}: {
  postId: string;
  authorName: string;
  username?: string | null;
  avatar?: string | null;
  createdAt: string;
  content: string;
  music?: MusicItem | null;
  onPlay?: () => void;
  reactions: ReactionSummary[];
  onReactions: (items: ReactionSummary[]) => void;
  comments?: ReactNode;
  /** Nome da View Transition quando o post abre a partir de um tile de texto da Mesa. */
  transitionStyle?: CSSProperties;
}) {
  return (
    <article className="k-post">
      <div className="k-post__block k-corners" style={transitionStyle}>
        <div className="k-post__avatar">
          <Avatar src={avatar} name={authorName} />
        </div>
        <header className="k-post__head">
          {username ? (
            <h2 className="k-display k-post__name">
              <Link href={`/perfil/${username}`}>{authorName}</Link>
            </h2>
          ) : (
            <h2 className="k-display k-post__name">{authorName}</h2>
          )}
          <time className="k-meta" dateTime={createdAt}>
            {formatTimeAgo(createdAt)}
          </time>
        </header>
        {content ? <Caption text={content} /> : null}
        <footer className="k-post__foot">
          {music ? (
            <TrackList className="k-post__track">
              <TrackRow
                compact
                cover={music.cover}
                title={music.title}
                artist={music.artist ?? 'Playlist'}
                onSelect={onPlay}
              />
            </TrackList>
          ) : (
            <span />
          )}
          <Reactions targetType="post" targetId={postId} items={reactions} onChange={onReactions} />
        </footer>
      </div>
      {comments ? <div className="k-post__comments">{comments}</div> : null}
    </article>
  );
}

/** Esmaece a legenda depois de 3 linhas; "ver mais" expande. O esmaecimento só cobre a última linha. */
function Caption({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    setOverflows(el.scrollHeight > el.clientHeight + 1);
  }, [text, open]);

  return (
    <div className="k-post__caption">
      <p ref={ref} className={open ? 'k-post__body' : 'k-post__body k-post__body--clamp'}>
        {text}
      </p>
      {overflows ? (
        <button
          type="button"
          className="button button--ghost"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'ver menos' : 'ver mais'}
        </button>
      ) : null}
    </div>
  );
}
