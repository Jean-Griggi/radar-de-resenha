import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from '../src/app.js';

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
  const url = new URL(raw, 'http://localhost');
  const forwarded = url.searchParams.get('__p');
  if (forwarded) {
    url.searchParams.delete('__p');
    url.searchParams.delete('path');
    const search = url.searchParams.toString();
    req.url = search ? `${forwarded}?${search}` : forwarded;
    return;
  }

  let next = url.pathname;
  if (next === '/api' || next === '/api/index') next = '/';
  else if (next.startsWith('/api/')) next = next.slice(4);
  const search = url.searchParams.toString();
  req.url = search ? `${next}?${search}` : next || '/';
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
