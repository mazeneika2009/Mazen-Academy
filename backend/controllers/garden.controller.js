import { pool, readDB, isPostgres } from '../server/db.js';

export async function listGardens(req, res) {
  const db = readDB();
  const map = new Map();
  db.gardens.forEach(g => map.set(g.id, g));
  try {
    const [rows] = await pool.query('SELECT * FROM gardens');
    rows.forEach(r => {
      if (!map.has(r.id)) map.set(r.id, r);
    });
  } catch {}
  return res.json([...map.values()]);
}

export async function getSeedsByGarden(req, res) {
  const { id } = req.params;
  const db = readDB();
  const map = new Map();
  db.seeds.filter(s => s.gardenId === id).forEach(s => map.set(s.id, s));
  try {
    const tagsSql = isPostgres
      ? `SELECT s.*, COALESCE(string_agg(st.tag, ','), '') AS tags FROM seeds s LEFT JOIN seed_tags st ON st.seedId = s.id WHERE s.gardenId = ? GROUP BY s.id ORDER BY s.sortOrder, s.id`
      : `SELECT s.*, GROUP_CONCAT(st.tag) AS tags FROM seeds s LEFT JOIN seed_tags st ON st.seedId = s.id WHERE s.gardenId = ? GROUP BY s.id ORDER BY s.sortOrder, s.id`;
    const [rows] = await pool.query(tagsSql, [id]);
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
