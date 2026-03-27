import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import { requireProjectAdmin } from '../middleware/requireAdmin';
import * as teamController from '../controllers/teamController';

const router = Router({ mergeParams: true }); // to access :projectId from parent
router.use(requireDashboardToken);

// Any member can list the team
router.get('/members',              teamController.listMembers);

// Only admins can invite or remove
router.post('/invites',             requireProjectAdmin, teamController.createInvite);
router.delete('/members/:userId',   requireProjectAdmin, teamController.removeMember);

export default router;
