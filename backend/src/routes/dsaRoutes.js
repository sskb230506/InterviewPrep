import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generateDSAProblem, evaluateDSACode } from '../services/dsaService.js';
import Session from '../models/Session.js';
import DSASubmission from '../models/DSASubmission.js';

const router = express.Router();

// POST /dsa/problem — Generate a new DSA problem
router.post('/problem', authenticateToken, async (req, res) => {
    try {
        const { company, language, topic, sessionId, previousProblems = [] } = req.body;
        if (!company || !language) {
            return res.status(400).json({ error: 'company and language are required.' });
        }
        const problem = await generateDSAProblem({ company, language, topic, previousProblems });
        res.json(problem);
    } catch (error) {
        console.error('[DSA] Problem generation error:', error);
        res.status(500).json({ error: 'Failed to generate DSA problem.' });
    }
});

// POST /dsa/evaluate — Evaluate submitted code + save submission record
router.post('/evaluate', authenticateToken, async (req, res) => {
    try {
        const { problem, code, language, timeUsedSeconds, timeLimitSeconds, sessionId } = req.body;
        if (!problem || !code || !language) {
            return res.status(400).json({ error: 'problem, code, and language are required.' });
        }

        const evaluation = await evaluateDSACode({ problem, code, language });

        // Save submission record for dashboard
        await DSASubmission.create({
            userId: req.user.userId,
            sessionId: sessionId || null,
            problemTitle: problem.title,
            company: problem.company,
            difficulty: problem.difficulty,
            language,
            topic: problem.topic,
            passed: evaluation.passed,
            passedCount: evaluation.passedCount || 0,
            totalCount: evaluation.totalCount || 0,
            score: evaluation.score || 0,
            timeUsedSeconds: timeUsedSeconds || 0,
            timeLimitSeconds: timeLimitSeconds || 0,
        });

        res.json(evaluation);
    } catch (error) {
        console.error('[DSA] Code evaluation error:', error);
        res.status(500).json({ error: 'Failed to evaluate code.' });
    }
});

export default router;
