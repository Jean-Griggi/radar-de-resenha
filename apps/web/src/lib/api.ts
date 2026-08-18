import axios from 'axios';
import { clearAuth, getToken } from './auth';

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333',
});

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

      if (!path.startsWith('/login') && !path.startsWith('/cadastro')) {
        clearAuth();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  },
);

export function apiErrorMessage(error: unknown, fallback = 'Algo deu errado') {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string') return message;
  }

  return fallback;
}
