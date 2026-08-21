import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../src/app.js';

// Reaproveita a mesma instância do Fastify entre invocações "quentes" da
// função serverless (evita reconectar no banco/refazer setup a cada request).
let appPromise: ReturnType<typeof buildApp> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = buildApp().catch((error) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 30,
};

function restoreOriginalUrl(req: IncomingMessage) {
  const raw = req.url || '/';
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.slice(0, q);
  const search = q === -1 ? '' : raw.slice(q);

  let next = path;
  if (next === '/api' || next === '/api/index') next = '/';
  else if (next.startsWith('/api/')) next = next.slice(4);

  req.url = `${next}${search}` || '/';
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  restoreOriginalUrl(req);
  const app = await getApp();
  await app.ready();
  app.server.emit('request', req, res);
  await new Promise<void>((resolve) => {
    res.once('finish', resolve);
    res.once('close', resolve);
  });
}
