import type { FastifyRequest } from 'fastify';
import { tooManyRequests } from './http.js';

export const AUTH_RATE_LIMIT_MAX = 10;
export const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
export const AUTH_RATE_LIMIT_MESSAGE = 'Muitas tentativas. Tente novamente em instantes.';
export const FORGOT_EMAIL_RATE_LIMIT_MAX = 5;

const buckets = new Map<string, { count: number; resetAt: number }>();

export function consumeKeyedLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  current.count += 1;
  if (current.count > max) {
    throw tooManyRequests(AUTH_RATE_LIMIT_MESSAGE);
  }
}

function clientIp(request: FastifyRequest) {
  return request.ip || 'local';
}

export function consumeAuthIpLimit(request: FastifyRequest, groupId: string) {
  consumeKeyedLimit(`${groupId}:${clientIp(request)}`, AUTH_RATE_LIMIT_MAX, AUTH_RATE_LIMIT_WINDOW_MS);
}

export function consumeForgotEmailLimit(email: string) {
  consumeKeyedLimit(
    `forgot-email:${email.trim().toLowerCase()}`,
    FORGOT_EMAIL_RATE_LIMIT_MAX,
    AUTH_RATE_LIMIT_WINDOW_MS,
  );
}
