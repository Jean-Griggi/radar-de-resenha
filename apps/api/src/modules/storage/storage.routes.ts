import type { FastifyInstance } from 'fastify';
import { authenticate } from '../../lib/authenticate.js';
import { signUpload } from '../../lib/storage.js';
import { signUploadSchema } from '../common.schema.js';

export async function storageRoutes(app: FastifyInstance) {
  app.post('/storage/sign', { preHandler: [authenticate] }, async (request) => {
    const body = signUploadSchema.parse(request.body);
    return signUpload(body.kind, body.contentType, body.filename, request.user.sub);
  });
}
