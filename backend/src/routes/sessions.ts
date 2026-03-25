import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as sessionsController from '../controllers/sessionsController';

const router = Router();
router.use(requireDashboardToken);

router.get('/',    sessionsController.listSessions);
router.get('/:id', sessionsController.getSession);

export default router;
