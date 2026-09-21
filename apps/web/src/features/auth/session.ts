import type { AuthUser } from '@resenhometro/shared';
import { clearShellCache } from '@/lib/shellCache';

export type { AuthUser, Me, PublicUser } from '@resenhometro/shared';

const LEGACY_TOKEN_KEY = 'resenhometro_token';
const USER_KEY = 'resenhometro_user';

function dropLegacyToken() {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(user: AuthUser) {
  dropLegacyToken();
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setUser(user: AuthUser) {
  dropLegacyToken();
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  dropLegacyToken();
  localStorage.removeItem(USER_KEY);
  clearShellCache();
}
