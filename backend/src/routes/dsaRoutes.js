import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { generateDSAProblem, evaluateDSACode } from '../services/dsaService.js';
import Session from '../models/Session.js';

const router = express.Router();

// POST /dsa/problem — Generate a new DSA problem
router.post('/problem', authenticateToken, async (req, res) => {
    try {
        const { company, language, topic, sessionId, previousProblems = [] } = req.body;

        if (!company || !language) {
            return res.status(400).json({ error: 'company and language are required.' });
        }

        const problem = await generateDSAProblem({ company, language, topic, previousProblems });

        // If a sessionId was provided, update session record
        if (sessionId) {
            await Session.findByIdAndUpdate(sessionId, {
                'dsaConfig.company': company,
                'dsaConfig.language': language,
                'dsaConfig.topic': topic
            });
        }

        res.json(problem);
    } catch (error) {
        console.error('[DSA] Problem generation error:', error);
        res.status(500).json({ error: 'Failed to generate DSA problem.' });
    }
});

// POST /dsa/evaluate — Evaluate submitted code
router.post('/evaluate', authenticateToken, async (req, res) => {
    try {
        const { problem, code, language } = req.body;

        if (!problem || !code || !language) {
            return res.status(400).json({ error: 'problem, code, and language are required.' });
        }

        const evaluation = await evaluateDSACode({ problem, code, language });
        res.json(evaluation);
    } catch (error) {
        console.error('[DSA] Code evaluation error:', error);
        res.status(500).json({ error: 'Failed to evaluate code.' });
    }
});

export default router;
