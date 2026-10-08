import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authenticate } from '../../lib/authenticate.js';
import { takeUpload } from '../../lib/storage.js';
import { chatUnreadCount, listConversations, listMessages, MESSAGE_MAX, sendMessage } from './chat.service.js';

const sendSchema = z.object({
  content: z.string().trim().min(1, { message: 'Mensagem vazia' }).max(MESSAGE_MAX, { message: 'Mensagem longa demais' }),
});

const afterSchema = z.object({ after: z.string().datetime().optional() });

export async function chatRoutes(app: FastifyInstance) {
  app.get('/chat/conversations', { preHandler: [authenticate] }, async (request) =>
    listConversations(request.user.sub),
  );

  app.get('/chat/unread-count', { preHandler: [authenticate] }, async (request) => ({
    count: await chatUnreadCount(request.user.sub),
  }));

  app.get('/chat/:username/messages', { preHandler: [authenticate] }, async (request) => {
    const { username } = request.params as { username: string };
    const { after } = afterSchema.parse(request.query);
    return listMessages(request.user.sub, username, after);
  });

  // Foto (com legenda opcional). Mesmo caminho dos outros uploads: multipart local ou arquivo já enviado e confirmado.
  app.post('/chat/:username/image', { preHandler: [authenticate] }, async (request) => {
    const { username } = request.params as { username: string };
    const saved = await takeUpload(request, 'chat');
    const caption = z.string().trim().max(MESSAGE_MAX).catch('').parse(saved.fields.content ?? '');
    return sendMessage(request.user.sub, username, caption, saved.relative);
  });

  app.post('/chat/:username/messages', { preHandler: [authenticate] }, async (request) => {
    const { username } = request.params as { username: string };
    const body = sendSchema.parse(request.body);
    return sendMessage(request.user.sub, username, body.content);
  });
}
