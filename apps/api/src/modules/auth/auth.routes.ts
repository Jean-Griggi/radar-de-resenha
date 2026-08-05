import type { FastifyInstance } from 'fastify';
import { loginSchema, registerSchema } from './auth.schema.js';
import { loginUser, registerUser } from './auth.service.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);

    try {
      const user = await registerUser(body);
      const token = app.jwt.sign({ sub: user.id, email: user.email });

      return reply.status(201).send({ user, token });
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_EXISTS') {
        return reply.status(409).send({ message: 'E-mail já cadastrado' });
      }

      throw error;
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);

    try {
      const user = await loginUser(body);
      const token = app.jwt.sign({ sub: user.id, email: user.email });

      return reply.send({ user, token });
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
        return reply.status(401).send({ message: 'E-mail ou senha inválidos' });
      }

      throw error;
    }
  });
}
