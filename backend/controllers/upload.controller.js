import { isVercel } from '../config/index.js';
import upload from '../middleware/upload.js';

export function uploadFile(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.error('[Upload] Multer error:', err.message);
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    if (isVercel) {
      const b64 = req.file.buffer.toString('base64');
      const mime = req.file.mimetype || 'application/octet-stream';
      const url = `data:${mime};base64,${b64}`;
      console.log('[Upload] Memory file:', req.file.originalname, `(${(req.file.buffer.length / 1024).toFixed(1)}KB)`);
      res.json({ success: true, url });
    } else {
      const url = `/uploads/${req.file.filename}`;
      console.log('[Upload] Saved file:', req.file.filename, '->', url);
      res.json({ success: true, url });
    }
  });
}
