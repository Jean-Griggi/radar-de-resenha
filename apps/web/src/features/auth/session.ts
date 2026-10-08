import type { AuthUser } from '@resenhometro/shared';
import { clearShellCache } from '@/lib/shellCache';

export type { AuthUser, Me, PublicUser } from '@resenhometro/shared';

/**
 * Plano B de sessão: o cookie httpOnly é o caminho principal, mas navegadores que bloqueiam cookie de outro
 * domínio (Safari/iPhone, Brave, Firefox estrito) nunca o enviam. O token devolvido no login vai no
 * cabeçalho `Authorization: Bearer`, que a API já aceita. Fica no localStorage, então vale a mesma sessão de 7 dias.
 */
const TOKEN_KEY = 'resenhometro_token';
const USER_KEY = 'resenhometro_user';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
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

export function setAuth(user: AuthUser, token?: string) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
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
