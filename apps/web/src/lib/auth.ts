import { clearShellCache } from './shellCache';

const TOKEN_KEY = 'resenhometro_token';
const USER_KEY = 'resenhometro_user';

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar?: string | null;
  cover?: string | null;
  bio?: string | null;
  city?: string | null;
  isPublic?: boolean;
  createdAt?: string;
};

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
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

export function setAuth(token: string, user: AuthUser) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setUser(user: AuthUser) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  clearShellCache();
}
