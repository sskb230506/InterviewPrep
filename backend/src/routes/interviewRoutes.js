import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.js';
import { parseResumePdf } from '../services/resumeService.js';
import { processJobDescription } from '../services/jdService.js';
import { computeSkillMatch } from '../services/matchingService.js';
import { generateQuestion } from '../services/questionService.js';
import { transcribeAudio } from '../services/audioService.js';
import { evaluateAnswer } from '../services/evaluationService.js';
import { judgeEvaluation } from '../services/judgeService.js';

import Session from '../models/Session.js';
import Question from '../models/Question.js';
import Answer from '../models/Answer.js';
import Evaluation from '../models/Evaluation.js';
import JudgeAudit from '../models/JudgeAudit.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// 1. Initialize Session
router.post('/start', authenticateToken, upload.single('resume'), async (req, res) => {
    try {
        const { jobRole, jdText } = req.body;
        if (!req.file || !jobRole || !jdText) {
            return res.status(400).json({ error: 'Missing resume, jobRole, or jdText' });
        }

        const fileBuffer = fs.readFileSync(req.file.path);
        const resumeText = await parseResumePdf(fileBuffer);
        fs.unlinkSync(req.file.path); // clean up

        const cleanedJD = processJobDescription(jdText);
        const skillsMatch = await computeSkillMatch(resumeText, cleanedJD);

        const session = await Session.create({
            userId: req.user.userId, // This comes from JWT middleware
            jobRole,
            jdText: cleanedJD,
            resumeText,
            skillsMatch
        });

        res.json({ sessionId: session._id, skillsMatch });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to start session.' });
    }
});

// 2. Request a Question
router.post('/:sessionId/question', authenticateToken, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { difficulty } = req.body;

        const session = await Session.findById(sessionId);

        // Mongoose ObjectIds are objects but we check string equality
        if (!session || session.userId.toString() !== req.user.userId) {
            return res.status(403).json({ error: 'Unauthorized or session not found.' });
        }

        const previousQuestionsData = await Question.find({ sessionId });
        const previousQuestions = previousQuestionsData.map(q => q.text);

        const generated = await generateQuestion({
            resumeText: session.resumeText || '',
            jdText: session.jdText || '',
            previousQuestions,
            difficulty: difficulty || 'Intermediate'
        });

        const question = await Question.create({
            sessionId,
            text: generated.question,
            difficulty: generated.difficulty
        });

        // Use _id to safely transport back mapping to frontend id mappings
        res.json({ questionId: question._id, id: question._id, ...generated });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to generate question.' });
    }
});

// 3. Submit Answer Audio
router.post('/:sessionId/answer/:questionId', authenticateToken, upload.single('audio'), async (req, res) => {
    try {
        const { questionId } = req.params;

        if (!req.file) {
            return res.status(400).json({ error: 'No audio file uploaded.' });
        }

        const question = await Question.findById(questionId);
        if (!question) return res.status(404).json({ error: 'Question not found.' });

        // 1. STT
        const transcript = await transcribeAudio(req.file.path);

        const answer = await Answer.create({
            questionId,
            transcript,
            audioUrl: req.file.path
        });

        // 2. Evaluate
        const evalData = await evaluateAnswer(question.text, transcript);

        // 3. Judge the evaluation
        const judgeData = await judgeEvaluation(question.text, transcript, evalData);

        const evaluation = await Evaluation.create({
            answerId: answer._id,
            scoreTech: evalData.scoreTech,
            scoreRelevance: evalData.scoreRelevance,
            scoreDepth: evalData.scoreDepth,
            scoreClarity: evalData.scoreClarity,
            scoreStructure: evalData.scoreStructure,
            scoreConfidence: evalData.scoreConfidence || 0,
            generalFeedback: evalData.generalFeedback
        });

        const audit = await JudgeAudit.create({
            evaluationId: evaluation._id,
            confidenceScore: judgeData.confidenceScore,
            isValid: judgeData.isValid,
            suggestedRegeneration: judgeData.suggestedRegeneration,
            auditReasoning: judgeData.auditReasoning
        });

        res.json({ transcript, evaluation, audit });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to process answer.' });
    }
});

export default router;
