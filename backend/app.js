import express from 'express';
import compression from 'compression';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { pool, initializeDB, isPostgres } from './server/db.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import { PORT, NODE_ENV } from './config/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(compression({
  level: 4,
  threshold: 512,
  memLevel: 8,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

try {
  const { default: RateLimit } = await import('express-rate-limit');
  app.use(RateLimit({
    windowMs: 60 * 1000,
    max: 200,
    standardHeaders: false,
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down' },
  }));
} catch {}

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    if (ms > 200) console.log(`[SLOW] ${req.method} ${req.originalUrl} ${ms}ms`);
  });
  next();
});

app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(503).json({ error: 'Request timed out' });
  });
  next();
});

if (!process.env.VERCEL) {
  const uploadsDir = path.join(__dirname, 'uploads');
  app.use('/uploads', express.static(uploadsDir));
}

app.use('/api', routes);

if (NODE_ENV !== 'production') {
  try {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { clientPort: PORT }
      },
      root: path.join(__dirname, '..', 'frontend'),
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } catch (err) {
    console.warn('[VITE] Failed to start Vite dev server:', err.message);
  }
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath, {
    maxAge: '31536000000',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
    }
  }));
  app.get('*', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorHandler);

if (isPostgres) {
  try {
    const schemaPath = path.join(__dirname, 'schema.pg.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf8');
      const statements = schema.split(';').filter(s => s.trim().length > 0);
      for (const stmt of statements) {
        try { await pool.query(stmt.trim()); } catch {}
      }
      console.log('[DB] PostgreSQL schema applied');
    }
  } catch (err) {
    console.warn('[DB] Schema apply error:', err.message);
  }

  try {
    await pool.query('ALTER TABLE gardens ALTER COLUMN image TYPE TEXT');
    console.log('[DB] Migrated gardens.image column to TEXT');
  } catch {}
  try {
    await pool.query('ALTER TABLE seeds ALTER COLUMN videoUrl TYPE TEXT');
    console.log('[DB] Migrated seeds.videoUrl column to TEXT');
  } catch {}
  try {
    await pool.query(`ALTER TABLE seeds ADD COLUMN IF NOT EXISTS section VARCHAR(100) NOT NULL DEFAULT ''`);
    console.log('[DB] Added section column to seeds');
  } catch {}
  try {
    await pool.query(`ALTER TABLE seeds ADD COLUMN IF NOT EXISTS sortOrder INT NOT NULL DEFAULT 0`);
    console.log('[DB] Added sortOrder column to seeds');
  } catch {}
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS paidgardens JSONB DEFAULT '[]'::jsonb`);
  } catch {}
  try {
    await pool.query(`ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS "userEmail" VARCHAR(255) NOT NULL DEFAULT ''`);
  } catch {}
  try {
    await pool.query(`ALTER TABLE quiz_answers ADD COLUMN IF NOT EXISTS "userName" VARCHAR(255) NOT NULL DEFAULT ''`);
  } catch {}
} else {
  try {
    await pool.query('ALTER TABLE gardens MODIFY COLUMN image TEXT');
    console.log('[DB] Migrated gardens.image column to TEXT');
  } catch {}
  try {
    await pool.query('ALTER TABLE seeds MODIFY COLUMN videoUrl TEXT');
    console.log('[DB] Migrated seeds.videoUrl column to TEXT');
  } catch {}
  try {
    await pool.query(`ALTER TABLE seeds ADD COLUMN section VARCHAR(100) NOT NULL DEFAULT ''`);
    console.log('[DB] Added section column to seeds');
  } catch {}
  try {
    await pool.query(`ALTER TABLE seeds ADD COLUMN sortOrder INT NOT NULL DEFAULT 0`);
    console.log('[DB] Added sortOrder column to seeds');
  } catch {}
  try {
    await pool.query(`ALTER TABLE users ADD COLUMN paidGardens JSON DEFAULT ('[]')`);
  } catch {}
  try {
    await pool.query(`ALTER TABLE quiz_answers ADD COLUMN userEmail VARCHAR(255) NOT NULL DEFAULT ''`);
  } catch {}
  try {
    await pool.query(`ALTER TABLE quiz_answers ADD COLUMN userName VARCHAR(255) NOT NULL DEFAULT ''`);
  } catch {}
}

try {
  await initializeDB();
} catch (err) {
  console.error('[DB] Failed to preload MySQL data:', err);
  console.warn('[DB] Running without MySQL — using empty in-memory store');
}

export default app;
