import type { FastifyReply, FastifyRequest } from 'fastify';

/**
 * Web envia o JWT no cookie httpOnly. `Authorization: Bearer` continua
 * válido só para testes/scripts — o front não guarda mais o token.
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: 'Não autorizado' });
  }
}
