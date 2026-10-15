'use client';

import { EmptyState } from '@/components/Card';
import { mesaTransitionStyle } from '@/components/Mesa';
import { PhotoCarousel, type CarouselPhoto } from '@/components/PhotoCarousel';

export type ViewerPhoto = CarouselPhoto;

/**
 * Conteúdo do painel aberto a partir da Mesa de fotos e álbuns (D21): carrossel de uma foto por vez.
 * `title` é o nome do álbum (ou da galeria) e `startId` a foto em que abre. `transitionId` é o id do tile de
 * origem, para a foto atual receber o nome da View Transition.
 */
export function PhotoViewer({
  title,
  photos,
  startId,
  transitionId,
}: {
  title: string;
  photos: ViewerPhoto[];
  startId?: string;
  transitionId: string;
}) {
  if (photos.length === 0) {
    return (
      <>
        <h2 className="k-display">{title}</h2>
        <EmptyState title="Nenhuma foto por aqui." />
      </>
    );
  }
  const start = Math.max(
    photos.findIndex((photo) => photo.id === startId),
    0,
  );
  return (
    <PhotoCarousel
      title={title}
      photos={photos}
      startIndex={start}
      transitionStyle={mesaTransitionStyle(transitionId)}
    />
  );
}
