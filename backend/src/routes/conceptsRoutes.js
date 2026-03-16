import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { generateConceptQuestion, evaluateMCQAnswer, evaluateConceptAnswer } from '../services/conceptsService.js';
import { transcribeAudio } from '../services/audioService.js';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// POST /concepts/question — Generate MCQ or voice question
router.post('/question', authenticateToken, async (req, res) => {
    try {
        const { topic, difficulty, yoe, answerMode = 'mcq', previousQuestions = [] } = req.body;

        if (!topic || !difficulty) {
            return res.status(400).json({ error: 'topic and difficulty are required.' });
        }

        const question = await generateConceptQuestion({
            topic,
            difficulty,
            yoe: yoe || 0,
            answerMode,
            previousQuestions
        });

        res.json({ ...question, answerMode });
    } catch (error) {
        console.error('[Concepts] Question generation error:', error);
        res.status(500).json({ error: 'Failed to generate concepts question.' });
    }
});

// POST /concepts/answer/mcq — Submit MCQ answer (instant check)
router.post('/answer/mcq', authenticateToken, async (req, res) => {
    try {
        const { question, selectedOption, correctAnswer, explanation } = req.body;

        if (!selectedOption || !correctAnswer) {
            return res.status(400).json({ error: 'selectedOption and correctAnswer are required.' });
        }

        const result = await evaluateMCQAnswer({ question, selectedOption, correctAnswer, explanation });
        res.json(result);
    } catch (error) {
        console.error('[Concepts] MCQ answer error:', error);
        res.status(500).json({ error: 'Failed to evaluate MCQ answer.' });
    }
});

// POST /concepts/answer/voice — Submit voice answer (audio file)
router.post('/answer/voice', authenticateToken, upload.single('audio'), async (req, res) => {
    try {
        const { question, keyPoints } = req.body;

        if (!req.file) {
            return res.status(400).json({ error: 'Audio file is required.' });
        }

        // Transcribe the audio
        const transcript = await transcribeAudio(req.file.path);

        // Evaluate the answer
        const evaluation = await evaluateConceptAnswer({
            question,
            keyPoints: JSON.parse(keyPoints || '[]'),
            transcript
        });

        res.json({ transcript, ...evaluation });
    } catch (error) {
        console.error('[Concepts] Voice answer error:', error);
        res.status(500).json({ error: 'Failed to evaluate voice answer.' });
    }
});

export default router;
