import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as analyticsController from '../controllers/analyticsController';
import * as heatmapController from '../controllers/heatmapController';
import * as crashController from '../controllers/crashController';
import * as screenFlowController from '../controllers/screenFlowController';
import * as retentionController from '../controllers/retentionController';

const router = Router();
router.use(requireDashboardToken);

router.get('/summary',            analyticsController.getSummary);
router.get('/sessions-over-time', analyticsController.getSessionsOverTime);
router.get('/heatmap',            heatmapController.getHeatmap);
router.get('/screens',            heatmapController.getScreenNames);
router.get('/crashes',            crashController.getCrashGroups);
router.get('/crashes/timeline',   crashController.getCrashTimeline);   // before /sessions to avoid prefix match
router.get('/crashes/sessions',   crashController.getCrashSessions);
router.get('/screen-flow',        screenFlowController.getScreenFlow);
router.get('/retention',                        retentionController.getRetention);
router.get('/custom-events',                    analyticsController.getCustomEvents);
router.get('/feedback',                         analyticsController.getFeedbackSubmissions);
router.get('/custom-events/:name/timeline',     analyticsController.getCustomEventTimeline);

export default router;
