import { Router } from 'express';
import { checkout, webhook } from '../controllers/payment.controller.js';

const router = Router();

router.post('/checkout', checkout);
router.post('/webhook/:gateway', webhook);

export default router;
