'use client';

import { EmptyState } from '@/components/Card';
import { MediaImage } from '@/components/MediaImage';
import { mesaTransitionStyle } from '@/components/Mesa';

export type ViewerPhoto = {
  id: string;
  url: string;
  caption?: string | null;
  authorName?: string | null;
  createdAt?: string | null;
};

/**
 * Conteúdo do painel aberto a partir da Mesa de fotos e álbuns: `title` é o nome do álbum (ou da galeria) e
 * `startId` a foto em que abre. `transitionId` é o id do tile de origem, para a foto grande receber o nome da
 * View Transition.
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
  const photo = photos.find((item) => item.id === startId) ?? photos[0];
  if (!photo) return <EmptyState title="Nenhuma foto por aqui." />;

  return (
    <>
      <h2 className="k-display">{title}</h2>
      <div className="k-mesa-viewer__hero" style={mesaTransitionStyle(transitionId)}>
        <MediaImage
          src={photo.url}
          alt={photo.caption || (photo.authorName ? `Foto de ${photo.authorName}` : 'Foto')}
          className="k-mesa-viewer__image"
        />
      </div>
      {photo.caption ? <p>{photo.caption}</p> : null}
    </>
  );
}
