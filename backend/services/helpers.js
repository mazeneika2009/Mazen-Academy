import path from 'path';
import fs from 'fs';

export const genId = () => Math.random().toString(36).substring(2, 11);

export const mysqlNow = () => new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, '');

export function parseDurationToSeconds(duration) {
  if (!duration) return 0;
  const parts = duration.split(':').map(Number);
  if (parts.some(isNaN)) return 1800;
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] || 0;
}

export const logAdminAction = (action, details) => {
  if (process.env.VERCEL) {
    console.log(`[AUDIT] ${action}`, details);
    return;
  }
  const logDir = path.join(process.cwd(), 'logs');
  const logFile = path.join(logDir, 'admin_audit.log');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const entry = `[${new Date().toISOString()}] ACTION: ${action} | DETAILS: ${JSON.stringify(details)}\n`;
  fs.appendFile(logFile, entry, (err) => {
    if (err) console.error('[AUDIT LOG] Failed to persist admin action:', err);
  });
};
