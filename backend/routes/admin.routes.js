import { Router } from 'express';
import { adminAuth } from '../middleware/auth.js';
import {
  login, getUsers, togglePaid, getPayments,
  approvePayment, rejectPayment, getAnalytics,
  cmsGardens, cmsSeeds, cmsSeedsBulk, cmsDelete,
  getQuizDegrees, saveQuizQuestion, deleteQuizQuestion,
  answerQuery, getAdminQueries, getAuditLogs,
  getSmtpStatus, sendTestEmail
} from '../controllers/admin.controller.js';

const router = Router();

router.post('/login', login);

router.use(adminAuth);

router.get('/users', getUsers);
router.post('/users/toggle-paid', togglePaid);
router.get('/payments', getPayments);
router.post('/payments/approve', approvePayment);
router.post('/payments/reject', rejectPayment);
router.get('/analytics', getAnalytics);
router.post('/cms/gardens', cmsGardens);
router.post('/cms/seeds', cmsSeeds);
router.post('/cms/seeds/bulk', cmsSeedsBulk);
router.post('/cms/delete', cmsDelete);
router.get('/quiz-degrees', getQuizDegrees);
router.post('/quiz_questions', saveQuizQuestion);
router.post('/quiz_questions/delete', deleteQuizQuestion);
router.post('/queries/answer', answerQuery);
router.get('/queries', getAdminQueries);
router.get('/audit-logs', getAuditLogs);
router.get('/smtp/status', getSmtpStatus);
router.post('/smtp/test', sendTestEmail);

export default router;
