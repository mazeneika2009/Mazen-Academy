import { Router } from 'express';
import { listGardens, getSeedsByGarden } from '../controllers/garden.controller.js';

const router = Router();

router.get('/', listGardens);
router.get('/:id/seeds', getSeedsByGarden);

export default router;
