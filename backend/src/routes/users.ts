import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as usersController from '../controllers/usersController';

const router = Router();
router.use(requireDashboardToken);

router.get('/',              usersController.listUsers);
router.get('/:id',           usersController.getUser);
router.get('/:id/sessions',  usersController.getUserSessions);

export default router;
