import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as bookmarkController from '../controllers/bookmarkController';

const router = Router();
router.use(requireDashboardToken);

router.get('/', bookmarkController.listBookmarks);

export default router;
