import { Router } from 'express';
import { requireApiKey, ingestRateLimiter } from '../middleware';
import * as ingestController from '../controllers/ingestController';
import { ingestDOM } from '../controllers/domSnapshotController';

const router = Router();
router.use(requireApiKey);
router.use(ingestRateLimiter);

router.post('/session/start', ingestController.sessionStart);
router.post('/batch',         ingestController.batchIngest);
router.post('/session/end',   ingestController.sessionEnd);
router.post('/identify',      ingestController.identify);

// DOM snapshot recording — no requireApiKey since it validates apiKey internally
// (larger payload limit for snapshots)
router.post('/dom',           ingestDOM);

export default router;
