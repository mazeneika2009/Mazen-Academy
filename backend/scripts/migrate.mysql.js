// MySQL migration: creates DB + all tables from the canonical schema.
// Usage: npm run db:migrate  (from backend/)
// Idempotent — safe to re-run. Uses DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME.
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DB_NAME = process.env.DB_NAME || 'edu';

let adminConn;
try {
  adminConn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  // 1. Schema (table definitions are MySQL-native: VARCHAR/INT/DATETIME/JSON/ENUM)
  let schema = fs.readFileSync(path.join(__dirname, '..', '..', 'schema.sql'), 'utf8');
  schema = schema
    .replace(/create DATABASE IF NOT EXISTS edu/i, `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\``)
    .replace(/USE edu;/i, `USE \`${DB_NAME}\`;`)
    .split('\n')
    .filter((l) => !l.trim().startsWith('select * from'))
    .join('\n');
  await adminConn.query(schema);
  console.log(`[migrate] schema applied to \`${DB_NAME}\``);

  await adminConn.changeUser({ database: DB_NAME });

  // 2. Incremental columns added by the app after the base schema (idempotent)
  const alters = [
    'ALTER TABLE gardens MODIFY COLUMN image TEXT',
    'ALTER TABLE seeds MODIFY COLUMN videoUrl TEXT',
    `ALTER TABLE seeds ADD COLUMN section VARCHAR(100) NOT NULL DEFAULT ''`,
    'ALTER TABLE seeds ADD COLUMN sortOrder INT NOT NULL DEFAULT 0',
    `ALTER TABLE users ADD COLUMN paidGardens JSON DEFAULT ('[]')`,
    `ALTER TABLE quiz_answers ADD COLUMN userEmail VARCHAR(255) NOT NULL DEFAULT ''`,
    `ALTER TABLE quiz_answers ADD COLUMN userName VARCHAR(255) NOT NULL DEFAULT ''`,
  ];
  for (const sql of alters) {
    try { await adminConn.query(sql); } catch (e) {
      if (!/duplicate column|dup/i.test(e.message)) console.warn('[migrate] alter skipped:', e.message);
    }
  }
  console.log('[migrate] incremental columns ensured');

  const [tables] = await adminConn.query('SHOW TABLES');
  console.log('[migrate] tables:', tables.map((t) => Object.values(t)[0]).join(', '));
  console.log('[migrate] DONE');
} catch (e) {
  console.error('[migrate] FAILED:', e.message);
  console.error('[migrate] Check DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME in backend/.env');
  process.exitCode = 1;
} finally {
  try { await adminConn?.end(); } catch {}
}
