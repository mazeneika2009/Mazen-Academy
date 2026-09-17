import { pool, readDB, isPostgres } from '../server/db.js';
import { genId } from '../services/helpers.js';

export async function getAllSeeds(req, res) {
  const db = readDB();
  const map = new Map();
  (db.seeds || []).forEach(s => map.set(s.id, s));
  try {
    const tagsSql = isPostgres
      ? `SELECT s.*, COALESCE(string_agg(st.tag, ','), '') AS tags FROM seeds s LEFT JOIN seed_tags st ON st.seedId = s.id GROUP BY s.id ORDER BY s.sortOrder, s.id`
      : `SELECT s.*, GROUP_CONCAT(st.tag) AS tags FROM seeds s LEFT JOIN seed_tags st ON st.seedId = s.id GROUP BY s.id ORDER BY s.sortOrder, s.id`;
    const [rows] = await pool.query(tagsSql);
    rows.forEach(r => {
      if (!map.has(r.id)) {
        if (r.tags) r.tags = r.tags.split(',');
        else r.tags = [];
        map.set(r.id, r);
      }
    });
  } catch {}
  return res.json([...map.values()]);
}

export async function streamSeed(req, res) {
  try {
    const { id } = req.params;
    const token = req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Authentication token is required for streaming.' });
    }

    const db = readDB();
    const user = db.users.find(u => u.current_session_id === token);

    if (!user) {
      return res.status(403).json({ error: 'Invalid session or logged in elsewhere.' });
    }

    const seed = db.seeds.find(s => s.id === id);
    if (!seed) {
      return res.status(404).json({ error: 'Seed not found.' });
    }

    if (!user.paidGardens?.includes(seed.gardenId)) {
      return res.status(402).json({ error: 'Paid access is required to cultivate this seed.' });
    }

    const streamToken = 'bunny_secure_jwt_' + genId() + '_exp_3600';
    const separator = seed.videoUrl.includes('?') ? '&' : '?';
    return res.json({
      success: true,
      videoCode: seed.videoUrl,
      streamToken,
      resolvedUrl: seed.videoUrl.startsWith('http') ? `${seed.videoUrl}${separator}token=${streamToken}` : seed.videoUrl
    });
  } catch (err) {
    return res.status(500).json({ error: 'Streaming token generation failed.' });
  }
}
