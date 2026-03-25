import { Router } from 'express';
import { requireApiKey, ingestRateLimiter } from '../middleware';
import * as ingestController from '../controllers/ingestController';

const router = Router();
router.use(requireApiKey);
router.use(ingestRateLimiter);

router.post('/session/start', ingestController.sessionStart);
router.post('/batch',         ingestController.batchIngest);
router.post('/session/end',   ingestController.sessionEnd);
router.post('/identify',      ingestController.identify);

export default router;
