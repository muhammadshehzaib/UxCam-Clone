import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as analyticsController from '../controllers/analyticsController';

const router = Router();
router.use(requireDashboardToken);

router.get('/summary',            analyticsController.getSummary);
router.get('/sessions-over-time', analyticsController.getSessionsOverTime);

export default router;
