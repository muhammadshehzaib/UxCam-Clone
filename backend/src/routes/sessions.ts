import { Router } from 'express';
import { requireDashboardToken } from '../middleware';
import * as sessionsController from '../controllers/sessionsController';
import * as annotationsController from '../controllers/sessionAnnotationsController';
import * as bookmarkController from '../controllers/bookmarkController';
import { getDOMFrames } from '../controllers/domSnapshotController';

const router = Router();
router.use(requireDashboardToken);

// Export must come before /:id to avoid Express matching "export.csv" as a session ID
router.get('/export.csv', sessionsController.exportSessions);

router.get('/',    sessionsController.listSessions);
router.get('/:id', sessionsController.getSession);

// Annotation endpoints
router.patch('/:id/note',     annotationsController.updateNote);
router.patch('/:id/tags',     annotationsController.updateTags);
router.post('/:id/bookmark',  bookmarkController.toggleBookmark);
router.get('/:id/dom',        getDOMFrames);

export default router;
