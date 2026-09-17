import dotenv from 'dotenv';
import mysql from 'mysql2/promise';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

const DATABASE_URL = process.env.DATABASE_URL || '';
// MySQL is primary; Postgres only with explicit DB_DIALECT=postgres.
const isPostgres =
  (process.env.DB_DIALECT || 'mysql').toLowerCase() === 'postgres' &&
  DATABASE_URL.startsWith('postgresql://');

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

let pool;

if (isPostgres) {
  const pgPool = new pg.Pool({
    connectionString: DATABASE_URL.split('?')[0],
    ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 10,
  });
  pool = {
    query: async (text, params) => {
      const adapted = convertPlaceholders(text);
      const result = await pgPool.query(adapted, params);
      return [result.rows];
    },
    end: () => pgPool.end(),
  };
} else {
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'knowledge_garden',
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
  });
}

function upsertQuery(table, columns, conflictColumns) {
  const colList = columns.join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const updateCols = columns.filter(c => !conflictColumns.includes(c));

  if (isPostgres) {
    if (updateCols.length === 0) {
      return `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (${conflictColumns.join(', ')}) DO NOTHING`;
    }
    const updateSet = updateCols.map(c => `${c} = EXCLUDED.${c}`).join(', ');
    return `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON CONFLICT (${conflictColumns.join(', ')}) DO UPDATE SET ${updateSet}`;
  }

  const updateSet = updateCols.map(c => `${c} = VALUES(${c})`).join(', ');
  if (updateCols.length === 0) {
    return `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${conflictColumns[0]}=VALUES(${conflictColumns[0]})`;
  }
  return `INSERT INTO ${table} (${colList}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updateSet}`;
}

async function run() {
  try {
    if (!isPostgres) {
      const schema = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');
      const safeSchema = schema
        .replace(/DROP TABLE IF EXISTS .+;/g, '')
        .replace('SET FOREIGN_KEY_CHECKS = 0;', '')
        .replace('SET FOREIGN_KEY_CHECKS = 1;', '');
      await pool.query(safeSchema);
      console.log('[Seed] Tables ensured (MySQL)');
    } else {
      for (const table of ['quiz_answers', 'quiz_questions', 'otp_verifications', 'query_replies', 'queries', 'emails', 'seed_tags', 'seeds', 'student_growth', 'payments', 'gardens', 'users']) {
        try { await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`); } catch {}
      }
      const schema = fs.readFileSync(path.join(__dirname, 'schema.pg.sql'), 'utf8');
      const statements = schema.split(';').filter(s => s.trim().length > 0);
      for (const stmt of statements) {
        try { await pool.query(stmt.trim()); } catch (e) { console.warn('[Seed] Schema stmt failed:', e.message); }
      }
      console.log('[Seed] Tables ensured (PostgreSQL)');
    }


    const gardenColumns = ['id', 'titleEn', 'titleAr', 'titleTr', 'descriptionEn', 'descriptionAr', 'descriptionTr', 'category', 'priceEGP', 'priceTRY', 'rating', 'image'];
    for (const g of gardens) {
      await pool.query(
        upsertQuery('gardens', gardenColumns, ['id']),
        [g.id, g.titleEn, g.titleAr, g.titleTr, g.descriptionEn, g.descriptionAr, g.descriptionTr, g.category, g.priceEGP, g.priceTRY, g.rating, g.image]
      );
    }
    console.log('[Seed] 3 gardens inserted');


    const seedColumns = ['id', 'gardenId', 'titleEn', 'titleAr', 'titleTr', 'duration', 'videoUrl', 'status', 'section', 'sortOrder'];
    for (const s of seedData) {
      await pool.query(
        upsertQuery('seeds', seedColumns, ['id']),
        [s.id, s.gardenId, s.titleEn, s.titleAr, s.titleTr, s.duration, s.videoUrl, 'bloomed', s.section, s.sortOrder]
      );
      if (s.tags) {
        const tags = s.tags.split(',');
        for (const tag of tags) {
          await pool.query(
            upsertQuery('seed_tags', ['seedId', 'tag'], ['seedId', 'tag']),
            [s.id, tag.trim()]
          );
        }
      }
    }
    console.log('[Seed] 60 seeds inserted');

   
    const userColumns = ['id', 'email', 'phone', 'name', 'passwordHash', 'isVerified', 'verificationCode', 'createdAt', 'current_session_id', 'paidGardens'];
    for (const u of users) {
      await pool.query(
        upsertQuery('users', userColumns, ['id']),
        [u.id, u.email, u.phone, u.name, u.passwordHash, u.isVerified, u.verificationCode, u.createdAt, u.currentSessionId, u.paidGardens]
      );
    }
    console.log('[Seed] 1 user inserted');

    
    const paymentColumns = ['id', 'userId', 'userEmail', 'gardenId', 'currency', 'amount', 'gateway', 'paymentMethod', 'screenshot', 'status', 'timestamp'];
    for (const p of payments) {
      await pool.query(
        upsertQuery('payments', paymentColumns, ['id']),
        [p.id, p.userId, p.userEmail, p.gardenId, p.currency, p.amount, p.gateway, p.paymentMethod, p.screenshot, p.status, p.timestamp]
      );
    }
    console.log('[Seed] 3 payments inserted');

    
    const qqColumns = ['id', 'seedId', 'questionEn', 'questionAr', 'questionTr', 'optionsEn', 'optionsAr', 'optionsTr', 'correctIndex', 'timestamp'];
    const nowTimestamp = Math.floor(Date.now() / 1000);
    for (const q of quizQuestions) {
      await pool.query(
        isPostgres
          ? `INSERT INTO quiz_questions (id, seedId, questionEn, questionAr, questionTr, optionsEn, optionsAr, optionsTr, correctIndex, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET seedId=EXCLUDED.seedId, questionEn=EXCLUDED.questionEn, questionAr=EXCLUDED.questionAr, questionTr=EXCLUDED.questionTr, optionsEn=EXCLUDED.optionsEn, optionsAr=EXCLUDED.optionsAr, optionsTr=EXCLUDED.optionsTr, correctIndex=EXCLUDED.correctIndex`
          : `INSERT INTO quiz_questions (id, seedId, questionEn, questionAr, questionTr, optionsEn, optionsAr, optionsTr, correctIndex, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UNIX_TIMESTAMP()) ON DUPLICATE KEY UPDATE seedId=VALUES(seedId), questionEn=VALUES(questionEn), questionAr=VALUES(questionAr), questionTr=VALUES(questionTr), optionsEn=VALUES(optionsEn), optionsAr=VALUES(optionsAr), optionsTr=VALUES(optionsTr), correctIndex=VALUES(correctIndex)`,
        [q.id, q.seedId, q.questionEn, q.questionAr, q.questionTr, q.optionsEn, q.optionsAr, q.optionsTr, q.correctIndex, isPostgres ? nowTimestamp : undefined].filter(p => p !== undefined)
      );
    }
    console.log('[Seed] 18 quiz questions inserted');

    console.log('[Seed] All data restored successfully!');
    await pool.end();
  } catch (e) {
    console.error('[Seed] Error:', e.message);
  }
}

run();
