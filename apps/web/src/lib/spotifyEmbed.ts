import type { MusicKind } from '@resenhometro/shared';

export type SpotifyRef = { kind: MusicKind; id: string };

const SPOTIFY_URL = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|playlist)\/([A-Za-z0-9]{1,64})(?:[/?#].*)?$/;

/**
 * Lê faixa ou playlist de um link `open.spotify.com`. Qualquer outra coisa (outro host, `http`,
 * álbum, `javascript:`) devolve `null`: só links do Spotify viram iframe.
 */
export function parseSpotifyUrl(url: string | null | undefined): SpotifyRef | null {
  if (!url) return null;
  const match = SPOTIFY_URL.exec(url.trim());
  const [, kind, id] = match ?? [];
  if (!kind || !id) return null;
  return { kind: kind as MusicKind, id };
}

/** Player incorporado do Spotify: toca dentro da página, sem mandar a pessoa para o Spotify. */
export function spotifyEmbedSrc(ref: SpotifyRef) {
  return `https://open.spotify.com/embed/${ref.kind}/${ref.id}?utm_source=generator`;
}

/** Alturas que o Spotify documenta para o embed: 80 (compacto, faixa) e 152 (playlist). */
export function spotifyEmbedHeight(kind: MusicKind) {
  return kind === 'playlist' ? 152 : 80;
}
