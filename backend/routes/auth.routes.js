import { Router } from 'express';
import { register, forgotPassword, resendCode, verify, login, session, deleteAccount } from '../controllers/auth.controller.js';

const router = Router();

router.post('/register', register);
router.post('/forgot-password', forgotPassword);
router.post('/resend-code', resendCode);
router.post('/verify', verify);
router.post('/login', login);
router.post('/session', session);
router.post('/delete-account', deleteAccount);

export default router;
