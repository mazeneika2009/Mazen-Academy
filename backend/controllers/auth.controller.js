import { pool, readDB, writeDB } from '../server/db.js';
import { genId, mysqlNow } from '../services/helpers.js';
import { sendOTPEmail } from '../services/email.service.js';

export async function register(req, res) {
  try {
    const { email, phone, password, name } = req.body;
    if (!email || !phone || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const [existingUsers] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email address.' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const userId = 'u_' + genId();
    const createdAt = new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

    try {
      await pool.query(
        'INSERT INTO users (id, email, phone, name, passwordHash, isVerified, verificationCode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, email, phone, name || '', password, false, otpCode, createdAt]
      );
    } catch (sqlErr) {
      console.warn('[AUTH] MySQL insert failed, falling back to JSON db only:', sqlErr);
    }

    try {
      const db = readDB();
      db.users.push({
        id: userId,
        email,
        phone,
        name: name || '',
        passwordHash: password,
        isVerified: false,
        verificationCode: otpCode,
        current_session_id: '',
        paidGardens: [],
        createdAt: createdAt
      });
      writeDB(db);
    } catch (dbErr) {
      console.error('[AUTH] Failed to write user to JSON db:', dbErr);
    }

    console.log(`[AUTH] Registered user ${email} with OTP: ${otpCode}`);

    try {
      const db = readDB();
      const welcomeEmailId = 'em-welcome-' + genId();
      db.emails.push({
        id: welcomeEmailId,
        userId: userId,
        toEmail: email,
        subject: 'Welcome to Mazen Academy!',
        bodyEn: 'Welcome! Your account is now active. This is your secure inbox where you will receive OTP codes, reports, and system notifications. You can also submit questions to the support team from here.',
        bodyAr: 'مرحباً بك! تم تفعيل حسابك بنجاح. هذا هو صندوق الوارد الآمن الخاص بك حيث ستتلقى أكواد التحقق، التقارير، وتنبيهات النظام. يمكنك أيضاً إرسال استفساراتك إلى فريق الدعم من هنا.',
        bodyTr: 'Hoş geldiniz! Hesabınız artık aktif. Bu, OTP kodlarını, raporları ve sistem bildirimlerini alacağınız güvenli gelen kutunuzdur. Ayrıca buradan destek ekibine mesaj gönderebilirsiniz.',
        isRead: false,
        timestamp: new Date().toISOString(),
        isGrowthReport: false,
        isWelcome: true
      });
      writeDB(db);
    } catch (dbErr) {
      console.error('[AUTH DB ERR] Failed to create welcome email:', dbErr);
    }

    let smtpSent = false;
    let smtpMethodUsed = 'None (Sandbox Code Only)';
    try {
      const mailSubject = "Verify Your Mazen Academy Account";
      const mailBody = `Welcome to Mazen Academy!\n\nTo complete registration and verify your account, please use the following 6-digit verification code (OTP):\n\n: ${otpCode}\n\nEnjoy your learning journey!`;

      const mailRes = await sendOTPEmail(email, otpCode, mailSubject, mailBody);
      if (mailRes.success) {
        smtpSent = true;
        smtpMethodUsed = `NodeMailer (Direct SMTP dispatch successful with message ID: ${mailRes.messageId})`;
      } else {
        smtpMethodUsed = `Fallback Sandbox (Credentials unconfigured: ${mailRes.reason})`;
      }
    } catch (mailErr) {
      console.error('[AUTH SMTP ERR] registration safe SMTP trigger failed:', mailErr);
      smtpMethodUsed = `Fallback Sandbox (Exception occurred: ${mailErr.message || mailErr})`;
    }

    return res.json({
      success: true,
      userId,
      email,
      message: 'Registration successful! Please verify your account to continue.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Database error occurred.' });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'No account found with this email.' });
    }

    const user = users[0];
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query('UPDATE users SET verificationCode = ?, isVerified = ? WHERE id = ?', [
      otpCode, false, user.id
    ]);

    const mailSubject = "Reset Your Mazen Academy Password";
    const mailBody = `A password reset has been requested.\n\nYour 6-digit reset code (OTP) is:\n\n: ${otpCode}\n\nPlease enter this code to verify your identity.`;

    await sendOTPEmail(email, otpCode, mailSubject, mailBody);

    return res.json({
      success: true,
      userId: user.id,
      message: 'Reset key dispatched to your email.'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Reset system node failure.' });
  }
}

export async function resendCode(req, res) {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'User ID is required.' });

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Account not found.' });
    }

    const user = users[0];
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query('UPDATE users SET verificationCode = ? WHERE id = ?', [code, userId]);

    const mailSubject = "Re-issued Synchronization Code";
    const mailBody = `Your new 6-digit synchronization passcode (OTP) is:\n\n: ${code}`;
    await sendOTPEmail(user.email, code, mailSubject, mailBody);

    return res.json({ success: true, message: 'New code dispatched.' });
  } catch (err) {
    return res.status(500).json({ error: 'Resend system failure.' });
  }
}

export async function verify(req, res) {
  try {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ error: 'User ID and verification code are required.' });
    }

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const user = users[0];

    const storedCode = String(user.verificationCode || '').trim();
    const providedCode = String(code || '').trim();

    if (storedCode !== providedCode) {
      return res.status(400).json({ error: 'Invalid synchronization code. Please try again.' });
    }

    await pool.query('UPDATE users SET isVerified = ?, verificationCode = ? WHERE id = ?', [
      true, '', userId
    ]);

    const newSessionId = 'session_' + genId();
    await pool.query('UPDATE users SET current_session_id = ? WHERE id = ?', [newSessionId, userId]);

    return res.json({
      success: true,
      sessionId: newSessionId,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        isVerified: true,
        paidGardens: user.paidGardens || [],
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Verification failed.' });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and Password are required.' });
    }

    const db = readDB();

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users || users.length === 0) {
      const found = db.users.find(u => u.phone === email && u.passwordHash === password);
      if (!found) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
      users.push(found);
    }

    const user = users[0];
    if (user.passwordHash !== password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const newSessionId = 'session_' + genId();

    await pool.query('UPDATE users SET current_session_id = ? WHERE id = ?', [newSessionId, user.id]);

    let dbUser = db.users.find(u => u.id === user.id);
    if (!dbUser) {
      db.users.push({
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name || '',
        passwordHash: user.passwordHash,
        isVerified: user.isVerified,
        verificationCode: user.verificationCode || '',
        current_session_id: newSessionId,
        paidGardens: typeof user.paidGardens === 'string' ? JSON.parse(user.paidGardens) : (user.paidGardens || []),
        createdAt: typeof user.createdAt === 'string' ? user.createdAt : new Date().toISOString()
      });
    } else {
      dbUser.current_session_id = newSessionId;
    }
    writeDB(db);

    if (!user.isVerified) {
      let code = user.verificationCode;
      if (!code || code === '') {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        await pool.query('UPDATE users SET verificationCode = ? WHERE id = ?', [code, user.id]);
      }

      const mailSubject = "Synchronization Code: Mazen Academy Access";
      const mailBody = `To access your gardener node, please apply your 6-digit synchronization passcode (OTP):\n\n: ${code}`;
      await sendOTPEmail(user.email, code, mailSubject, mailBody);

      return res.json({
        success: false,
        requiresVerification: true,
        userId: user.id,
        message: 'Account not verified. Verification code has been sent.'
      });
    }

    const [sqlPending] = await pool.query('SELECT gardenId FROM payments WHERE userId = ? AND status = "pending"', [user.id]);
    const sqlPendingIds = sqlPending.map(r => r.gardenId);
    const jsonPendingIds = db.payments.filter(p => p.userId === user.id && p.status === 'pending').map(p => p.gardenId);

    const pendingGardens = Array.from(new Set([...sqlPendingIds, ...jsonPendingIds]));

    return res.json({
      success: true,
      sessionId: newSessionId,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name || '',
        isVerified: true,
        paidGardens: typeof user.paidGardens === 'string' ? JSON.parse(user.paidGardens) : (user.paidGardens || []),
        pendingGardens,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server login error.' });
  }
}

export async function session(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(401).json({ error: 'No active session.' });
    }

    const db = readDB();

    const [users] = await pool.query('SELECT * FROM users WHERE current_session_id = ?', [sessionId]);
    let user = users && users.length > 0 ? users[0] : null;

    if (!user) {
      user = db.users.find(u => u.current_session_id === sessionId);
    }

    if (!user) {
      return res.status(401).json({ error: 'Session expired.' });
    }

    const [sqlPending] = await pool.query('SELECT gardenId FROM payments WHERE userId = ? AND status = "pending"', [user.id]);
    const sqlPendingIds = sqlPending.map(r => r.gardenId);
    const jsonPendingIds = db.payments.filter(p => p.userId === user.id && p.status === 'pending').map(p => p.gardenId);

    const pendingGardens = Array.from(new Set([...sqlPendingIds, ...jsonPendingIds]));

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name || '',
        isVerified: user.isVerified,
        paidGardens: typeof user.paidGardens === 'string' ? JSON.parse(user.paidGardens) : (user.paidGardens || []),
        pendingGardens,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Session validation error.' });
  }
}

export async function deleteAccount(req, res) {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(401).json({ error: 'No active session.' });

    const db = readDB();
    const user = db.users.find(u => u.current_session_id === sessionId);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    const userId = user.id;

    try {
      await pool.query('DELETE FROM users WHERE id = ?', [userId]);
      await pool.query('DELETE FROM emails WHERE userId = ?', [userId]);
      await pool.query('DELETE FROM payments WHERE userId = ?', [userId]);
    } catch (sqlErr) {
      console.warn('[DELETE] MySQL cleanup failed:', sqlErr);
    }

    db.users = db.users.filter(u => u.id !== userId);
    db.emails = db.emails.filter(e => e.userId !== userId);
    db.payments = db.payments.filter(p => p.userId !== userId);
    db.notes = (db.notes || []).filter(n => n.userId !== userId);
    writeDB(db);

    console.log(`[AUTH] Deleted account ${user.email} (${userId})`);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
}
