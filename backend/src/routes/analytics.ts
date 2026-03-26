import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as analyticsController from '../controllers/analyticsController';
import * as heatmapController from '../controllers/heatmapController';
import * as crashController from '../controllers/crashController';
import * as screenFlowController from '../controllers/screenFlowController';

const router = Router();
router.use(requireDashboardToken);

router.get('/summary',            analyticsController.getSummary);
router.get('/sessions-over-time', analyticsController.getSessionsOverTime);
router.get('/heatmap',            heatmapController.getHeatmap);
router.get('/screens',            heatmapController.getScreenNames);
router.get('/crashes',            crashController.getCrashGroups);
router.get('/crashes/sessions',   crashController.getCrashSessions);
router.get('/screen-flow',        screenFlowController.getScreenFlow);

export default router;
