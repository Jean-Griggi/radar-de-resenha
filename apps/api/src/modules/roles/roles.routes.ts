import type { FastifyInstance, FastifyReply } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { HttpError } from '../../lib/http.js';
import { attendanceSchema, commentSchema, createRoleSchema, musicSchema, updateRoleSchema } from '../common.schema.js';
import { addComment } from '../social/social.service.js';
import { addMusicToRole } from '../music/music.service.js';
import { createRole, deleteRole, listRoles, serializeRoleDetail, setAttendance, updateRole } from './roles.service.js';

function handleError(error: unknown, reply: FastifyReply) {
  if (error instanceof HttpError) {
    return reply.status(error.statusCode).send({ message: error.message });
  }
  throw error;
}

export async function rolesRoutes(app: FastifyInstance) {
  app.get('/roles', { preHandler: [authenticate] }, async (request) => {
    const { filter } = request.query as { filter?: string };
    return listRoles(filter, request.user.sub);
  });

  app.get('/roles/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const role = await serializeRoleDetail(id, request.user.sub);
    if (!role) return reply.status(404).send({ message: 'Rolê não encontrado' });
    return role;
  });

  app.post('/roles', { preHandler: [authenticate] }, async (request, reply) => {
    const body = createRoleSchema.parse(request.body);
    return reply.status(201).send(await createRole(request.user.sub, body));
  });

  app.put('/roles/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await updateRole(id, request.user.sub, updateRoleSchema.parse(request.body));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.patch('/roles/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      return await updateRole(id, request.user.sub, updateRoleSchema.parse(request.body));
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.delete('/roles/:id', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await deleteRole(id, request.user.sub);
      return reply.status(204).send();
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.post('/roles/:id/attendance', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = attendanceSchema.parse(request.body);
    try {
      return await setAttendance(id, request.user.sub, body.status);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.put('/roles/:id/attendance', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = attendanceSchema.parse(request.body);
    try {
      return await setAttendance(id, request.user.sub, body.status);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.get('/roles/:id/attendance', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const role = await serializeRoleDetail(id, request.user.sub);
    if (!role) return reply.status(404).send({ message: 'Rolê não encontrado' });
    return role.attendances;
  });

  app.get('/roles/:id/comments', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const role = await serializeRoleDetail(id, request.user.sub);
    if (!role) return reply.status(404).send({ message: 'Rolê não encontrado' });
    return role.comments;
  });

  app.post('/roles/:id/comments', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = commentSchema.parse(request.body);
    try {
      await addComment(request.user.sub, { targetType: 'role', targetId: id, content: body.content, parentId: body.parentId });
      return serializeRoleDetail(id, request.user.sub);
    } catch (error) {
      return handleError(error, reply);
    }
  });

  app.post('/roles/:id/music', { preHandler: [authenticate] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      await addMusicToRole(id, request.user.sub, musicSchema.parse(request.body));
      return serializeRoleDetail(id, request.user.sub);
    } catch (error) {
      return handleError(error, reply);
    }
  });
}
