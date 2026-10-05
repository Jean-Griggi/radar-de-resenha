import type { FastifyReply, FastifyRequest } from 'fastify';
import { queryOne } from '../db/client.js';

/**
 * Confere a sessão (cookie httpOnly ou `Authorization: Bearer` para testes/scripts).
 * Devolve o id do usuário, ou `null` se a sessão não vale.
 *
 * Depois de um reset de senha, token emitido antes da troca deixa de valer:
 * compara o `iat` do JWT (segundos) com `users.password_changed_at`.
 */
export async function checkSession(request: FastifyRequest): Promise<string | null> {
  try {
    await request.jwtVerify();
  } catch {
    return null;
  }

  const { sub, iat } = request.user as { sub: string; iat?: number };
  const row = await queryOne<{ password_changed_at: string | Date | null }>(
    `SELECT password_changed_at FROM users WHERE id = $1`,
    [sub],
  );
  if (!row) return null;

  if (row.password_changed_at) {
    const changedAtSeconds = Math.floor(new Date(row.password_changed_at).getTime() / 1000);
    if (!iat || iat < changedAtSeconds) return null;
  }
  return sub;
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  if (!(await checkSession(request))) {
    return reply.status(401).send({ message: 'Não autorizado' });
  }
}
