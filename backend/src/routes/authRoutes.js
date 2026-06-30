import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forgotPassword, login, me, signup } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/signup', authLimiter, asyncHandler(signup));
router.post('/register', authLimiter, asyncHandler(signup));
router.post('/login', authLimiter, asyncHandler(login));
router.post('/forgot-password', authLimiter, asyncHandler(forgotPassword));
router.get('/me', requireAuth, asyncHandler(me));

export default router;
