import { pool, readDB, writeDB } from '../server/db.js';
import { genId, mysqlNow } from '../services/helpers.js';

export async function checkout(req, res) {
  try {
    const { sessionId, gardenId, country, paymentMethod, paymentScreenshot } = req.body;
    if (!sessionId || !gardenId || !country || !paymentMethod) {
      return res.status(400).json({ error: 'Invalid payload.' });
    }

    const db = readDB();

    let user;
    try {
      const [sqlUsers] = await pool.query('SELECT * FROM users WHERE current_session_id = ?', [sessionId]);
      user = sqlUsers && sqlUsers.length > 0 ? sqlUsers[0] : null;
    } catch (sqlErr) {
      console.warn('[PAYMENT] MySQL session lookup failed, falling back to JSON db');
    }
    if (!user) {
      user = db.users.find(u => u.current_session_id === sessionId);
    }
    if (!user) return res.status(403).json({ error: 'Session expired.' });

    let garden = db.gardens.find(g => g.id === gardenId);
    if (!garden) {
      try {
        const [sqlGardens] = await pool.query('SELECT * FROM gardens WHERE id = ?', [gardenId]);
        garden = sqlGardens && sqlGardens.length > 0 ? sqlGardens[0] : null;
      } catch (sqlErr) {
        console.warn('[PAYMENT] MySQL garden lookup failed');
      }
    }
    if (!garden) return res.status(404).json({ error: 'Garden not found.' });

    const currency = country === 'eg' ? 'EGP' : 'TRY';
    const amount = country === 'eg' ? garden.priceEGP : garden.priceTRY;
    const gateway = 'instapay';

    const transactionId = 'TXN_' + country.toUpperCase() + '_' + genId().toUpperCase();

    const now = mysqlNow();
    try {
      await pool.query(
        'INSERT INTO payments (id, userId, userEmail, gardenId, currency, amount, gateway, paymentMethod, screenshot, status, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [transactionId, user.id, user.email, gardenId, currency, amount, gateway, paymentMethod, paymentScreenshot || null, 'pending', now]
      );
    } catch (sqlErr) {
      console.warn('SQL Payment Logging failed, syncing with JSON DB only.');
    }

    db.payments.push({
      id: transactionId,
      userId: user.id,
      userEmail: user.email,
      gardenId: garden.id,
      currency,
      amount,
      gateway,
      paymentMethod,
      screenshot: paymentScreenshot,
      status: 'pending',
      timestamp: now
    });
    writeDB(db);

    console.log(`[PAYMENT] Sandbox Checkout initiated for ${user.email} -> ${amount} ${currency} via ${paymentMethod}`);

    return res.json({
      success: true,
      transactionId,
      currency,
      amount,
      gateway,
      paymentMethod,
      message: 'Payment submitted! Your access will be activated once our registry verifies the transfer.'
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Checkout system offline.' });
  }
}

export async function webhook(req, res) {
  const { gateway } = req.params;
  console.log(`[WEBHOOK] Received payment notification for gateway: ${gateway}`, req.body);
  return res.json({ success: true, received: true });
}
