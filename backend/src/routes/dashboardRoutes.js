import { Router } from 'express';
import { getDashboard } from '../controllers/dashboardController.js';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(getDashboard));

export default router;
