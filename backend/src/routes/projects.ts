import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import { requireProjectAdmin } from '../middleware/requireAdmin';
import * as projectController from '../controllers/projectController';

const router = Router();
router.use(requireDashboardToken);

router.get('/',                        projectController.listProjects);
router.post('/',                       projectController.createProject);
router.post('/:id/switch',             projectController.switchProject);
router.post('/:id/regenerate-key',     requireProjectAdmin, projectController.regenerateApiKey);

export default router;
