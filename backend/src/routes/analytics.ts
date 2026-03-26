import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as analyticsController from '../controllers/analyticsController';
import * as heatmapController from '../controllers/heatmapController';

const router = Router();
router.use(requireDashboardToken);

router.get('/summary',            analyticsController.getSummary);
router.get('/sessions-over-time', analyticsController.getSessionsOverTime);
router.get('/heatmap',            heatmapController.getHeatmap);
router.get('/screens',            heatmapController.getScreenNames);

export default router;
