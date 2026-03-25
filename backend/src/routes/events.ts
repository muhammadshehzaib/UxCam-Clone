import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as eventsController from '../controllers/eventsController';

const router = Router({ mergeParams: true });
router.use(requireDashboardToken);

router.get('/', eventsController.getSessionEvents);

export default router;
