import { randomUUID } from 'node:crypto';
import { env } from '../../config/env.js';
import { exec, query, queryOne } from '../../db/client.js';
import { addFeedEvent, nowIso } from '../../lib/helpers.js';
import { badRequest, notFound } from '../../lib/http.js';

type SpotifyTokens = {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string;
  display_name: string | null;
  product: string | null;
  spotify_id: string | null;
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
    scope: 'user-read-private user-read-email user-read-currently-playing user-read-playback-state playlist-read-private playlist-read-collaborative',
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

async function tokenRequest(body: Record<string, string>) {
  const credentials = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  });
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
  const me = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).then((res) => res.json() as Promise<{ id: string; display_name: string; product?: string }>);

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
    [userId, me.id, me.display_name, me.product ?? null, tokens.access_token, tokens.refresh_token ?? null, expiresAt, stamp, stamp],
  );
}

export async function disconnectSpotify(userId: string) {
  await exec(`DELETE FROM spotify_connections WHERE user_id = $1`, [userId]);
}

export async function getSpotifyAccount(userId: string) {
  const row = await ensureAccessToken(userId);
  if (!row) {
    return { connected: false, displayName: null, product: null, nowPlaying: null, configured: configured() };
  }

  let nowPlaying = null;
  try {
    const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${row.access_token}` },
    });
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

export async function getPlaylists(userId: string) {
  const row = await ensureAccessToken(userId);
  if (!row) return [];
  const response = await fetch('https://api.spotify.com/v1/me/playlists?limit=20', {
    headers: { Authorization: `Bearer ${row.access_token}` },
  });
  if (!response.ok) return [];
  const data = (await response.json()) as {
    items: { id: string; name: string; images?: { url: string }[]; tracks?: { total: number }; external_urls?: { spotify: string } }[];
  };
  return (data.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    image: item.images?.[0]?.url ?? null,
    tracks: item.tracks?.total ?? 0,
    url: item.external_urls?.spotify ?? `https://open.spotify.com/playlist/${item.id}`,
  }));
}

export async function addMusicToRole(
  roleId: string,
  userId: string,
  input: { title: string; artist: string; album?: string | null; cover?: string | null; spotifyUrl?: string | null; spotifyId?: string | null },
) {
  const role = await queryOne(`SELECT id FROM roles WHERE id = $1`, [roleId]);
  if (!role) throw notFound('Rolê não encontrado');
  const id = randomUUID();
  await exec(
    `INSERT INTO music (id, role_id, title, artist, album, cover, spotify_url, spotify_id, added_by, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [id, roleId, input.title, input.artist, input.album ?? null, input.cover ?? null, input.spotifyUrl ?? null, input.spotifyId ?? null, userId, nowIso()],
  );
  await addFeedEvent({ type: 'music_added', actorId: userId, roleId, musicId: id });
  return { id, ...input };
}

export async function listMusic(userId?: string) {
  if (userId) {
    return query(
      `SELECT * FROM music WHERE added_by = $1 OR role_id IN (SELECT id FROM roles WHERE creator_id = $1) ORDER BY created_at DESC`,
      [userId],
    );
  }
  return query(`SELECT * FROM music ORDER BY created_at DESC LIMIT 40`);
}

export const oauthStates = new Map<string, string>();
