import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as teamController from '../controllers/teamController';

const router = Router();

// Public — no auth needed to view invite info
router.get('/:token',        teamController.getInvite);

// Accepting requires auth (so we know who is accepting)
router.post('/:token/accept', requireDashboardToken, teamController.acceptInvite);

export default router;
