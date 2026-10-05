import type { FastifyReply, FastifyRequest } from 'fastify';
import { queryOne } from '../db/client.js';

/**
 * Web envia o JWT no cookie httpOnly. `Authorization: Bearer` continua
 * válido só para testes/scripts — o front não guarda mais o token.
 *
 * Depois de um reset de senha, token emitido antes da troca deixa de valer:
 * compara o `iat` do JWT (segundos) com `users.password_changed_at`.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: 'Não autorizado' });
  }

  const { sub, iat } = request.user as { sub: string; iat?: number };
  const row = await queryOne<{ password_changed_at: string | Date | null }>(
    `SELECT password_changed_at FROM users WHERE id = $1`,
    [sub],
  );
  if (!row) return reply.status(401).send({ message: 'Não autorizado' });

  if (row.password_changed_at) {
    const changedAtSeconds = Math.floor(new Date(row.password_changed_at).getTime() / 1000);
    if (!iat || iat < changedAtSeconds) {
      return reply.status(401).send({ message: 'Sessão expirada. Entre de novo.' });
    }
  }
}
