import { pool, readDB, writeDB, isPostgres } from '../server/db.js';
import { genId, mysqlNow, parseDurationToSeconds } from '../services/helpers.js';
import { sendOTPEmail } from '../services/email.service.js';

export async function saveGrowth(req, res) {
  try {
    const { sessionId, seedId, watchedSeconds } = req.body;
    if (!sessionId || !seedId) {
      return res.status(400).json({ error: 'Missing sync parameters.' });
    }

    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) {
      return res.status(403).json({ error: 'Invalid session/growth lock exception.' });
    }

    const growthSql = isPostgres
      ? `INSERT INTO student_growth (userId, seedId, watchedSeconds, lastUpdated) VALUES (?, ?, ?, NOW()) ON CONFLICT (userId, seedId) DO UPDATE SET watchedSeconds = EXCLUDED.watchedSeconds, lastUpdated = NOW()`
      : `INSERT INTO student_growth (userId, seedId, watchedSeconds, lastUpdated) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE watchedSeconds = ?, lastUpdated = NOW()`;
    const growthParams = isPostgres
      ? [user.id, seedId, watchedSeconds]
      : [user.id, seedId, watchedSeconds, watchedSeconds];
    await pool.query(growthSql, growthParams);

    const existingIdx = db.student_growth.findIndex(g => g.userId === user.id && g.seedId === seedId);
    if (existingIdx !== -1) {
      db.student_growth[existingIdx].watchedSeconds = watchedSeconds;
    } else {
      db.student_growth.push({ userId: user.id, seedId, watchedSeconds });
    }
    writeDB(db);

    return res.json({ success: true, message: 'Growth state metrics synchronized successfully.' });
  } catch (err) {
    return res.status(500).json({ error: 'Growth sync failed.' });
  }
}

export async function getGrowth(req, res) {
  const { sessionId, seedId } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.current_session_id === sessionId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const progress = db.student_growth.find(g => g.userId === user.id && g.seedId === seedId);
  return res.json({ watchedSeconds: progress ? progress.watchedSeconds : 0 });
}

export async function getGardenProgress(req, res) {
  try {
    const { sessionId, gardenId } = req.body;
    if (!sessionId || !gardenId) {
      return res.status(400).json({ error: 'Missing parameters.' });
    }
    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(403).json({ error: 'Invalid session.' });

    const seeds = db.seeds.filter(s => s.gardenId === gardenId);
    if (seeds.length === 0) {
      return res.json({
        completionPercent: 0,
        completedSeedsCount: 0,
        totalSeedsCount: 0,
        isGardenCompleted: false,
        isReportIssued: false,
        isOtpPending: false
      });
    }

    let completedCount = 0;
    const seedProgressDetails = [];

    for (const seed of seeds) {
      const progress = db.student_growth.find(g => g.userId === user.id && g.seedId === seed.id);
      const watched = progress ? progress.watchedSeconds : 0;
      const totalSec = parseDurationToSeconds(seed.duration);

      let isCompleted = totalSec > 0 ? (watched >= totalSec * 0.92) : (watched > 0);

      const seedQuizzes = (db.quiz_questions || []).filter(q => q.seedId === seed.id);
      if (seedQuizzes.length > 0) {
        const correctQuizAnswers = (db.quiz_answers || []).filter(a => a.userId === user.id && a.seedId === seed.id && a.isCorrect);
        const answeredAll = seedQuizzes.every(q => correctQuizAnswers.some(a => a.questionId === q.id));
        if (!answeredAll) {
          isCompleted = false;
        }
      }

      if (isCompleted) {
        completedCount++;
      }

      seedProgressDetails.push({
        seedId: seed.id,
        titleEn: seed.titleEn,
        titleAr: seed.titleAr,
        titleTr: seed.titleTr,
        watchedSeconds: watched,
        durationSeconds: totalSec,
        isCompleted
      });
    }

    const completionPercent = Math.round((completedCount / seeds.length) * 100);
    const isGardenCompleted = completionPercent === 100;

    const isReportIssued = db.emails.some(e => e.userId === user.id && e.isGrowthReport && e.gardenId === gardenId);
    const isOtpPending = db.otp_verifications.some(o => o.userId === user.id && o.gardenId === gardenId && !o.isUsed);

    return res.json({
      completionPercent,
      completedSeedsCount: completedCount,
      totalSeedsCount: seeds.length,
      isGardenCompleted,
      isReportIssued,
      isOtpPending,
      seedProgressDetails
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to calculate garden progress.' });
  }
}

export async function getNotebook(req, res) {
  try {
    const { seedId, email } = req.query;
    if (!seedId || !email) return res.status(400).json({ error: 'seedId and email required.' });
    const db = readDB();
    const key = `${seedId}:${email}`;
    const notes = db.notebooks?.[key] || [];
    return res.json({ success: true, notes });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load notes.' });
  }
}

export async function createNotebook(req, res) {
  try {
    const { seedId, email, note } = req.body;
    if (!seedId || !email || !note) return res.status(400).json({ error: 'All parameters required.' });
    const db = readDB();
    if (!db.notebooks) db.notebooks = {};
    const key = `${seedId}:${email}`;
    if (!db.notebooks[key]) db.notebooks[key] = [];
    db.notebooks[key].push(note);
    writeDB(db);
    return res.json({ success: true, notes: db.notebooks[key] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to save note.' });
  }
}

export async function deleteNotebook(req, res) {
  try {
    const { seedId, email, index } = req.body;
    if (index === undefined || !seedId || !email) return res.status(400).json({ error: 'All parameters required.' });
    const db = readDB();
    const key = `${seedId}:${email}`;
    if (db.notebooks?.[key]) {
      db.notebooks[key].splice(index, 1);
      writeDB(db);
    }
    return res.json({ success: true, notes: db.notebooks?.[key] || [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete note.' });
  }
}

export async function getQueries(req, res) {
  const { seedId, sessionId } = req.query;
  if (!seedId) {
    return res.status(400).json({ error: 'seedId is required.' });
  }
  const db = readDB();
  const filtered = db.queries.filter(q => q.seedId === seedId);
  return res.json({ success: true, queries: filtered });
}

export async function createQuery(req, res) {
  const { sessionId, seedId, text } = req.body;
  if (!sessionId || !seedId || !text) {
    return res.status(400).json({ error: 'All parameters required.' });
  }

  const db = readDB();
  const user = db.users.find(u => u.current_session_id === sessionId);
  if (!user) return res.status(403).json({ error: 'Invalid session.' });

  const queryId = 'q_' + genId();
  const studentName = user.email.split('@')[0];

  const newQuery = {
    id: queryId,
    seedId,
    studentName,
    studentEmail: user.email,
    avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`,
    question: text,
    text,
    createdTime: new Date().toISOString(),
    replies: []
  };

  db.queries.push(newQuery);
  writeDB(db);
  pool.query(
    'INSERT INTO queries (id, seedId, studentName, studentEmail, avatar, question, createdTime) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [newQuery.id, newQuery.seedId, newQuery.studentName, newQuery.studentEmail, newQuery.avatar, newQuery.question, newQuery.createdTime]
  ).catch(err => console.warn('[MySQL] Query insert failed:', err));

  return res.json({ success: true, query: newQuery });
}

export async function getEmails(req, res) {
  try {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
      return res.status(401).json({ error: 'Session ID is required.' });
    }
    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) {
      return res.status(403).json({ error: 'Invalid session.' });
    }
    const userEmails = db.emails.filter(e => e.userId === user.id);
    return res.json(userEmails);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch mock emails.' });
  }
}

export async function markEmailRead(req, res) {
  try {
    const { sessionId, emailId } = req.body;
    if (!sessionId || !emailId) {
      return res.status(400).json({ error: 'Missing parameters.' });
    }
    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(403).json({ error: 'Invalid session.' });

    const email = db.emails.find(e => e.id === emailId && e.userId === user.id);
    if (email) {
      email.isRead = true;
      pool.query('UPDATE emails SET isRead = ? WHERE id = ?', [true, emailId])
        .catch(err => console.warn('[MySQL] Email read update failed:', err));
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update email.' });
  }
}

export async function sendEmailMessage(req, res) {
  try {
    const { sessionId, subject, body } = req.body;
    if (!sessionId || !subject || !body) {
      return res.status(400).json({ error: 'Missing parameters.' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE current_session_id = ?', [sessionId]);
    const user = users && users.length > 0 ? users[0] : null;

    if (!user) return res.status(403).json({ error: 'Invalid session.' });

    const db = readDB();
    const emailId = 'em-sent-' + genId();
    db.emails.push({
      id: emailId,
      userId: user.id,
      toEmail: 'academic-registry@knowledge-garden.io',
      subject: subject,
      bodyEn: body,
      bodyAr: body,
      bodyTr: body,
      isRead: true,
      timestamp: new Date().toISOString(),
      isSentByUser: true
    });
    pool.query(
      'INSERT INTO emails (id, userId, toEmail, subject, bodyEn, bodyAr, bodyTr, otpCode, isRead, timestamp, isGrowthReport, isWelcome) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [emailId, user.id, 'academic-registry@knowledge-garden.io', subject, body, body, body, null, true, mysqlNow(), false, false]
    ).catch(err => console.warn('[MySQL] Email insert failed:', err));

    return res.json({ success: true, message: 'Message transmitted to Registry node.' });
  } catch (err) {
    return res.status(500).json({ error: 'Message transmission failure.' });
  }
}

export async function deleteEmail(req, res) {
  try {
    const { sessionId, emailId } = req.body;
    if (!sessionId || !emailId) return res.status(400).json({ error: 'Params missing.' });

    const [users] = await pool.query('SELECT * FROM users WHERE current_session_id = ?', [sessionId]);
    const user = users && users.length > 0 ? users[0] : null;
    if (!user) return res.status(403).json({ error: 'Unauthorized.' });

    const db = readDB();
    const initialCount = db.emails.length;
    db.emails = db.emails.filter(e => !(e.id === emailId && e.userId === user.id));

    if (db.emails.length !== initialCount) {
      pool.query('DELETE FROM emails WHERE id = ?', [emailId])
        .catch(err => console.warn('[MySQL] Email delete failed:', err));
    }

    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'De-rooting email failed.' });
  }
}

export async function requestOtp(req, res) {
  try {
    const { sessionId, gardenId } = req.body;
    if (!sessionId || !gardenId) {
      return res.status(400).json({ error: 'Missing parameters.' });
    }
    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(403).json({ error: 'Invalid session.' });

    const garden = db.gardens.find(g => g.id === gardenId);
    if (!garden) return res.status(404).json({ error: 'Garden not found.' });

    const seeds = db.seeds.filter(s => s.gardenId === gardenId);
    let completedCount = 0;
    for (const seed of seeds) {
      const progress = db.student_growth.find(g => g.userId === user.id && g.seedId === seed.id);
      const watched = progress ? progress.watchedSeconds : 0;
      const totalSec = parseDurationToSeconds(seed.duration);
      if (totalSec > 0 ? (watched >= totalSec * 0.92) : (watched > 0)) {
        completedCount++;
      }
    }

    if (seeds.length === 0 || completedCount < seeds.length) {
      return res.status(400).json({ error: 'All course modules must be completed to 100% progress.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    db.otp_verifications = db.otp_verifications.filter(o => !(o.userId === user.id && o.gardenId === gardenId));

    const otpId = 'otp_' + genId();
    const otpTimestamp = mysqlNow();
    db.otp_verifications.push({
      id: otpId,
      userId: user.id,
      gardenId,
      otpCode,
      isUsed: false,
      timestamp: new Date().toISOString()
    });
    pool.query(
      'DELETE FROM otp_verifications WHERE userId = ? AND gardenId = ?',
      [user.id, gardenId]
    ).then(() => {
      pool.query(
        'INSERT INTO otp_verifications (id, userId, gardenId, otpCode, isUsed, timestamp) VALUES (?, ?, ?, ?, ?, ?)',
        [otpId, user.id, gardenId, otpCode, false, otpTimestamp]
      ).catch(err => console.warn('[MySQL] OTP insert failed:', err));
    }).catch(err => console.warn('[MySQL] OTP delete failed:', err));

    const emailId = 'em-otp-' + genId();
    const subject = `Verification OTP: Unlock "${garden.titleEn}" Progress Report`;

    const bodyEn = `Dear Student,\n\nCongratulations on completing your training for "${garden.titleEn}"!\n\nTo finalize your records and receive your official "Progress Report & Certificate", your 6-digit verification code (OTP) has been generated:\n\n: ${otpCode}\n\nPlease copy this code and enter it in the verification panel.\n\nBest regards,\nMazen Academy Platform`;

    const bodyAr = `عزيزي الطالب،\n\nتهانينا على إكمال تدريبك في "${garden.titleAr}"!\n\nلإتمام تسجيلك واستلام "تقرير التقدم والشهادة" الرسمي، تم توليد رمز التحقق المكون من 6 أرقام (OTP):\n\n: ${otpCode}\n\nيرجى نسخ هذا الرمز وإدخاله في بوابة التحقق.\n\nمع أطيب التحيات،\nمنصة Mazen Academy`;

    const bodyTr = `Sevgili Öğrencimiz,\n\n"${garden.titleTr}" dersindeki eğitiminizi tamamladığınız için tebrik ederiz!\n\nKayıtlarınızı tamamlamak ve resmi "İlerleme Raporu & Sertifikanızı" almak için 6 haneli doğrulama kodunuz (OTP) oluşturulmuştur:\n\n: ${otpCode}\n\nLütfen bu kodu kopyalayıp doğrulama paneline giriniz.\n\nSaygılarımızla,\nMazen Academy Platformu`;

    db.emails.push({
      id: emailId,
      userId: user.id,
      toEmail: user.email,
      subject,
      bodyEn,
      bodyAr,
      bodyTr,
      otpCode,
      isRead: false,
      timestamp: new Date().toISOString(),
      isGrowthReport: false,
      gardenId
    });

    pool.query(
      'INSERT INTO emails (id, userId, toEmail, subject, bodyEn, bodyAr, bodyTr, otpCode, isRead, timestamp, isGrowthReport, isWelcome, gardenId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [emailId, user.id, user.email, subject, bodyEn, bodyAr, bodyTr, otpCode, false, mysqlNow(), false, false, gardenId]
    ).catch(err => console.warn('[MySQL] OTP email insert failed:', err));

    let smtpSent = false;
    let smtpMethodUsed = 'None (Mock Inbox Only)';
    try {
      const mailRes = await sendOTPEmail(user.email, otpCode, subject, bodyEn);
      if (mailRes.success) {
        smtpSent = true;
        smtpMethodUsed = `NodeMailer (Direct SMTP dispatch successful with message ID: ${mailRes.messageId})`;
      } else {
        smtpMethodUsed = `Mock Inbox Fallback (SMTP credentials unconfigured: ${mailRes.reason})`;
      }
    } catch (mailErr) {
      console.error('[REPORT SMTP ERR] safe SMTP trigger failed:', mailErr);
      smtpMethodUsed = `Mock Inbox Fallback (Exception: ${mailErr.message || mailErr})`;
    }

    return res.json({
      success: true,
      message: 'Security verification code has been dispatched.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to generate verification OTP code.' });
  }
}

export async function verifyOtp(req, res) {
  try {
    const { sessionId, gardenId, otpCode, lang = 'en' } = req.body;
    if (!sessionId || !gardenId || !otpCode) {
      return res.status(400).json({ error: 'Missing parameters.' });
    }
    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(403).json({ error: 'Invalid session.' });

    const garden = db.gardens.find(g => g.id === gardenId);
    if (!garden) return res.status(404).json({ error: 'Garden not found.' });

    const verification = db.otp_verifications.find(o =>
      o.userId === user.id &&
      o.gardenId === gardenId &&
      o.otpCode === otpCode &&
      !o.isUsed
    );

    if (!verification) {
      return res.status(400).json({ error: 'Invalid verification OTP code. Please trace it in your Inbox.' });
    }

    verification.isUsed = true;

    const seeds = db.seeds.filter(s => s.gardenId === gardenId);
    let totalDurationSeconds = 0;
    seeds.forEach(s => {
      totalDurationSeconds += parseDurationToSeconds(s.duration);
    });

    const studyMinutes = Math.floor(totalDurationSeconds / 60);
    const studyHours = (studyMinutes / 60).toFixed(1);

    const skillsAcquiredEn = 'Curriculum Skills & Distributed System Management';
    const skillsAcquiredAr = 'تحصيل المهارات البرمجية والتحكم في بنى الخدمات الموزعة';
    const skillsAcquiredTr = 'Müfredat Becerileri ve Dağıtık Sistem Yönetimi';

    const aiAdviceEn = 'We recommend continuous learning to ensure professional growth.';
    const aiAdviceAr = 'نوصي بمتابعة التعلم المستمر لضمان التطور.';
    const aiAdviceTr = 'Gelişimi sağlamak için sürekli öğrenmeye devam etmenizi öneriyoruz.';

    const certificateId = 'CERT_' + genId().toUpperCase();
    const verifiedDate = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const reportId = 'report_' + genId();

    const userName = user.name || user.email.split('@')[0];

    const emailSubject = `Official Progress Report & Certificate: ${garden.titleEn} Completed!`;

    const bodyEn = `Dear ${userName},\n\nWe are pleased to officially issue your "Progress Report & Certificate" for completing the course "${garden.titleEn}"! Your records are digitally signed and verified.\n\n=======================================================\n                   PROGRESS REPORT\n=======================================================\n- Completed Course: ${garden.titleEn}\n- Category: ${garden.category}\n- Total Modules Completed: ${seeds.length} of ${seeds.length}\n- Total Learning Time: ${studyHours} Hours [${studyMinutes} Minutes]\n- Skills Acquired:\n  ${skillsAcquiredEn}\n\nAI ASSESSMENT:\n${aiAdviceEn}\n\n=======================================================\n                CERTIFICATE OF COMPLETION\n=======================================================\nThis certifies that Student:\n  :  ${userName} \nhas successfully completed all modules in the\n  "${garden.titleEn}"\n\n- Certificate ID: ${certificateId}\n- Verification Date: ${new Date().toISOString()}\n- Status: SYSTEM VERIFIED\n\nWe congratulate you on your academic achievement on the Mazen Academy Platform! Thank you for learning with us.\n\nBest regards,\nMazen Academy Platform`;

    const bodyAr = `عزيزي ${userName}،\n\nيسعدنا أن نصدر لك رسمياً "تقرير التقدم والشهادة" لإتمامك دورة "${garden.titleAr}"! تم تسجيل مستنداتك الرقمية والتحقق منها.\n\n=======================================================\n                   تقرير التقدم\n=======================================================\n- الدورة المكتملة: ${garden.titleAr}\n- التخصص: ${garden.category}\n- إجمالي الوحدات المكتملة: ${seeds.length} من ${seeds.length}\n- الوقت الإجمالي للدراسة: ${studyHours} ساعة (${studyMinutes} دقيقة)\n- المهارات المكتسبة:\n  ${skillsAcquiredAr}\n\nتقييم الذكاء الاصطناعي:\n${aiAdviceAr}\n\n=======================================================\n                شهادة إتمام الدورة\n=======================================================\nتشهد هذه الشهادة أن الطالب:\n  :  ${userName} \nقد أكمل جميع الوحدات في\n  "${garden.titleAr}"\n\n- معرف الشهادة: ${certificateId}\n- تاريخ التحقق: ${new Date().toISOString()}\n- الحالة: تم التحقق من النظام\n\nنحتفل بإنجازك الأكاديمي على منصة Mazen Academy! شكراً لك على التعلم معنا.\n\nمع أطيب التحيات،\nمنصة Mazen Academy`;

    const bodyTr = `Sevgili ${userName},\n\n"${garden.titleTr}" dersini tamamladığınız için resmi "İlerleme Raporu & Sertifikanızı" düzenlemiş bulunuyoruz! Kayıtlarınız dijital olarak imzalanmış ve doğrulanmıştır.\n\n=======================================================\n                   İLERLEME RAPORU\n=======================================================\n- Tamamlanan Ders: ${garden.titleTr}\n- Branş: ${garden.category}\n- Tamamlanan Ünite Sayısı: ${seeds.length} / ${seeds.length}\n- Toplam Çalışma Süresi: ${studyHours} Saat (${studyMinutes} Dakika)\n- Kazanılan Nitelikler:\n  ${skillsAcquiredTr}\n\nAI DEĞERLENDİRMESİ:\n${aiAdviceTr}\n\n=======================================================\n                BAŞARI SERTİFİKASI\n=======================================================\nBu sertifika, öğrencimizin\n  :  ${userName} \n  "${garden.titleTr}"\ndersteki tüm üniteleri başarıyla tamamladığını tescil eder.\n\n- Sertifika Kimlik Kodu: ${certificateId}\n- Doğrulama Tarihi: ${new Date().toISOString()}\n- Durum: SİSTEM TARAFINDAN DOĞRULANDI\n\nMazen Academy Platformundaki akademik başarınızdan dolayı sizi tebrik ederiz! Bizimle öğrendiğiniz için teşekkür ederiz.\n\nSaygılarımızla,\nMazen Academy Platformu`;

    db.emails.push({
      id: reportId,
      userId: user.id,
      toEmail: user.email,
      subject: emailSubject,
      bodyEn,
      bodyAr,
      bodyTr,
      isRead: false,
      timestamp: new Date().toISOString(),
      isGrowthReport: true,
      gardenId
    });

    pool.query('UPDATE otp_verifications SET isUsed = ? WHERE id = ?', [true, verification.id])
      .catch(err => console.warn('[MySQL] OTP update failed:', err));
    pool.query(
      'INSERT INTO emails (id, userId, toEmail, subject, bodyEn, bodyAr, bodyTr, isRead, timestamp, isGrowthReport, isWelcome, gardenId) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [reportId, user.id, user.email, emailSubject, bodyEn, bodyAr, bodyTr, false, mysqlNow(), true, false, gardenId]
    ).catch(err => console.warn('[MySQL] Report email insert failed:', err));

    const reportPayload = {
      id: reportId,
      gardenId,
      gardenTitle: lang === 'ar' ? garden.titleAr : lang === 'tr' ? garden.titleTr : garden.titleEn,
      toEmail: user.email,
      userName,
      completedAt: verifiedDate,
      totalHours: studyHours,
      totalMinutes: studyMinutes,
      skillsAcquired: lang === 'ar' ? skillsAcquiredAr : lang === 'tr' ? skillsAcquiredTr : skillsAcquiredEn,
      aiAdvice: lang === 'ar' ? aiAdviceAr : lang === 'tr' ? aiAdviceTr : aiAdviceEn,
      certificateId,
      body: lang === 'ar' ? bodyAr : lang === 'tr' ? bodyTr : bodyEn
    };

    return res.json({
      success: true,
      message: 'Your custom summary Growth Report has been compiled and emailed.',
      report: reportPayload
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to verify verification code.' });
  }
}
