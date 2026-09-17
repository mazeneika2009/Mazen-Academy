import { Router } from 'express';
import {
  saveGrowth, getGrowth, getGardenProgress,
  getNotebook, createNotebook, deleteNotebook,
  getQueries, createQuery,
  getEmails, markEmailRead, sendEmailMessage, deleteEmail,
  requestOtp, verifyOtp
} from '../controllers/student.controller.js';

const router = Router();

router.post('/student_growth/save', saveGrowth);
router.post('/student_growth/get', getGrowth);
router.post('/student_growth/garden-progress', getGardenProgress);

router.get('/notebook', getNotebook);
router.post('/notebook', createNotebook);
router.post('/notebook/delete', deleteNotebook);

router.get('/queries', getQueries);
router.post('/queries', createQuery);

router.get('/emails', getEmails);
router.post('/emails/read', markEmailRead);
router.post('/emails/send', sendEmailMessage);
router.post('/emails/delete', deleteEmail);

router.post('/reports/request-otp', requestOtp);
router.post('/reports/verify-otp', verifyOtp);

export default router;
