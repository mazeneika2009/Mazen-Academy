import app from './app.js';
import { PORT } from './config/index.js';
import { pool } from './server/db.js';

const isVercel = !!process.env.VERCEL;

if (!isVercel) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SERVER] Mazen Academy engine online on http://localhost:${PORT}`);
  });

  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;
  server.maxHeadersCount = 500;
  server.requestTimeout = 30000;

  const shutdown = async () => {
    console.log('[SERVER] Shutting down gracefully...');
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

export default async function handler(req, res) {
  return app(req, res);
}
