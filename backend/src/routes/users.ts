import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as usersController from '../controllers/usersController';

const router = Router();
router.use(requireDashboardToken);

// Export must come before /:id to avoid Express treating "export.csv" as a user ID
router.get('/export.csv',    usersController.exportUsers);

router.get('/',              usersController.listUsers);
router.get('/:id',           usersController.getUser);
router.get('/:id/sessions',  usersController.getUserSessions);

export default router;
