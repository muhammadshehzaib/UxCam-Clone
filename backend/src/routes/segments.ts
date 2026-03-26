import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as segmentController from '../controllers/segmentController';

const router = Router();
router.use(requireDashboardToken);

router.get('/',        segmentController.listSegments);
router.post('/',       segmentController.createSegment);
router.put('/:id',     segmentController.updateSegment);
router.delete('/:id',  segmentController.deleteSegment);

export default router;
