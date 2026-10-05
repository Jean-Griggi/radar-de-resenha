import type { MusicKind, RoleMusic } from '@resenhometro/shared';
import { getUsersByIds } from '../users/users.map.js';
import { publicUrl } from '../../lib/storage.js';

export type MusicRow = {
  id: string;
  kind: string;
  title: string;
  artist: string | null;
  album: string | null;
  cover: string | null;
  spotify_url: string | null;
  spotify_id: string | null;
  added_by: string;
};

function musicKind(value: string): MusicKind {
  return value === 'playlist' ? 'playlist' : 'track';
}

/**
 * Linha da tabela `music` → item do contrato. `addedBy` vem sempre da coluna `added_by`
 * (gravada com a pessoa da sessão); o corpo da requisição nunca chega aqui.
 */
export async function mapMusicRows(rows: Array<Record<string, unknown>>): Promise<RoleMusic[]> {
  const list = rows as unknown as MusicRow[];
  const authors = await getUsersByIds([...new Set(list.map((row) => row.added_by))]);
  const byId = new Map(authors.map((author) => [author.id, author]));

  return list.flatMap((row) => {
    const author = byId.get(row.added_by);
    if (!author) return [];
    return [
      {
        id: row.id,
        kind: musicKind(row.kind),
        title: row.title,
        artist: row.artist,
        album: row.album,
        cover: row.cover,
        spotifyUrl: row.spotify_url,
        spotifyId: row.spotify_id,
        addedBy: {
          id: author.id,
          name: author.name,
          username: author.username,
          avatar: publicUrl(author.avatar),
        },
      },
    ];
  });
}
