import { Router } from 'express';
import { asyncHandler } from '../utils/asyncHandler.js';
import { forgotPassword, login, me, signup } from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.post('/signup', asyncHandler(signup));
router.post('/register', asyncHandler(signup));
router.post('/login', asyncHandler(login));
router.post('/forgot-password', asyncHandler(forgotPassword));
router.get('/me', requireAuth, asyncHandler(me));

export default router;
