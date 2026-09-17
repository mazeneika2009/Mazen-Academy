import { Router } from 'express';
import authRoutes from './auth.routes.js';
import gardenRoutes from './garden.routes.js';
import seedRoutes from './seed.routes.js';
import studentRoutes from './student.routes.js';
import paymentRoutes from './payment.routes.js';
import adminRoutes from './admin.routes.js';
import quizRoutes from './quiz.routes.js';
import uploadRoutes from './upload.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/gardens', gardenRoutes);
router.use('/seeds', seedRoutes);
router.use(studentRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use(quizRoutes);
router.use(uploadRoutes);

export default router;
