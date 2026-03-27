import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as webhookController from '../controllers/webhookController';

const router = Router();
router.use(requireDashboardToken);

router.get('/',           webhookController.listWebhooks);
router.post('/',          webhookController.createWebhook);
router.put('/:id',        webhookController.updateWebhook);
router.delete('/:id',     webhookController.deleteWebhook);
router.post('/:id/test',  webhookController.testWebhook);

export default router;
