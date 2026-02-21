import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  changePassword,
  deleteAccount,
  updateProfile,
} from '../controllers/settingsController.js';

const router = Router();

router.put('/profile', requireAuth, asyncHandler(updateProfile));
router.put('/password', requireAuth, asyncHandler(changePassword));
router.delete('/account', requireAuth, asyncHandler(deleteAccount));

export default router;
