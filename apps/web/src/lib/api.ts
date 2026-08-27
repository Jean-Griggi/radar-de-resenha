import axios from 'axios';
import { clearAuth, getToken } from './auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333',
});

const PUBLIC_AUTH_PREFIXES = ['/login', '/cadastro', '/esqueci-senha', '/redefinir-senha'];

export function isPublicAuthPath(pathname: string) {
  return PUBLIC_AUTH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

let loginRedirectStarted = false;

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error.response?.status === 401) {
      const path = window.location.pathname;

      if (!isPublicAuthPath(path) && !loginRedirectStarted) {
        loginRedirectStarted = true;
        clearAuth();
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

export function isApiCanceled(error: unknown) {
  return axios.isCancel(error) || (axios.isAxiosError(error) && error.code === 'ERR_CANCELED');
}

export function apiErrorMessage(error: unknown, fallback = 'Algo deu errado') {
  if (isApiCanceled(error)) return fallback;
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
    if (!error.response) return fallback;
  }
  if (error instanceof Error && error.message) return error.message;

  return fallback;
}
