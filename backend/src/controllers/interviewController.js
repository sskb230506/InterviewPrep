import { InterviewSession } from '../models/InterviewSession.js';
import { ALLOWED_AUDIO_MIME_TYPES } from '../middleware/upload.js';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';
import { generateInterviewQuestions } from '../services/questionService.js';
import { summarizeSession } from '../services/interviewScoringService.js';
import {
  countFailedEvaluations,
  countPendingEvaluations,
  queueAnswerEvaluation,
} from '../services/interviewEvaluationService.js';
import {
  canUseDirectUploads,
  confirmDirectUpload,
  createDirectUploadTarget,
  storeUploadedFile,
} from '../services/storageService.js';
import { createUploadToken, verifyUploadToken } from '../services/uploadTokenService.js';

async function loadOwnedSession(userId, sessionId) {
  const session = await InterviewSession.findOne({ _id: sessionId, user: userId });
  if (!session) {
    throw new AppError('Interview session not found', 404);
  }
  return session;
}

function buildPerQuestionReview(session) {
  return session.questions.map((question) => {
    const answer = session.answers.find((item) => item.questionId === question.id);

    if (!answer) {
      return {
        id: question.id,
        status: 'missing',
        question: question.text,
        transcript: 'No answer submitted for this question.',
        feedback: ['Answer missing. Record a response to receive detailed feedback.'],
        betterAnswer: 'Structure your response with context, approach, and measurable impact.',
        scores: {
          technical: 0,
          clarity: 0,
          confidence: 0,
        },
        keywords: ['practice', 'clarity', 'impact'],
      };
    }

    if (answer.status === 'queued' || answer.status === 'processing') {
      return {
        id: question.id,
        status: answer.status,
        question: answer.question,
        transcript:
          'Your recording was uploaded successfully and is being evaluated in the background.',
        feedback: ['Evaluation is still running. Refresh in a moment to see detailed coaching.'],
        betterAnswer: 'A stronger sample answer will appear after evaluation completes.',
        scores: {
          technical: 0,
          clarity: 0,
          confidence: 0,
        },
        keywords: ['processing'],
      };
    }

    if (answer.status === 'failed') {
      return {
        id: question.id,
        status: 'failed',
        question: answer.question,
        transcript: 'Your recording was saved, but evaluation did not complete successfully.',
        feedback: [
          answer.processingError || 'The evaluation worker could not process this answer.',
        ],
        betterAnswer: 'Retry the question or inspect the worker logs before resubmitting.',
        scores: {
          technical: 0,
          clarity: 0,
          confidence: 0,
        },
        keywords: ['retry', 'worker'],
      };
    }

    return {
      id: question.id,
      status: 'completed',
      question: answer.question,
      transcript: answer.transcript,
      feedback: answer.feedback,
      betterAnswer: answer.betterAnswer,
      scores: answer.scores,
      keywords: answer.keywords,
    };
  });
}

function validateAudioFile({ fileName, mimeType, size }) {
  const normalizedMimeType = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (!fileName || !mimeType || !size) {
    throw new AppError('fileName, mimeType, and size are required', 400);
  }

  if (!ALLOWED_AUDIO_MIME_TYPES.has(normalizedMimeType)) {
    throw new AppError('Only WebM, WAV, MP3, or MP4 audio recordings are supported', 400);
  }

  if (Number(size) > 25 * 1024 * 1024) {
    throw new AppError('Audio recordings should be under 25MB', 400);
  }
}

async function queueStoredAnswer({ session, question, storedAudio }) {
  return queueAnswerEvaluation({
    session,
    question,
    storedAudio,
  });
}

export async function createSession(req, res) {
  const { role, difficulty, interviewType } = req.body;

  if (!role || !difficulty || !interviewType) {
    throw new AppError('role, difficulty, and interviewType are required', 400);
  }

  const questions = generateInterviewQuestions({ role, difficulty, interviewType, count: 5 });

  const session = await InterviewSession.create({
    user: req.user._id,
    role,
    difficulty,
    interviewType,
    questions,
  });

  res.status(201).json({
    sessionId: session._id,
    role,
    difficulty,
    interviewType,
    createdAt: session.createdAt,
  });
}

export async function getNextQuestion(req, res) {
  const { sessionId } = req.params;
  const index = Number(req.query.index || 0);

  const session = await loadOwnedSession(req.user._id, sessionId);

  if (Number.isNaN(index) || index < 0) {
    throw new AppError('Invalid question index', 400);
  }

  const question = session.questions[index];
  if (!question) {
    res.json(null);
    return;
  }

  res.json(question);
}

export async function createAnswerUploadTarget(req, res) {
  const { sessionId } = req.params;
  const { questionId, fileName, mimeType, size } = req.body;
  const normalizedMimeType = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (!questionId) {
    throw new AppError('questionId is required', 400);
  }

  validateAudioFile({ fileName, mimeType, size });

  const session = await loadOwnedSession(req.user._id, sessionId);
  const question = session.questions.find((item) => item.id === questionId);

  if (!question) {
    throw new AppError('Question not found in this session', 404);
  }

  if (!canUseDirectUploads()) {
    res.json({ enabled: false });
    return;
  }

  const target = await createDirectUploadTarget({
    category: 'audio',
    prefix: 'audio',
    fileName,
    mimeType: normalizedMimeType,
    metadata: {
      userId: String(req.user._id),
      sessionId,
      questionId,
      purpose: 'interview-answer',
    },
  });

  const uploadToken = createUploadToken({
    kind: 'answer-audio',
    userId: String(req.user._id),
    sessionId,
    questionId,
    key: target.object.key,
    fileName: target.object.fileName,
    mimeType: normalizedMimeType,
    size: Number(size),
  });

  res.json({
    enabled: true,
    uploadUrl: target.uploadUrl,
    method: target.method,
    headers: target.headers,
    uploadToken,
    storageKey: target.object.key,
    fileUrl: target.object.url,
  });
}

export async function submitAnswer(req, res) {
  const { sessionId } = req.params;
  const { questionId } = req.body;

  if (!req.file) {
    throw new AppError('audio file is required', 400);
  }

  if (!questionId) {
    throw new AppError('questionId is required', 400);
  }

  const session = await loadOwnedSession(req.user._id, sessionId);
  const question = session.questions.find((item) => item.id === questionId);

  if (!question) {
    throw new AppError('Question not found in this session', 404);
  }

  const storedAudio = await storeUploadedFile({
    file: req.file,
    category: 'audio',
    prefix: 'audio',
  });

  const evaluation = await queueStoredAnswer({ session, question, storedAudio });

  res.json({
    status: evaluation.status,
    questionId,
    pendingEvaluations: evaluation.pendingEvaluations,
    jobId: evaluation.jobId,
  });
}

export async function completeDirectAnswerUpload(req, res) {
  const { sessionId } = req.params;
  const { uploadToken } = req.body;

  if (!uploadToken) {
    throw new AppError('uploadToken is required', 400);
  }

  const payload = verifyUploadToken(uploadToken);

  if (
    payload.kind !== 'answer-audio' ||
    payload.userId !== String(req.user._id) ||
    payload.sessionId !== sessionId
  ) {
    throw new AppError('Invalid direct upload token', 400);
  }

  const session = await loadOwnedSession(req.user._id, sessionId);
  const question = session.questions.find((item) => item.id === payload.questionId);

  if (!question) {
    throw new AppError('Question not found in this session', 404);
  }

  const storedAudio = await confirmDirectUpload({
    key: payload.key,
    fileName: payload.fileName,
    expectedSize: payload.size,
    expectedMimeType: payload.mimeType,
  });

  const evaluation = await queueStoredAnswer({ session, question, storedAudio });

  res.json({
    status: evaluation.status,
    questionId: payload.questionId,
    pendingEvaluations: evaluation.pendingEvaluations,
    jobId: evaluation.jobId,
    directUpload: storedAudio.provider === 's3' && env.directUploadsEnabled,
  });
}

export async function endSession(req, res) {
  const { sessionId } = req.params;
  const session = await loadOwnedSession(req.user._id, sessionId);

  session.endedAt = new Date();
  const pendingEvaluations = countPendingEvaluations(session);

  if (pendingEvaluations > 0) {
    session.status = 'processing';
  } else {
    session.status = 'completed';
    session.result = summarizeSession(session.answers);
  }

  await session.save();

  res.json({
    sessionId: session._id,
    status: session.status,
    pendingEvaluations,
  });
}

export async function getResults(req, res) {
  const { sessionId } = req.params;
  const session = await loadOwnedSession(req.user._id, sessionId);
  const pendingEvaluations = countPendingEvaluations(session);
  const failedEvaluations = countFailedEvaluations(session);

  if (
    pendingEvaluations === 0 &&
    (!session.result?.strengths?.length || session.status !== 'completed')
  ) {
    session.result = summarizeSession(session.answers);
    if (session.endedAt) {
      session.status = 'completed';
    }
    await session.save();
  }

  const perQuestion = buildPerQuestionReview(session);

  res.json({
    sessionId: session._id,
    status: session.status,
    pendingEvaluations,
    failedEvaluations,
    totalQuestions: session.questions.length,
    completedEvaluations: session.answers.filter((answer) => answer.status === 'completed').length,
    overallScore: session.result?.overallScore || 0,
    confidenceScore: session.result?.confidenceScore || 0,
    technicalScore: session.result?.technicalScore || 0,
    clarityScore: session.result?.clarityScore || 0,
    strengths: session.result?.strengths || [],
    weaknesses: session.result?.weaknesses || [],
    improvements: session.result?.improvements || [],
    perQuestion,
  });
}

export async function getReview(req, res) {
  const { sessionId } = req.params;
  const session = await loadOwnedSession(req.user._id, sessionId);

  const perQuestion = buildPerQuestionReview(session);

  res.json({
    sessionId: session._id,
    status: session.status,
    pendingEvaluations: countPendingEvaluations(session),
    failedEvaluations: countFailedEvaluations(session),
    perQuestion,
  });
}
