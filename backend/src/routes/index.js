import express from 'express';
import authRoutes from './authRoutes.js';
import interviewRoutes from './interviewRoutes.js';
import analyticsRoutes from './analyticsRoutes.js';
import dsaRoutes from './dsaRoutes.js';
import conceptsRoutes from './conceptsRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/interview', interviewRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dsa', dsaRoutes);
router.use('/concepts', conceptsRoutes);

export default router;
