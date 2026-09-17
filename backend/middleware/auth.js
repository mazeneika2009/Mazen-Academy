export const adminTokens = new Map();

export function adminAuth(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ error: 'Admin access denied. Please log in.' });
  }
  adminTokens.set(token, Date.now());
  next();
}
