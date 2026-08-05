import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createRoleSchema } from './roles.schema.js';
import { createRole, getRoleById, listRoles } from './roles.service.js';

async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ message: 'Não autorizado' });
  }
}

export async function rolesRoutes(app: FastifyInstance) {
  app.get('/roles', async () => {
    return listRoles();
  });

  app.get('/roles/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const role = await getRoleById(id);

    if (!role) {
      return reply.status(404).send({ message: 'Rolê não encontrado' });
    }

    return role;
  });

  app.post('/roles', { preHandler: [authenticate] }, async (request, reply) => {
    const body = createRoleSchema.parse(request.body);
    const userId = request.user.sub;

    const role = await createRole(userId, body);

    return reply.status(201).send(role);
  });
}
