import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { audioUpload } from '../middleware/upload.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  completeDirectAnswerUpload,
  createAnswerUploadTarget,
  createSession,
  endSession,
  getNextQuestion,
  getResults,
  getReview,
  submitAnswer,
} from '../controllers/interviewController.js';

const router = Router();

router.post('/session', requireAuth, asyncHandler(createSession));
router.get('/session/:sessionId/question', requireAuth, asyncHandler(getNextQuestion));
router.post(
  '/session/:sessionId/answer-upload-url',
  requireAuth,
  asyncHandler(createAnswerUploadTarget),
);
router.post(
  '/session/:sessionId/answer-complete',
  requireAuth,
  asyncHandler(completeDirectAnswerUpload),
);
router.post(
  '/session/:sessionId/answer',
  requireAuth,
  audioUpload.single('audio'),
  asyncHandler(submitAnswer),
);
router.post('/session/:sessionId/end', requireAuth, asyncHandler(endSession));
router.get('/session/:sessionId/results', requireAuth, asyncHandler(getResults));
router.get('/session/:sessionId/review', requireAuth, asyncHandler(getReview));

export default router;
