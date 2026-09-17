// One-time import: backend/data/db.json (cache) -> MySQL primary.
// Usage: npm run db:import  (after db:migrate, with MySQL reachable)
// Upserts by id — safe to re-run.
import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { mysqlConfig } from '../server/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'db.json'), 'utf8'));

const conn = await mysql.createConnection({ ...mysqlConfig, multipleStatements: true });

// MySQL DATETIME needs 'YYYY-MM-DD HH:MM:SS' — cache stores ISO strings.
function toMySQLDatetime(v) {
  if (!v) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(v)) return v.slice(0, 19);
  const d = new Date(v);
  if (isNaN(d)) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  return d.toISOString().slice(0, 19).replace('T', ' ');
}
let counts = {};
try {
  for (const g of db.gardens || []) {
    await conn.query(
      `INSERT INTO gardens (id,titleEn,titleAr,titleTr,descriptionEn,descriptionAr,descriptionTr,category,priceEGP,priceTRY,rating,image)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE
       titleEn=VALUES(titleEn),titleAr=VALUES(titleAr),titleTr=VALUES(titleTr),
       descriptionEn=VALUES(descriptionEn),descriptionAr=VALUES(descriptionAr),descriptionTr=VALUES(descriptionTr),
       category=VALUES(category),priceEGP=VALUES(priceEGP),priceTRY=VALUES(priceTRY),rating=VALUES(rating),image=VALUES(image)`,
      [g.id, g.titleEn, g.titleAr, g.titleTr, g.descriptionEn, g.descriptionAr, g.descriptionTr, g.category, g.priceEGP, g.priceTRY, g.rating, g.image || '']);
  }
  counts.gardens = db.gardens?.length || 0;

  for (const s of db.seeds || []) {
    await conn.query(
      `INSERT INTO seeds (id,gardenId,titleEn,titleAr,titleTr,duration,videoUrl,status,section,sortOrder)
       VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE
       gardenId=VALUES(gardenId),titleEn=VALUES(titleEn),titleAr=VALUES(titleAr),titleTr=VALUES(titleTr),
       duration=VALUES(duration),videoUrl=VALUES(videoUrl),status=VALUES(status),section=VALUES(section),sortOrder=VALUES(sortOrder)`,
      [s.id, s.gardenId, s.titleEn, s.titleAr, s.titleTr, s.duration, s.videoUrl, s.status || 'bloomed', s.section || '', s.sortOrder ?? 0]);
    for (const tag of s.tags || []) {
      try { await conn.query('INSERT INTO seed_tags (seedId, tag) VALUES (?,?)', [s.id, String(tag).trim()]); } catch {}
    }
  }
  counts.seeds = db.seeds?.length || 0;

  for (const u of db.users || []) {
    await conn.query(
      `INSERT INTO users (id,email,phone,name,passwordHash,isVerified,verificationCode,createdAt,current_session_id,paidGardens)
       VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE email=VALUES(email),phone=VALUES(phone),name=VALUES(name),
       passwordHash=VALUES(passwordHash),isVerified=VALUES(isVerified),paidGardens=VALUES(paidGardens)`,
      [u.id, u.email, u.phone, u.name || null, u.passwordHash, u.isVerified ? 1 : 0, u.verificationCode || '',
       toMySQLDatetime(u.createdAt || u.createdat), u.current_session_id || null, JSON.stringify(u.paidGardens || [])]);
  }
  counts.users = db.users?.length || 0;

  for (const p of db.payments || []) {
    try {
      await conn.query(
        `INSERT INTO payments (id,userId,userEmail,gardenId,currency,amount,gateway,paymentMethod,screenshot,status,timestamp)
         VALUES (?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [p.id, p.userId, p.userEmail, p.gardenId, p.currency, p.amount, p.gateway, p.paymentMethod, p.screenshot || null, p.status, toMySQLDatetime(p.timestamp)]);
    } catch (e) { console.warn('[import] payment skipped:', p.id, e.message); }
  }
  counts.payments = db.payments?.length || 0;

  for (const q of db.quiz_questions || []) {
    try {
      await conn.query(
        `INSERT INTO quiz_questions (id,seedId,timestamp,questionEn,questionAr,questionTr,optionsEn,optionsAr,optionsTr,correctIndex)
         VALUES (?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE questionEn=VALUES(questionEn),correctIndex=VALUES(correctIndex)`,
        [q.id, q.seedId, q.timestamp || 0, q.questionEn, q.questionAr, q.questionTr,
         JSON.stringify(q.optionsEn), JSON.stringify(q.optionsAr), JSON.stringify(q.optionsTr), q.correctIndex ?? 0]);
    } catch (e) { console.warn('[import] quiz skipped:', q.id, e.message); }
  }
  counts.quiz = db.quiz_questions?.length || 0;

  console.log('[import] DONE:', JSON.stringify(counts));
} catch (e) {
  console.error('[import] FAILED:', e.message);
  process.exitCode = 1;
} finally {
  await conn.end();
}
