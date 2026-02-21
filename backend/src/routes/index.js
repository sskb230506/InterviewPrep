import { Router } from 'express';
import authRoutes from './authRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import resumeRoutes from './resumeRoutes.js';
import interviewRoutes from './interviewRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import settingsRoutes from './settingsRoutes.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'ai-interview-prep-backend' });
});

router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/resume', resumeRoutes);
router.use('/interview', interviewRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);

export default router;
