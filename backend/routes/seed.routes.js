import { Router } from 'express';
import { getAllSeeds, streamSeed } from '../controllers/seed.controller.js';

const router = Router();

router.get('/', getAllSeeds);
router.get('/:id/stream', streamSeed);

export default router;
