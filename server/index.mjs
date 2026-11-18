import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createStore } from './store.mjs';
import { createApp } from './app.mjs';
const root = fileURLToPath(new URL('..', import.meta.url));
const store = createStore(),
  app = createApp(store);
if (process.argv.includes('--production')) {
  app.use(express.static(resolve(root, 'dist')));
  app.get('/{*path}', (_req, res) => res.sendFile(resolve(root, 'dist/index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({ root, server: { middlewareMode: true }, appType: 'spa' });
  app.use(vite.middlewares);
}
const server = app.listen(Number(process.env.PORT) || 5180, process.env.HOST || '127.0.0.1', () =>
  console.log(
    `Yinxiang Lab ready: http://${process.env.HOST || '127.0.0.1'}:${process.env.PORT || 5180}`,
  ),
);
const timer = setInterval(() => store.cleanup(), 3600000);
timer.unref();
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () =>
    server.close(() => {
      store.db.close();
      process.exit(0);
    }),
  );
