import type { FastifyReply } from 'fastify';
import { isProductionLike } from '../config/env.js';

/** Cookie httpOnly da sessão. O JS da página não lê este valor. */
export const SESSION_COOKIE_NAME = 'resenhometro_session';

/**
 * Duração da sessão: JWT + cookie com 7 dias (`expiresIn` + `maxAge`).
 * Sem refresh token neste passo — ao expirar, o usuário entra de novo.
 */
export const SESSION_EXPIRES_IN = '7d';
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function cookieFlags() {
  const productionLike = isProductionLike();
  return {
    path: '/',
    httpOnly: true,
    // Prod (web e API em hosts diferentes, ex. dois projetos Vercel): SameSite=None + Secure
    // para o browser enviar o cookie em XHR cross-site. Dev (localhost:3000 → :3333) usa Lax.
    secure: productionLike,
    sameSite: productionLike ? ('none' as const) : ('lax' as const),
  };
}

export function setSessionCookie(reply: FastifyReply, token: string) {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    ...cookieFlags(),
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(reply: FastifyReply) {
  reply.clearCookie(SESSION_COOKIE_NAME, cookieFlags());
}
