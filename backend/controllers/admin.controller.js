import fs from 'fs';
import path from 'path';
import { pool, readDB, writeDB, upsertQuery, jsonArrayAppendSQL, jsonRemoveValueSQL, jsonContainsSQL, isPostgres, castBoolean } from '../server/db.js';
import { genId, mysqlNow, logAdminAction } from '../services/helpers.js';
import { sendOTPEmail, sendEmail } from '../services/email.service.js';
import { adminTokens } from '../middleware/auth.js';
import { ADMIN_USER, ADMIN_PASS } from '../config/index.js';

export function login(req, res) {
  const { username, password } = req.body;
  const adminUser = ADMIN_USER;
  const adminPass = ADMIN_PASS;
  if (username !== adminUser || password !== adminPass) {
    return res.status(401).json({ error: 'Invalid admin credentials.' });
  }
  const token = 'adm_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  adminTokens.set(token, Date.now());
  setTimeout(() => adminTokens.delete(token), 24 * 60 * 60 * 1000);
  return res.json({ success: true, token });
}

export function getUsers(req, res) {
  const db = readDB();
  return res.json(db.users);
}

export function togglePaid(req, res) {
  const { userId, paidGardens } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.id === userId);
  if (user) {
    user.paidGardens = paidGardens || [];
    writeDB(db);
    pool.query('UPDATE users SET paidGardens = ? WHERE id = ?', [JSON.stringify(paidGardens || []), userId]).catch(() => {});
    logAdminAction('USER_ACCESS_TOGGLE', { userId, paidGardens });
    return res.json({ success: true });
  }
  return res.status(404).json({ error: 'User not found' });
}

export function getPayments(req, res) {
  const db = readDB();
  return res.json(db.payments);
}

export async function approvePayment(req, res) {
  try {
    const { transactionId } = req.body;
    const db = readDB();

    let payment = db.payments.find(p => p.id === transactionId);
    try {
      const [sqlPayments] = await pool.query('SELECT * FROM payments WHERE id = ?', [transactionId]);
      if (sqlPayments && sqlPayments.length > 0) payment = sqlPayments[0];
    } catch {}

    if (!payment) return res.status(404).json({ error: 'Payment record not found' });
    if (payment.status === 'rejected') return res.status(400).json({ error: 'Cannot approve a rejected payment' });
    if (payment.status === 'approved') return res.status(400).json({ error: 'Already approved' });

    const userId = payment.userId;
    const gardenId = payment.gardenId;

    pool.query('UPDATE payments SET status = ? WHERE id = ?', ['approved', transactionId]).catch(() => {});
    const jsonPayment = db.payments.find(p => p.id === transactionId);
    if (jsonPayment) jsonPayment.status = 'approved';

    const paidGardensAppend = `UPDATE users SET ${jsonArrayAppendSQL('paidGardens', '?')} WHERE id = ? AND NOT ${jsonContainsSQL('paidGardens', '?')}`;
    pool.query(paidGardensAppend, [gardenId, userId, JSON.stringify(gardenId)]).catch(() => {});
    const user = db.users.find(u => u.id === userId);
    if (user) {
      if (!user.paidGardens) user.paidGardens = [];
      if (!user.paidGardens.includes(gardenId)) {
        user.paidGardens.push(gardenId);
      }
    }

    if (userId) {
      const userEmail = user ? user.email : payment.userEmail;
      const garden = db.gardens.find(g => g.id === payment.gardenId);
      const gNameEn = garden ? garden.titleEn : 'Garden';
      const gNameAr = garden ? garden.titleAr : 'الحديقة';
      const gNameTr = garden ? garden.titleTr : 'Bahçe';

      db.emails.push({
        id: 'em-pay-ok-' + genId(),
        userId: userId,
        toEmail: userEmail,
        subject: 'Payment Approved! Access Granted',
        bodyEn: `Your payment for "${gNameEn}" has been verified. Full classroom access is now unlocked!`,
        bodyAr: `تم توثيق دفعتك لـ "${gNameAr}". تم فتح الوصول الكامل لقاعة الدراسة الآن!`,
        bodyTr: `"${gNameTr}" ödemeniz doğrulandı. Sınıf erişimi artık tamamen açıldı!`,
        isRead: false,
        timestamp: new Date().toISOString(),
        isGrowthReport: false,
        isWelcome: false
      });

      sendEmail(userEmail, 'Payment Approved! Access Granted',
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid rgba(168,85,247,0.2);border-radius:20px;background-color:#0c101d;color:#f3f4f6;">
          <h1 style="color:#c084fc;text-align:center;">Mazen Academy</h1>
          <p style="font-size:15px;color:#e5e7eb;">Dear Student,</p>
          <p style="font-size:14px;color:#9ca3af;">Your payment for <strong>"${gNameEn}"</strong> has been verified. Full course access is now unlocked!</p>
          <p style="font-size:10px;text-align:center;color:#6b7280;margin-top:35px;">This is an automated message from the Mazen Academy Platform.</p>
        </div>`
      );
    }

    writeDB(db);
    logAdminAction('PAYMENT_APPROVE', { transactionId, userId, gardenId });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal approval logic error.' });
  }
}

export async function rejectPayment(req, res) {
  try {
    const { transactionId, reason } = req.body;
    if (!transactionId || !reason) {
      return res.status(400).json({ error: 'Transaction ID and reason are required.' });
    }

    const db = readDB();

    let payment = db.payments.find(p => p.id === transactionId);
    try {
      const [sqlPayments] = await pool.query('SELECT * FROM payments WHERE id = ?', [transactionId]);
      if (sqlPayments && sqlPayments.length > 0) payment = sqlPayments[0];
    } catch {}

    if (!payment) return res.status(404).json({ error: 'Payment record not found' });
    if (payment.status === 'approved') return res.status(400).json({ error: 'Cannot reject an already approved payment' });
    if (payment.status === 'rejected') return res.status(400).json({ error: 'Payment is already rejected' });

    const userId = payment.userId;

    pool.query('UPDATE payments SET status = ? WHERE id = ?', ['rejected', transactionId]).catch(() => {});
    const paidGardensRemove = `UPDATE users SET ${jsonRemoveValueSQL('paidGardens', '?')} WHERE id = ? AND ${jsonContainsSQL('paidGardens', '?')}`;
    pool.query(paidGardensRemove, [payment.gardenId, userId, JSON.stringify(payment.gardenId)]).catch(() => {});
    const jsonPayment = db.payments.find(p => p.id === transactionId);
    if (jsonPayment) jsonPayment.status = 'rejected';
    const jsonUser = db.users.find(u => u.id === userId);
    if (jsonUser && jsonUser.paidGardens) {
      jsonUser.paidGardens = jsonUser.paidGardens.filter(g => g !== payment.gardenId);
    }

    if (userId) {
      const garden = db.gardens.find(g => g.id === payment.gardenId);
      const gNameEn = garden ? garden.titleEn : 'Garden';
      const gNameAr = garden ? garden.titleAr : 'الحديقة';
      const gNameTr = garden ? garden.titleTr : 'Bahçe';

      let userEmail = payment.userEmail;
      try {
        const [rows] = await pool.query('SELECT email FROM users WHERE id = ?', [userId]);
        if (rows && rows.length > 0) userEmail = rows[0].email;
      } catch {}

      db.emails.push({
        id: 'em-pay-fail-' + genId(),
        userId: userId,
        toEmail: userEmail,
        subject: 'Payment Rejected - Action Required',
        bodyEn: `Your payment for "${gNameEn}" was rejected. Reason: ${reason}. Please verify your transfer details or contact support.`,
        bodyAr: `تم رفض دفعتك لـ "${gNameAr}". السبب: ${reason}. يرجى التحقق من تفاصيل التحويل أو التواصل مع الدعم.`,
        bodyTr: `"${gNameTr}" ödemeniz reddedildi. Sebep: ${reason}. Lütfen transfer detaylarını kontrol edin veya destekle iletişime geçin.`,
        isRead: false,
        timestamp: new Date().toISOString(),
        isGrowthReport: false,
        isWelcome: false
      });

      sendEmail(userEmail, 'Payment Rejected - Action Required',
        `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:30px;border:1px solid rgba(168,85,247,0.2);border-radius:20px;background-color:#0c101d;color:#f3f4f6;">
          <h1 style="color:#c084fc;text-align:center;">Mazen Academy</h1>
          <p style="font-size:15px;color:#e5e7eb;">Dear Student,</p>
          <p style="font-size:14px;color:#9ca3af;">Your payment for <strong>"${gNameEn}"</strong> was rejected.</p>
          <p style="font-size:14px;color:#ef4444;">Reason: ${reason}</p>
          <p style="font-size:13px;color:#9ca3af;">Please verify your transfer details or contact support.</p>
          <p style="font-size:10px;text-align:center;color:#6b7280;margin-top:35px;">This is an automated message from the Mazen Academy Platform.</p>
        </div>`
      );
    }

    writeDB(db);
    logAdminAction('PAYMENT_REJECT', { transactionId, userId, reason });
    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Rejection system failure.' });
  }
}

export function getAnalytics(req, res) {
  const db = readDB();

  const approvedPayments = db.payments.filter(p => p.status === 'approved');
  let totalEGP = 0;
  let totalTRY = 0;

  approvedPayments.forEach(p => {
    if (p.currency === 'EGP') {
      totalEGP += p.amount;
    } else {
      totalTRY += p.amount;
    }
  });

  const activeConcurrentUsers = db.users.filter(u => u.current_session_id && u.current_session_id !== '').length;

  return res.json({
    success: true,
    totalEGP,
    totalTRY,
    totalUsers: db.users.length,
    activeConcurrentUsers,
    totalPayments: approvedPayments.length
  });
}

export function cmsGardens(req, res) {
  const { id, titleEn, titleAr, titleTr, descriptionEn, descriptionAr, descriptionTr, category, priceEGP, priceTRY, image } = req.body;

  const db = readDB();
  if (id) {
    const idx = db.gardens.findIndex(g => g.id === id);
    if (idx !== -1) {
      db.gardens[idx] = {
        ...db.gardens[idx],
        titleEn, titleAr, titleTr,
        descriptionEn, descriptionAr, descriptionTr,
        category,
        priceEGP: Number(priceEGP),
        priceTRY: Number(priceTRY),
        image: image || db.gardens[idx].image
      };
    }
  } else {
    const newG = {
      id: 'g_' + genId(),
      titleEn, titleAr, titleTr,
      descriptionEn, descriptionAr, descriptionTr,
      category,
      priceEGP: Number(priceEGP || 1000),
      priceTRY: Number(priceTRY || 500),
      rating: 5.0,
      image: image || ''
    };
    db.gardens.push(newG);
  }

  const gardenData = id
    ? db.gardens.find(g => g.id === id)
    : db.gardens[db.gardens.length - 1];
  if (gardenData) {
    const gId = gardenData.id;
    const gardenColumns = ['id', 'titleEn', 'titleAr', 'titleTr', 'descriptionEn', 'descriptionAr', 'descriptionTr', 'category', 'priceEGP', 'priceTRY', 'rating', 'image'];
    pool.query(
      upsertQuery('gardens', gardenColumns, ['id']),
      [gId, titleEn, titleAr, titleTr, descriptionEn, descriptionAr, descriptionTr, category, Number(priceEGP), Number(priceTRY), 5.0, image || '']
    ).catch(err => console.warn('[MySQL] Garden upsert failed:', err));
  }
  logAdminAction('CMS_GARDEN_UPDATE', { id, titleEn, category });
  return res.json({ success: true });
}

export function cmsSeeds(req, res) {
  const { id, gardenId, titleEn, titleAr, titleTr, duration, videoUrl, tags, section, sortOrder } = req.body;

  let finalTags;
  if (tags) {
    if (Array.isArray(tags)) {
      finalTags = tags.map(t => t.trim()).filter(Boolean);
    } else if (typeof tags === 'string') {
      finalTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    }
  }

  const db = readDB();
  if (id) {
    const idx = db.seeds.findIndex(s => s.id === id);
    if (idx !== -1) {
      db.seeds[idx] = {
        ...db.seeds[idx],
        gardenId,
        titleEn, titleAr, titleTr,
        duration,
        videoUrl,
        section: section || '',
        sortOrder: sortOrder ?? 0,
        tags: finalTags
      };
    }
  } else {
    const newS = {
      id: 's_' + genId(),
      gardenId,
      titleEn, titleAr, titleTr,
      duration: duration || '30:00',
      videoUrl: videoUrl || 'bunny_mock_default',
      section: section || '',
      sortOrder: sortOrder ?? 0,
      status: 'bloomed',
      tags: finalTags
    };
    db.seeds.push(newS);
  }

  const seedData = id ? db.seeds.find(s => s.id === id) : db.seeds[db.seeds.length - 1];
  if (seedData) {
    const sId = seedData.id;
    const seedColumns = ['id', 'gardenId', 'titleEn', 'titleAr', 'titleTr', 'duration', 'videoUrl', 'status', 'section', 'sortOrder'];
    pool.query(
      upsertQuery('seeds', seedColumns, ['id']),
      [sId, gardenId, titleEn, titleAr, titleTr, duration, videoUrl || 'bunny_mock_default', 'bloomed', section || '', sortOrder ?? 0]
    ).catch(err => console.warn('[MySQL] Seed upsert failed:', err));
    if (finalTags) {
      pool.query('DELETE FROM seed_tags WHERE seedId = ?', [sId]).catch(() => {});
      for (const tag of finalTags) {
        pool.query('INSERT INTO seed_tags (seedId, tag) VALUES (?, ?)', [sId, tag]).catch(() => {});
      }
    }
  }
  logAdminAction('CMS_SEED_UPDATE', { id, gardenId, titleEn });
  return res.json({ success: true });
}

export function cmsSeedsBulk(req, res) {
  const { gardenId, seedsList } = req.body;
  if (!gardenId) {
    return res.status(400).json({ error: 'gardenId is required' });
  }
  if (!Array.isArray(seedsList)) {
    return res.status(400).json({ error: 'seedsList must be an array' });
  }

  const db = readDB();
  const createdSeeds = [];

  for (const item of seedsList.slice(0, 50)) {
    const { titleEn, titleAr, titleTr, duration, videoUrl, tags, section, sortOrder } = item;

    let finalTags;
    if (tags) {
      if (Array.isArray(tags)) {
        finalTags = tags.map(t => t.trim()).filter(Boolean);
      } else if (typeof tags === 'string') {
        finalTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      }
    }

    const newS = {
      id: 's_' + genId(),
      gardenId,
      titleEn: titleEn || 'Untitled Lecture',
      titleAr: titleAr || titleEn || 'درس غير معنون',
      titleTr: titleTr || titleEn || 'Başlıksız Ders',
      duration: duration || '15:20',
      videoUrl: videoUrl || 'bunny_mock_uploaded',
      section: section || '',
      sortOrder: sortOrder ?? 0,
      status: 'bloomed',
      tags: finalTags
    };

    db.seeds.push(newS);
    createdSeeds.push(newS);
  }

  for (const seed of createdSeeds) {
    pool.query(
      'INSERT INTO seeds (id, gardenId, titleEn, titleAr, titleTr, duration, videoUrl, status, section, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [seed.id, gardenId, seed.titleEn, seed.titleAr, seed.titleTr, seed.duration, seed.videoUrl, 'bloomed', seed.section, seed.sortOrder]
    ).catch(err => console.warn('[MySQL] Bulk seed insert failed:', err));
    if (seed.tags) {
      for (const tag of seed.tags) {
        pool.query('INSERT INTO seed_tags (seedId, tag) VALUES (?, ?)', [seed.id, tag]).catch(() => {});
      }
    }
  }
  logAdminAction('CMS_SEED_BULK_UPLOAD', { gardenId, count: createdSeeds.length });
  return res.json({ success: true, count: createdSeeds.length });
}

export function cmsDelete(req, res) {
  const { type, id } = req.body;
  const db = readDB();

  if (type === 'garden') {
    db.gardens = db.gardens.filter(g => g.id !== id);
    db.seeds = db.seeds.filter(s => s.gardenId !== id);
  } else {
    db.seeds = db.seeds.filter(s => s.id !== id);
  }

  if (type === 'garden') {
    pool.query('DELETE FROM seeds WHERE gardenId = ?', [id]).catch(() => {});
    pool.query('DELETE FROM gardens WHERE id = ?', [id]).catch(() => {});
  } else {
    pool.query('DELETE FROM seeds WHERE id = ?', [id]).catch(() => {});
  }
  logAdminAction('CMS_ENTITY_DELETE', { type, id });
  return res.json({ success: true });
}

export function getSmtpStatus(req, res) {
  return res.json({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    from: process.env.SMTP_FROM,
    isConfigured: !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS)
  });
}

export async function sendTestEmail(req, res) {
  try {
    const { testEmail } = req.body;
    if (!testEmail) {
      return res.status(400).json({ error: 'Test recipient email is required.' });
    }

    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const testSubject = "Mazen Academy SMTP Test - Configuration Verified";
    const testBody = "Hello Admin!\n\nThis is a system delivery diagnostics message dispatched to test the SMTP pipeline. If you are reading this email, your configuration is 100% correct and ready for production OTP dispatch!";

    const result = await sendOTPEmail(testEmail, testOtp, testSubject, testBody);
    if (result.success) {
      return res.json({ success: true, messageId: result.messageId });
    } else {
      return res.status(500).json({ error: result.message || 'SMTP delivery failed. Check credentials.' });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message || 'Nodemailer test crash' });
  }
}

export function answerQuery(req, res) {
  const { queryId, text } = req.body;
  if (!queryId || !text) {
    return res.status(400).json({ error: 'Params required.' });
  }

  const db = readDB();
  const query = db.queries.find(q => q.id === queryId);
  if (!query) {
    return res.status(404).json({ error: 'Query thread not found.' });
  }

  query.replies.push({
    author: 'System Admin',
    text,
    timestamp: new Date().toISOString()
  });

  const replyId = 'r_' + genId();
  const replyTimestamp = mysqlNow();
  pool.query(
    'INSERT INTO query_replies (id, queryId, author, text, timestamp) VALUES (?, ?, ?, ?, ?)',
    [replyId, queryId, 'System Admin', text, replyTimestamp]
  ).catch(err => console.warn('[MySQL] Reply insert failed:', err));
  logAdminAction('QUERY_ANSWERED', { queryId });
  return res.json({ success: true, query });
}

export function getAdminQueries(req, res) {
  const db = readDB();
  return res.json(db.queries);
}

export function getAuditLogs(req, res) {
  const logFile = path.join(process.cwd(), 'logs', 'admin_audit.log');
  fs.readFile(logFile, 'utf-8', (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        return res.status(200).json({ logs: '', message: 'No audit logs found yet.' });
      }
      console.error('[AUDIT LOG] Failed to read admin_audit.log:', err);
      return res.status(500).json({ error: 'Failed to read audit logs.' });
    }
    return res.json({ logs: data });
  });
}

export async function getQuizDegrees(req, res) {
  try {
    const db = readDB();
    const answers = db.quiz_answers || [];
    const questions = db.quiz_questions || [];

    const userMap = new Map();
    answers.forEach(a => {
      const key = a.userId;
      if (!userMap.has(key)) {
        userMap.set(key, { email: a.userEmail || '', name: a.userName || '', total: 0, correct: 0, wrong: 0, answers: [] });
      }
      const entry = userMap.get(key);
      entry.total++;
      if (a.isCorrect) entry.correct++;
      else entry.wrong++;
      entry.answers.push(a);
    });

    const degrees = [];
    userMap.forEach((val, userId) => {
      const rate = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
      degrees.push({
        userId,
        email: val.email,
        name: val.name,
        totalAnswered: val.total,
        correct: val.correct,
        wrong: val.wrong,
        rate
      });
    });

    try {
      const [rows] = await pool.query('SELECT * FROM quiz_answers');
      const mysqlMap = new Map();
      rows.forEach(r => {
        const key = r.userId;
        if (!mysqlMap.has(key)) {
          mysqlMap.set(key, { email: r.userEmail || '', name: r.userName || '', total: 0, correct: 0, wrong: 0 });
        }
        const entry = mysqlMap.get(key);
        entry.total++;
        if (r.isCorrect) entry.correct++;
        else entry.wrong++;
      });
      mysqlMap.forEach((val, userId) => {
        const existing = degrees.find(d => d.userId === userId);
        if (!existing) {
          const rate = val.total > 0 ? Math.round((val.correct / val.total) * 100) : 0;
          degrees.push({ userId, email: val.email, name: val.name, totalAnswered: val.total, correct: val.correct, wrong: val.wrong, rate });
        }
      });
    } catch {}

    degrees.sort((a, b) => b.rate - a.rate || b.totalAnswered - a.totalAnswered);
    return res.json(degrees);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load quiz degrees' });
  }
}

export function saveQuizQuestion(req, res) {
  try {
    const { id, seedId, timestamp, questionEn, questionAr, questionTr, optionsEn, optionsAr, optionsTr, correctIndex } = req.body;
    if (!seedId || timestamp === undefined || !questionEn) {
      return res.status(400).json({ error: 'Seed ID, timestamp, and English question are required.' });
    }

    const db = readDB();
    const qId = id || 'qq_' + genId();
    const questionData = {
      id: qId,
      seedId,
      timestamp: Number(timestamp),
      questionEn,
      questionAr: questionAr || questionEn,
      questionTr: questionTr || questionEn,
      optionsEn: Array.isArray(optionsEn) ? optionsEn : [''],
      optionsAr: Array.isArray(optionsAr) ? optionsAr : [''],
      optionsTr: Array.isArray(optionsTr) ? optionsTr : [''],
      correctIndex: Number(correctIndex !== undefined ? correctIndex : 0)
    };

    if (id) {
      const idx = db.quiz_questions.findIndex(q => q.id === id);
      if (idx !== -1) {
        db.quiz_questions[idx] = questionData;
      } else {
        db.quiz_questions.push(questionData);
      }
    } else {
      db.quiz_questions.push(questionData);
    }

    writeDB(db);

    const qqColumns = ['id', 'seedId', 'timestamp', 'questionEn', 'questionAr', 'questionTr', 'optionsEn', 'optionsAr', 'optionsTr', 'correctIndex'];
    pool.query(
      upsertQuery('quiz_questions', qqColumns, ['id']),
      [qId, seedId, questionData.timestamp, questionEn, questionData.questionAr, questionData.questionTr,
       JSON.stringify(questionData.optionsEn), JSON.stringify(questionData.optionsAr), JSON.stringify(questionData.optionsTr),
       questionData.correctIndex]
    ).catch(err => console.warn('[MySQL] Quiz question sync failed:', err));

    logAdminAction('QUIZ_QUESTION_UPDATE', { id: questionData.id, seedId });
    return res.json({ success: true, question: questionData });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save quiz question' });
  }
}

export function deleteQuizQuestion(req, res) {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID required' });

    const db = readDB();
    db.quiz_questions = db.quiz_questions.filter(q => q.id !== id);
    db.quiz_answers = db.quiz_answers.filter(a => a.questionId !== id);
    writeDB(db);

    pool.query('DELETE FROM quiz_answers WHERE questionId = ?', [id]).catch(() => {});
    pool.query('DELETE FROM quiz_questions WHERE id = ?', [id]).catch(() => {});

    logAdminAction('QUIZ_QUESTION_DELETE', { id });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete quiz question' });
  }
}
