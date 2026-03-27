import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as reportController from '../controllers/emailReportController';

const router = Router();

// Trigger is public but protected by CRON_SECRET header
router.post('/trigger',  reportController.triggerReports);

// All other routes require dashboard auth
router.use(requireDashboardToken);
router.get('/',          reportController.listReports);
router.post('/',         reportController.createReport);
router.delete('/:id',    reportController.deleteReport);
router.get('/preview',   reportController.previewReport);

export default router;
