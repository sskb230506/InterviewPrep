import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getAnalytics } from '../controllers/analyticsController.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(getAnalytics));
router.get('/dashboard', requireAuth, asyncHandler(getAnalytics));

export default router;
