const TTL_MS = 60_000;

export const SPOTIFY_CONNECTED_KEY = 'resenhometro_spotify_connected';

export type RailRole = { id: string; title: string; date: string | null; time: string | null };
export type RailPerson = { id: string; name: string; username: string; avatar: string | null };
export type ShellSpotifyStatus = {
  connected?: boolean;
  nowPlaying?: { title: string; artist: string; cover: string | null; spotifyUrl: string | null } | null;
};

type Box<T> = { data: T; at: number };

let suggestions: Box<RailPerson[]> | null = null;
let upcomingRoles: Box<RailRole[]> | null = null;
let unreadCount: Box<number> | null = null;
let spotifyStatus: Box<ShellSpotifyStatus> | null = null;
const inflight = new Map<string, Promise<unknown>>();

function fresh<T>(box: Box<T> | null): T | null {
  if (!box) return null;
  if (Date.now() - box.at >= TTL_MS) return null;
  return box.data;
}

export function withInflight<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const pending = fn().finally(() => inflight.delete(key));
  inflight.set(key, pending);
  return pending;
}

export function peekSuggestions() {
  return fresh(suggestions);
}

export function setCachedSuggestions(data: RailPerson[]) {
  suggestions = { data, at: Date.now() };
}

export function peekUpcomingRoles() {
  return fresh(upcomingRoles);
}

export function setCachedUpcomingRoles(data: RailRole[]) {
  upcomingRoles = { data, at: Date.now() };
}

export function peekUnreadCount() {
  return fresh(unreadCount);
}

export function setCachedUnreadCount(count: number) {
  unreadCount = { data: count, at: Date.now() };
}

export function peekSpotifyStatus() {
  return fresh(spotifyStatus);
}

export function setCachedSpotifyStatus(data: ShellSpotifyStatus) {
  spotifyStatus = { data, at: Date.now() };
}

export function getSpotifyConnectedFlag(): boolean | null {
  if (typeof window === 'undefined') return null;
  const value = localStorage.getItem(SPOTIFY_CONNECTED_KEY);
  if (value === '1') return true;
  if (value === '0') return false;
  return null;
}

export function setSpotifyConnectedFlag(connected: boolean) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SPOTIFY_CONNECTED_KEY, connected ? '1' : '0');
  if (!connected) spotifyStatus = null;
}

export function clearShellCache() {
  suggestions = null;
  upcomingRoles = null;
  unreadCount = null;
  spotifyStatus = null;
  inflight.clear();
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SPOTIFY_CONNECTED_KEY);
}
