'use client';

import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import type { MusicItem, ReactionSummary } from '@resenhometro/shared';
import { Avatar } from '@/components/Avatar';
import { TrackList, TrackRow } from '@/components/TrackRow';
import { formatTimeAgo } from '@/lib/format';
import { Reactions } from './Reactions';

/**
 * Publicação na variante "sem rolê vinculado" (D3/D4): sem faixa de capa, sem "em …" e sem imagem.
 * Reações continuam as cinco do componente atual (D6). A música, se houver, toca no player global.
 * É o conteúdo do detalhe (painel da Mesa): o texto aparece COMPLETO, sem corte nem esmaecimento.
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
  bare = false,
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
  /** Detalhe com foto: a moldura (cantoneiras) fica só na foto; o texto vem sem moldura e sem fundo de cartão. */
  bare?: boolean;
}) {
  return (
    <article className={bare ? 'k-post k-post--bare' : 'k-post'}>
      <div className={bare ? 'k-post__block' : 'k-post__block k-corners'} style={transitionStyle}>
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
        {content ? (
          <div className="k-post__caption">
            <p className="k-post__body">{content}</p>
          </div>
        ) : null}
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
          ) : null}
          <Reactions targetType="post" targetId={postId} items={reactions} onChange={onReactions} />
        </footer>
      </div>
      {comments ? <div className="k-post__comments">{comments}</div> : null}
    </article>
  );
}
