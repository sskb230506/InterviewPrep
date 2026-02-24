import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { getUserAnalytics } from '../services/analyticsService.js';

const router = express.Router();

router.get('/dashboard', authenticateToken, async (req, res) => {
    try {
        const analytics = await getUserAnalytics(req.user.userId);
        res.json(analytics);
    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});

export default router;
