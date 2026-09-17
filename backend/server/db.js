import mysql from 'mysql2/promise';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const DATABASE_URL = process.env.DATABASE_URL || '';
// MySQL is the primary database. Postgres is only used when explicitly
// opted in via DB_DIALECT=postgres (legacy Neon deployment).
export const isPostgres =
  (process.env.DB_DIALECT || 'mysql').toLowerCase() === 'postgres' &&
  DATABASE_URL.startsWith('postgresql://');
export const isMySQL = !isPostgres;

export const mysqlConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'edu',
};

function convertPlaceholders(sql) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

let _pool;

const PG_COLUMN_MAP = {
  passwordhash: 'passwordHash',
  isverified: 'isVerified',
  verificationcode: 'verificationCode',
  paidgardens: 'paidGardens',
  titleen: 'titleEn',
  titlear: 'titleAr',
  titletr: 'titleTr',
  descriptionen: 'descriptionEn',
  descriptionar: 'descriptionAr',
  descriptiontr: 'descriptionTr',
  priceegp: 'priceEGP',
  pricetry: 'priceTRY',
  gardenid: 'gardenId',
  sortorder: 'sortOrder',
  videourl: 'videoUrl',
  isread: 'isRead',
  isgrowthreport: 'isGrowthReport',
  iswelcome: 'isWelcome',
  studentname: 'studentName',
  studentemail: 'studentEmail',
  createdtime: 'createdTime',
  isused: 'isUsed',
  otpcode: 'otpCode',
  paymentmethod: 'paymentMethod',
  questionen: 'questionEn',
  questionar: 'questionAr',
  questiontr: 'questionTr',
  optionsen: 'optionsEn',
  optionsar: 'optionsAr',
  optionstr: 'optionsTr',
  correctindex: 'correctIndex',
  useremail: 'userEmail',
  username: 'userName',
  questionid: 'questionId',
  seedid: 'seedId',
  iscorrect: 'isCorrect',
  userid: 'userId',
  watchedseconds: 'watchedSeconds',
  lastupdated: 'lastUpdated',
  queryid: 'queryId',
  gardenid: 'gardenId',
};

function pgMapRow(row) {
  const r = {};
  for (const [k, v] of Object.entries(row)) {
    const camelKey = PG_COLUMN_MAP[k] || k;
    r[camelKey] = v;
  }
  return r;
}

if (isPostgres) {
  const pgPool = new pg.Pool({
    connectionString: DATABASE_URL.split('?')[0],
    ssl: DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });

  pgPool.on('error', err => console.error('[DB] PostgreSQL pool error:', err.message));

  _pool = {
    query: async (text, params) => {
      const adapted = convertPlaceholders(text);
      const result = await pgPool.query(adapted, params);
      return [result.rows.map(pgMapRow)];
    },
    execute: async (text, params) => {
      const adapted = convertPlaceholders(text);
      const result = await pgPool.query(adapted, params);
      return [result.rows.map(pgMapRow)];
    },
    end: () => pgPool.end(),
  };
  console.log('[DB] PostgreSQL pool ready');
} else {
  _pool = mysql.createPool({
    ...mysqlConfig,
    waitForConnections: true,
    connectionLimit: 100,
    queueLimit: 200,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
  });
  console.log(`[DB] MySQL pool ready (${mysqlConfig.user}@${mysqlConfig.host}:${mysqlConfig.port}/${mysqlConfig.database})`);
}

export const pool = _pool;

let memoryDb = null;

function parseRow(row, jsonFields) {
  const r = { ...row };
  for (const f of jsonFields) {
    if (typeof r[f] === 'string') { try { r[f] = JSON.parse(r[f]); } catch { } }
  }
  return r;
}

function pluck(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') { try { return JSON.parse(val); } catch { return val; } }
  return val;
}

async function loadAll() {
  const db = {};
  const start = Date.now();

  const groupConcatTags = isPostgres
    ? `SELECT s.*, COALESCE(string_agg(st.tag, ','), '') AS tags FROM seeds s LEFT JOIN seed_tags st ON st.seedId = s.id GROUP BY s.id`
    : `SELECT s.*, GROUP_CONCAT(st.tag) AS tags FROM seeds s LEFT JOIN seed_tags st ON st.seedId = s.id GROUP BY s.id`;

  const [
    [users],
    [emails],
    [gardens],
    [seedRows],
    [payments],
    [growth],
    [qRows],
    [replies],
    [otp],
    [qq],
    [qa],
  ] = await Promise.all([
    pool.query('SELECT * FROM users'),
    pool.query('SELECT * FROM emails'),
    pool.query('SELECT * FROM gardens'),
    pool.query(groupConcatTags),
    pool.query('SELECT * FROM payments'),
    pool.query('SELECT * FROM student_growth'),
    pool.query('SELECT * FROM queries'),
    pool.query('SELECT * FROM query_replies'),
    pool.query('SELECT * FROM otp_verifications'),
    pool.query('SELECT * FROM quiz_questions'),
    pool.query('SELECT * FROM quiz_answers'),
  ]);

  db.users = users.map(u => parseRow(u, ['paidGardens']));
  db.emails = emails.map(e => parseRow(e, ['isRead', 'isGrowthReport', 'isWelcome']));
  db.gardens = gardens;
  db.seeds = seedRows.map(s => ({ ...s, tags: s.tags ? s.tags.split(',') : [] }));
  db.payments = payments;
  db.student_growth = growth;

  const replyMap = new Map();
  for (const r of replies) {
    if (!replyMap.has(r.queryId)) replyMap.set(r.queryId, []);
    replyMap.get(r.queryId).push({ author: r.author, text: r.text, timestamp: r.timestamp });
  }
  db.queries = qRows.map(q => ({
    ...q,
    replies: replyMap.get(q.id) || [],
  }));

  db.otp_verifications = otp.map(o => parseRow(o, ['isUsed']));
  db.quiz_questions = qq.map(q => ({
    ...q,
    optionsEn: pluck(q.optionsEn),
    optionsAr: pluck(q.optionsAr),
    optionsTr: pluck(q.optionsTr),
  }));
  db.quiz_answers = qa;

  console.log(`[DB] Cache loaded in ${Date.now() - start}ms: ${db.users.length} users, ${db.gardens.length} gardens, ${db.seeds.length} seeds`);
  return db;
}

function emptyDb() {
  return {
    users: [], emails: [], gardens: [], seeds: [], payments: [],
    student_growth: [], queries: [], otp_verifications: [],
    quiz_questions: [], quiz_answers: [], notebooks: {},
  };
}

export async function initializeDB() {
  console.log('[DB] Loading all data from database...');
  try {
    const fromDb = await loadAll();
    if (!loadFromCache()) {
      memoryDb = fromDb;
    } else {
      for (const key of ['users', 'emails', 'gardens', 'seeds', 'payments',
        'student_growth', 'queries', 'otp_verifications',
        'quiz_questions', 'quiz_answers']) {
        if (fromDb[key]) memoryDb[key] = fromDb[key];
      }
    }
    console.log('[DB] Loaded', memoryDb.users.length, 'users,', memoryDb.gardens.length, 'gardens,',
      memoryDb.seeds.length, 'seeds,', memoryDb.quiz_questions.length, 'questions,',
      memoryDb.payments.length, 'payments');
  } catch (err) {
    console.error('[DB] Failed to load from database:', err.message);
    if (!loadFromCache()) {
      console.warn('[DB] No cache available — using empty store');
      memoryDb = emptyDb();
    } else {
      console.log('[DB] Serving from JSON cache until database is reachable');
    }
  }
}

const DB_DEFAULTS = emptyDb();

export function readDB() {
  if (!memoryDb) memoryDb = emptyDb();
  for (const k of Object.keys(DB_DEFAULTS)) {
    if (!(k in memoryDb)) memoryDb[k] = DB_DEFAULTS[k];
  }
  return memoryDb;
}

const DB_CACHE_PATH = path.join(__dirname, '..', 'data', 'db.json');

export function writeDB(_db) {
  if (!_db) return;
  try {
    const dir = path.dirname(DB_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_CACHE_PATH, JSON.stringify(_db, null, 2), 'utf8');
    memoryDb = _db;
  } catch (err) {
    console.error('[DB] Failed to write cache:', err);
  }
}

export function loadFromCache() {
  try {
    if (fs.existsSync(DB_CACHE_PATH)) {
      const raw = fs.readFileSync(DB_CACHE_PATH, 'utf8');
      const cached = JSON.parse(raw);
      if (cached && typeof cached === 'object') {
        memoryDb = cached;
        console.log('[DB] Restored from JSON cache');
        return true;
      }
    }
  } catch (err) {
    console.warn('[DB] Cache load failed:', err);
  }
  return false;
}

export async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function getUserById(id) {
  const rows = await query('SELECT * FROM users WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function createUser(user) {
  const sql = isPostgres
    ? `INSERT INTO users (id, email, phone, passwordHash, isVerified, verificationCode, createdAt, current_session_id, paidGardens)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET
         email=EXCLUDED.email, phone=EXCLUDED.phone, passwordHash=EXCLUDED.passwordHash,
         isVerified=EXCLUDED.isVerified, verificationCode=EXCLUDED.verificationCode,
         current_session_id=EXCLUDED.current_session_id, paidGardens=EXCLUDED.paidGardens`
    : `INSERT INTO users (id, email, phone, passwordHash, isVerified, verificationCode, createdAt, current_session_id, paidGardens)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         email=VALUES(email), phone=VALUES(phone), passwordHash=VALUES(passwordHash),
         isVerified=VALUES(isVerified), verificationCode=VALUES(verificationCode),
         current_session_id=VALUES(current_session_id), paidGardens=VALUES(paidGardens)`;

  await pool.execute(
    sql,
    [user.id, user.email, user.phone, user.passwordHash, user.isVerified ? 1 : 0,
     user.verificationCode || '', user.createdAt, user.current_session_id ?? null,
     JSON.stringify(user.paidGardens || [])]
  );
}

export async function updateUserSession(userId, sessionId) {
  await pool.execute('UPDATE users SET current_session_id = ? WHERE id = ?', [sessionId, userId]);
}

export async function setPaymentStatus(paymentId, status) {
  await pool.execute('UPDATE payments SET status = ? WHERE id = ?', [status, paymentId]);
}

// ========== Cross-DB SQL helpers ==========

export function groupConcatSQL(column, alias, separator = ',') {
  if (isPostgres) return `string_agg(${column}, '${separator}') AS ${alias}`;
  return `GROUP_CONCAT(${column}) AS ${alias}`;
}

export function upsertQuery(table, columns, conflictColumns) {
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

export function nowSQL() {
  return 'NOW()';
}

export function jsonArrayAppendSQL(column, valueExpr) {
  if (isPostgres) {
    return `${column} = COALESCE(${column}::jsonb, '[]'::jsonb) || to_jsonb(${valueExpr}::text)`;
  }
  return `${column} = JSON_ARRAY_APPEND(COALESCE(${column}, '[]'), '$', ${valueExpr})`;
}

export function jsonRemoveValueSQL(column, valueExpr) {
  if (isPostgres) {
    return `${column} = (SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) FROM jsonb_array_elements_text(COALESCE(${column}::jsonb, '[]'::jsonb)) AS elem WHERE elem::text != ${valueExpr}::text)`;
  }
  return `${column} = JSON_REMOVE(COALESCE(${column}, '[]'), JSON_UNQUOTE(JSON_SEARCH(COALESCE(${column}, '[]'), 'one', ${valueExpr})))`;
}

export function jsonContainsSQL(column, valueExpr) {
  if (isPostgres) {
    return `COALESCE(${column}::jsonb, '[]'::jsonb) @> to_jsonb(${valueExpr}::text)`;
  }
  return `JSON_CONTAINS(COALESCE(${column}, '[]'), ${valueExpr}, '$')`;
}

export function castBoolean(val) {
  if (isPostgres) return !!val;
  return val ? 1 : 0;
}

export const mysqlNow = () => new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');
