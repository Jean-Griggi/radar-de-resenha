import { createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import type { MusicKind, SpotifyPlaylist, SpotifySearchResults, SpotifyTrack } from '@resenhometro/shared';
import { env } from '../../config/env.js';
import { exec, query, queryOne } from '../../db/client.js';
import { nowIso } from '../../lib/helpers.js';
import { addFeedEvent } from '../social/feed.js';
import { badRequest, notFound } from '../../lib/http.js';
import { mapMusicRows } from './music.map.js';

type HttpResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

function asHttp(response: unknown): HttpResponse {
  return response as HttpResponse;
}

type SpotifyTokens = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  display_name: string | null;
  product: string | null;
  spotify_id: string | null;
};

/** Item já resolvido no Spotify com a conta conectada: é isto que o servidor grava, nunca o que o cliente mandou. */
export type ResolvedSpotifyItem = {
  kind: MusicKind;
  spotifyId: string;
  title: string;
  artist: string | null;
  album: string | null;
  cover: string | null;
  spotifyUrl: string;
};

function configured() {
  return Boolean(env.SPOTIFY_CLIENT_ID && env.SPOTIFY_CLIENT_SECRET && env.SPOTIFY_REDIRECT_URI);
}

export function spotifyAuthUrl(state: string) {
  if (!configured()) throw badRequest('Spotify não configurado no servidor');
  const params = new URLSearchParams({
    client_id: env.SPOTIFY_CLIENT_ID!,
    response_type: 'code',
    redirect_uri: env.SPOTIFY_REDIRECT_URI!,
    state,
    // Sempre mostra a tela de permissões: sem isso o Spotify pode reaproveitar a autorização antiga
    // e a conta reconectada continuaria sem os escopos novos.
    show_dialog: 'true',
    scope:
      'user-read-private user-read-email user-read-currently-playing user-read-playback-state playlist-read-private playlist-read-collaborative user-library-read',
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

const SPOTIFY_FETCH_MS = 5_000;
const SPOTIFY_STATE_TTL_MS = 10 * 60 * 1000;
const PLAYLIST_PAGE = 50;
const PLAYLIST_MAX_PAGES = 6;
const SPOTIFY_DOWN = 'Não foi possível falar com o Spotify agora. Tente de novo.';

function signState(payload: string) {
  return createHmac('sha256', env.JWT_SECRET).update(`spotify-oauth:${payload}`).digest('hex');
}

/**
 * Estado do OAuth: `userId.exp.nonce` assinado. A assinatura prova que o servidor emitiu e que
 * ninguém alterou; o `nonce` guardado em `spotify_oauth_states` prova que ainda não foi usado.
 */
export async function issueSpotifyState(userId: string) {
  const nonce = randomBytes(16).toString('hex');
  const exp = Date.now() + SPOTIFY_STATE_TTL_MS;
  await exec(`DELETE FROM spotify_oauth_states WHERE expires_at < NOW() - INTERVAL '1 day'`);
  await exec(
    `INSERT INTO spotify_oauth_states (nonce, user_id, expires_at, created_at) VALUES ($1,$2,$3,$4)`,
    [nonce, userId, new Date(exp).toISOString(), nowIso()],
  );
  const payload = `${userId}.${exp}.${nonce}`;
  return Buffer.from(`${payload}.${signState(payload)}`).toString('base64url');
}

export function parseSpotifyState(state: string | undefined) {
  if (!state) return null;
  try {
    const raw = Buffer.from(state, 'base64url').toString('utf8');
    const parts = raw.split('.');
    if (parts.length !== 4) return null;
    const [userId, expRaw, nonce, sig] = parts;
    if (!userId || !expRaw || !nonce || !sig) return null;
    const exp = Number(expRaw);
    if (Number.isNaN(exp) || Date.now() > exp) return null;
    const a = Buffer.from(sig);
    const b = Buffer.from(signState(`${userId}.${expRaw}.${nonce}`));
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return { userId, nonce };
  } catch {
    return null;
  }
}

/**
 * Gasta o estado do callback. Só devolve `true` se a assinatura confere, foi emitido para a
 * mesma pessoa logada, não expirou e nunca foi usado (o UPDATE troca `used_at` numa instrução só).
 */
export async function consumeSpotifyState(state: string | undefined, sessionUserId: string) {
  const parsed = parseSpotifyState(state);
  if (!parsed || parsed.userId !== sessionUserId) return false;
  const row = await queryOne(
    `UPDATE spotify_oauth_states SET used_at = $1
     WHERE nonce = $2 AND user_id = $3 AND used_at IS NULL AND expires_at > $1
     RETURNING nonce`,
    [nowIso(), parsed.nonce, sessionUserId],
  );
  return Boolean(row);
}

async function tokenRequest(body: Record<string, string>) {
  const credentials = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const response = asHttp(
    await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
      signal: AbortSignal.timeout(SPOTIFY_FETCH_MS),
    }),
  );
  if (!response.ok) throw badRequest('Falha ao conectar com o Spotify');
  return response.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>;
}

async function ensureAccessToken(userId: string) {
  const row = await queryOne<SpotifyTokens>(`SELECT * FROM spotify_connections WHERE user_id = $1`, [userId]);
  if (!row) return null;
  if (new Date(row.expires_at).getTime() > Date.now() + 30_000) return row;

  if (!row.refresh_token) return row;
  const tokens = await tokenRequest({ grant_type: 'refresh_token', refresh_token: row.refresh_token });
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await exec(
    `UPDATE spotify_connections SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = $4 WHERE user_id = $5`,
    [tokens.access_token, tokens.refresh_token ?? row.refresh_token, expiresAt, nowIso(), userId],
  );
  return { ...row, access_token: tokens.access_token, expires_at: expiresAt };
}

export async function completeSpotifyAuth(userId: string, code: string) {
  const tokens = await tokenRequest({
    grant_type: 'authorization_code',
    code,
    redirect_uri: env.SPOTIFY_REDIRECT_URI!,
  });
  const meResponse = asHttp(
    await fetch('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      signal: AbortSignal.timeout(SPOTIFY_FETCH_MS),
    }),
  );
  if (!meResponse.ok) throw badRequest('Falha ao ler o perfil do Spotify');
  const profile = (await meResponse.json()) as { id: string; display_name: string; product?: string };

  const stamp = nowIso();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
  await exec(
    `INSERT INTO spotify_connections (user_id, spotify_id, display_name, product, access_token, refresh_token, expires_at, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     ON CONFLICT (user_id) DO UPDATE SET
       spotify_id = EXCLUDED.spotify_id,
       display_name = EXCLUDED.display_name,
       product = EXCLUDED.product,
       access_token = EXCLUDED.access_token,
       refresh_token = COALESCE(EXCLUDED.refresh_token, spotify_connections.refresh_token),
       expires_at = EXCLUDED.expires_at,
       updated_at = EXCLUDED.updated_at`,
    [userId, profile.id, profile.display_name, profile.product ?? null, tokens.access_token, tokens.refresh_token ?? null, expiresAt, stamp, stamp],
  );
}

/** Apaga os tokens guardados (access e refresh) e os estados de OAuth pendentes da pessoa. */
export async function disconnectSpotify(userId: string) {
  await exec(`DELETE FROM spotify_connections WHERE user_id = $1`, [userId]);
  await exec(`DELETE FROM spotify_oauth_states WHERE user_id = $1`, [userId]);
}

export async function getSpotifyAccount(userId: string) {
  let row: SpotifyTokens | null = null;
  try {
    row = await ensureAccessToken(userId);
  } catch {
    row = (await queryOne<SpotifyTokens>(`SELECT * FROM spotify_connections WHERE user_id = $1`, [userId])) ?? null;
    if (row) {
      return {
        connected: true,
        displayName: row.display_name,
        product: row.product,
        nowPlaying: null,
        configured: configured(),
      };
    }
  }
  if (!row) {
    return { connected: false, displayName: null, product: null, nowPlaying: null, configured: configured() };
  }

  let nowPlaying = null;
  try {
    const response = asHttp(
      await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
        headers: { Authorization: `Bearer ${row.access_token}` },
        signal: AbortSignal.timeout(SPOTIFY_FETCH_MS),
      }),
    );
    if (response.status === 200) {
      const data = (await response.json()) as {
        is_playing: boolean;
        item?: {
          name: string;
          id: string;
          album?: { name: string; images?: { url: string }[] };
          artists?: { name: string }[];
          external_urls?: { spotify: string };
        };
      };
      if (data.item) {
        nowPlaying = {
          title: data.item.name,
          artist: data.item.artists?.map((item) => item.name).join(', ') ?? '',
          album: data.item.album?.name ?? null,
          cover: data.item.album?.images?.[0]?.url ?? null,
          spotifyUrl: data.item.external_urls?.spotify ?? null,
          isPlaying: data.is_playing,
        };
      }
    }
  } catch {
    nowPlaying = null;
  }

  return {
    connected: true,
    displayName: row.display_name,
    product: row.product,
    nowPlaying,
    configured: configured(),
  };
}

// --- Leitura no Spotify com a conta conectada -------------------------------------------------

/** Motivo que o Spotify manda no corpo do erro (`{ error: { message } }`). Texto dele, sem token. */
async function spotifyErrorMessage(response: HttpResponse) {
  try {
    const body = (await response.json()) as { error?: { message?: unknown } | string; error_description?: unknown };
    const raw = typeof body.error === 'string' ? body.error_description ?? body.error : body.error?.message;
    return typeof raw === 'string' ? raw.slice(0, 160) : '';
  } catch {
    return '';
  }
}

/**
 * Traduz a recusa do Spotify em algo que a pessoa consegue agir em cima. O motivo vem do próprio Spotify:
 * permissão que faltou (reconectar), conta fora da lista do app em modo de desenvolvimento, token inválido.
 */
export function explainSpotifyRefusal(status: number, reason: string) {
  if (/scope/i.test(reason)) {
    return 'Faltam permissões do Spotify nesta conta. Clique em "Reconectar Spotify" na tela de Música e aceite todas as permissões.';
  }
  if (/not registered|developer dashboard|user management|allowlist/i.test(reason)) {
    return 'Esta conta do Spotify ainda não está liberada neste app. Quem administra o app precisa adicionar o seu e-mail em "User Management" no painel do Spotify.';
  }
  if (status === 401) {
    return 'A sessão do Spotify venceu. Desconecte e conecte de novo na tela de Música.';
  }
  return `O Spotify recusou o acesso (${status})${reason ? `: ${reason}` : ''}. Se continuar, desconecte e conecte de novo na tela de Música.`;
}

async function spotifyGet<T>(accessToken: string, path: string): Promise<T> {
  let response: HttpResponse;
  try {
    response = asHttp(
      await fetch(`https://api.spotify.com/v1${path}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(SPOTIFY_FETCH_MS),
      }),
    );
  } catch {
    throw badRequest(SPOTIFY_DOWN);
  }
  if (response.status === 401 || response.status === 403) {
    const reason = await spotifyErrorMessage(response);
    // Vai para o log do servidor (Vercel) para dar para diagnosticar; não leva token nem corpo da resposta.
    console.warn(`spotify ${response.status} em ${path.split('?')[0]}: ${reason || 'sem motivo no corpo'}`);
    throw badRequest(explainSpotifyRefusal(response.status, reason));
  }
  if (response.status === 404) throw badRequest('Item não encontrado na sua conta do Spotify.');
  if (!response.ok) throw badRequest(SPOTIFY_DOWN);
  return (await response.json()) as T;
}

type SpotifyImage = { url?: string };

/** Capa e link só entram se vierem em https do Spotify; nada de URL solta ou HTML. */
function safeCover(images: SpotifyImage[] | undefined) {
  const url = images?.find((image) => typeof image?.url === 'string')?.url;
  if (!url) return null;
  try {
    return new URL(url).protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

function safeSpotifyUrl(value: string | undefined, kind: MusicKind, id: string) {
  try {
    const url = new URL(value ?? '');
    if (url.protocol === 'https:' && url.hostname === 'open.spotify.com') return url.toString();
  } catch {
    // cai no link montado a partir do id (que já foi validado como base62)
  }
  return `https://open.spotify.com/${kind}/${id}`;
}

type SpotifyPlaylistItem = {
  id: string;
  name: string;
  images?: SpotifyImage[];
  tracks?: { total?: number };
  external_urls?: { spotify?: string };
};

type SpotifyTrackItem = {
  id: string;
  name: string;
  album?: { name?: string; images?: SpotifyImage[] };
  artists?: { name: string }[];
  external_urls?: { spotify?: string };
};

function toPlaylist(item: SpotifyPlaylistItem): SpotifyPlaylist {
  return {
    id: item.id,
    name: item.name,
    image: safeCover(item.images),
    tracks: item.tracks?.total ?? 0,
    url: safeSpotifyUrl(item.external_urls?.spotify, 'playlist', item.id),
  };
}

function toTrack(item: SpotifyTrackItem): SpotifyTrack {
  return {
    id: item.id,
    title: item.name,
    artist: item.artists?.map((artist) => artist.name).join(', ') ?? '',
    cover: safeCover(item.album?.images),
    url: safeSpotifyUrl(item.external_urls?.spotify, 'track', item.id),
  };
}

async function connectedAccount(userId: string) {
  const row = await ensureAccessToken(userId);
  if (!row) throw badRequest('Conecte sua conta do Spotify antes de escolher música.');
  return row;
}

async function listPlaylistItems(accessToken: string, stopAt?: string) {
  const found: SpotifyPlaylistItem[] = [];
  for (let page = 0; page < PLAYLIST_MAX_PAGES; page += 1) {
    const data = await spotifyGet<{ items?: Array<SpotifyPlaylistItem | null>; next?: string | null }>(
      accessToken,
      `/me/playlists?limit=${PLAYLIST_PAGE}&offset=${page * PLAYLIST_PAGE}`,
    );
    for (const item of data.items ?? []) {
      if (item?.id) found.push(item);
    }
    if (stopAt && found.some((item) => item.id === stopAt)) break;
    if (!data.next) break;
  }
  return found;
}

export async function getPlaylists(userId: string): Promise<SpotifyPlaylist[]> {
  const row = await ensureAccessToken(userId);
  if (!row) return [];
  try {
    return (await listPlaylistItems(row.access_token)).map(toPlaylist);
  } catch {
    return [];
  }
}

/** Faixas da biblioteca (músicas curtidas) da conta conectada. */
export async function getSavedTracks(userId: string): Promise<SpotifyTrack[]> {
  const row = await connectedAccount(userId);
  const data = await spotifyGet<{ items?: Array<{ track?: SpotifyTrackItem | null }> }>(
    row.access_token,
    '/me/tracks?limit=50',
  );
  return (data.items ?? []).flatMap((entry) => (entry.track?.id ? [toTrack(entry.track)] : []));
}

const SEARCH_LIMIT = 10;

/**
 * Pesquisa faixas e playlists no catálogo do Spotify com a conta conectada. Serve para ouvir no player:
 * o resultado não vira item de rolê nem de story, que continuam aceitando só o que é da conta (`resolveSpotifyItem`).
 */
export async function searchSpotify(userId: string, text: string): Promise<SpotifySearchResults> {
  const row = await connectedAccount(userId);
  const data = await spotifyGet<{
    tracks?: { items?: Array<SpotifyTrackItem | null> };
    playlists?: { items?: Array<SpotifyPlaylistItem | null> };
  }>(row.access_token, `/search?q=${encodeURIComponent(text)}&type=track,playlist&limit=${SEARCH_LIMIT}`);

  // O Spotify devolve `null` no meio da lista de playlists; sem id não dá para tocar, então sai.
  return {
    tracks: (data.tracks?.items ?? []).flatMap((item) => (item?.id ? [toTrack(item)] : [])),
    playlists: (data.playlists?.items ?? []).flatMap((item) => (item?.id ? [toPlaylist(item)] : [])),
  };
}

/**
 * Resolve no Spotify, com a conta conectada, a faixa ou playlist que a pessoa escolheu.
 * Id que não é da conta responde 400 e nada é gravado.
 */
export async function resolveSpotifyItem(
  userId: string,
  kind: MusicKind,
  spotifyId: string,
): Promise<ResolvedSpotifyItem> {
  const row = await connectedAccount(userId);

  if (kind === 'playlist') {
    const item = (await listPlaylistItems(row.access_token, spotifyId)).find((entry) => entry.id === spotifyId);
    if (!item) throw badRequest('Essa playlist não é da sua conta do Spotify.');
    const playlist = toPlaylist(item);
    return {
      kind,
      spotifyId,
      title: playlist.name,
      artist: null,
      album: null,
      cover: playlist.image,
      spotifyUrl: playlist.url,
    };
  }

  const contains = await spotifyGet<boolean[]>(row.access_token, `/me/tracks/contains?ids=${spotifyId}`);
  if (!contains?.[0]) throw badRequest('Essa faixa não está na biblioteca da sua conta do Spotify.');
  const item = await spotifyGet<SpotifyTrackItem>(row.access_token, `/tracks/${spotifyId}`);
  const track = toTrack(item);
  return {
    kind,
    spotifyId,
    title: track.title,
    artist: track.artist || null,
    album: item.album?.name ?? null,
    cover: track.cover,
    spotifyUrl: track.url,
  };
}

// --- Música no rolê ---------------------------------------------------------------------------

export async function addMusicToRole(
  roleId: string,
  userId: string,
  input: { kind: MusicKind; spotifyId: string },
) {
  const role = await queryOne(`SELECT id FROM roles WHERE id = $1`, [roleId]);
  if (!role) throw notFound('Rolê não encontrado');

  const item = await resolveSpotifyItem(userId, input.kind, input.spotifyId);
  const id = randomUUID();
  await exec(
    `INSERT INTO music (id, role_id, kind, title, artist, album, cover, spotify_url, spotify_id, added_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, roleId, item.kind, item.title, item.artist, item.album, item.cover, item.spotifyUrl, item.spotifyId, userId, nowIso()],
  );
  await addFeedEvent({ type: 'music_added', actorId: userId, roleId, musicId: id });
  return { id };
}

export async function listMusic(userId?: string) {
  const rows = userId
    ? await query(
        `SELECT * FROM music WHERE added_by = $1 OR role_id IN (SELECT id FROM roles WHERE creator_id = $1) ORDER BY created_at DESC`,
        [userId],
      )
    : await query(`SELECT * FROM music ORDER BY created_at DESC LIMIT 40`);
  return mapMusicRows(rows);
}
