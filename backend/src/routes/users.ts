import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as usersController from '../controllers/usersController';

const router = Router();
router.use(requireDashboardToken);

// Static routes before /:id to avoid Express treating them as user IDs
router.get('/export.csv',    usersController.exportUsers);
router.get('/trait-keys',    usersController.getTraitKeys);

router.get('/',              usersController.listUsers);
router.get('/:id',           usersController.getUser);
router.get('/:id/sessions',  usersController.getUserSessions);

export default router;
