import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as funnelController from '../controllers/funnelController';

const router = Router();
router.use(requireDashboardToken);

router.get('/',           funnelController.listFunnels);
router.post('/',          funnelController.createFunnel);
router.delete('/:id',     funnelController.deleteFunnel);
router.get('/:id/results', funnelController.getFunnelResults);

export default router;
