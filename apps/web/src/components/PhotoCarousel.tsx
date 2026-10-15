'use client';

import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';
import { ArrowLeft, ArrowRight, ImageOff } from 'lucide-react';
import { formatMeta } from '@/lib/format';

export type CarouselPhoto = {
  id: string;
  url: string;
  caption?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
  /** Rolê de origem, só se o dado existir. */
  roleTitle?: string | null;
};

const SWIPE_PX = 40;

function altFor(photo: CarouselPhoto) {
  if (photo.caption) return photo.caption;
  const author = photo.authorName ? ` de ${photo.authorName}` : '';
  const role = photo.roleTitle ? ` em ${photo.roleTitle}` : '';
  return `Foto${author}${role}`;
}

/**
 * Carrossel de UMA foto por vez (D21). Todas as fotos ficam no DOM e só a atual é visível; a troca anima
 * `opacity` e `transform` (nunca `display: none`) e é circular. Teclado: setas, Home e End. Toque: arrastar na
 * horizontal (mouse não arrasta). `transitionStyle` dá o nome da View Transition à foto atual.
 */
export function PhotoCarousel({
  title,
  photos,
  startIndex = 0,
  transitionStyle,
}: {
  title: string;
  photos: CarouselPhoto[];
  startIndex?: number;
  transitionStyle?: CSSProperties;
}) {
  const total = photos.length;
  const [index, setIndex] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(total - 1, 0)),
  );
  // O painel de revelação só existe depois da primeira troca: na abertura a foto já aparece inteira,
  // senão a View Transition fotografaria o painel cobrindo a foto.
  const [moved, setMoved] = useState(false);
  const [loaded, setLoaded] = useState<Set<string>>(() => new Set());
  const [failed, setFailed] = useState<Set<string>>(() => new Set());
  const swipeStart = useRef<number | null>(null);

  const current = photos[index];
  if (!current) return null;

  function go(next: number) {
    if (total < 2) return;
    setMoved(true);
    setIndex(((next % total) + total) % total);
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    const keys: Record<string, () => void> = {
      ArrowLeft: () => go(index - 1),
      ArrowRight: () => go(index + 1),
      Home: () => go(0),
      End: () => go(total - 1),
    };
    const action = keys[event.key];
    if (!action) return;
    event.preventDefault();
    action();
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    swipeStart.current = event.pointerType === 'mouse' ? null : event.clientX;
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (start == null) return;
    const delta = event.clientX - start;
    if (Math.abs(delta) >= SWIPE_PX) go(delta < 0 ? index + 1 : index - 1);
  }

  const counter = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;

  return (
    <section
      className="k-carousel"
      aria-roledescription="carrossel"
      aria-label={title}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <h2 className="k-carousel__title k-display">{title}</h2>

      <div
        className="k-carousel__stage k-corners"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipeStart.current = null;
        }}
      >
        {photos.map((photo, position) => {
          const isCurrent = position === index;
          const isNear =
            position === (index + 1) % total || position === (index - 1 + total) % total;
          const hasFailed = failed.has(photo.id);
          return (
            <figure
              key={photo.id}
              className={isCurrent ? 'k-carousel__slide is-current' : 'k-carousel__slide'}
              role="group"
              aria-label={`${position + 1} de ${total}`}
              aria-hidden={!isCurrent}
              inert={!isCurrent}
              style={isCurrent ? transitionStyle : undefined}
            >
              {hasFailed ? (
                <div className="k-carousel__failed">
                  <ImageOff size={24} aria-hidden />
                  <p>Não foi possível carregar a foto.</p>
                </div>
              ) : (
                <>
                  <img
                    className="k-carousel__photo"
                    src={photo.url}
                    alt={altFor(photo)}
                    loading={isCurrent || isNear ? 'eager' : 'lazy'}
                    decoding="async"
                    draggable={false}
                    onLoad={() => setLoaded((set) => new Set(set).add(photo.id))}
                    onError={() => setFailed((set) => new Set(set).add(photo.id))}
                  />
                  {loaded.has(photo.id) ? null : (
                    <span className="k-carousel__loading skeleton" aria-hidden />
                  )}
                </>
              )}
              {moved ? <span className="k-carousel__veil" aria-hidden /> : null}
            </figure>
          );
        })}
      </div>

      <div className="k-carousel__info" key={current.id}>
        {current.caption ? <p className="k-carousel__caption">{current.caption}</p> : null}
        <p className="k-meta">
          {current.authorName ? <span>{current.authorName}</span> : null}
          {current.createdAt ? <span>{formatMeta(current.createdAt)}</span> : null}
          {current.roleTitle ? <em className="k-carousel__role">{current.roleTitle}</em> : null}
        </p>
      </div>

      {total > 1 ? (
        <div className="k-carousel__controls">
          <p className="k-meta" aria-live="polite">
            {counter}
          </p>
          <div className="k-carousel__buttons">
            <button type="button" aria-label="Foto anterior" onClick={() => go(index - 1)}>
              <ArrowLeft size={24} aria-hidden />
            </button>
            <button type="button" aria-label="Próxima foto" onClick={() => go(index + 1)}>
              <ArrowRight size={24} aria-hidden />
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
