import { InterviewSession } from '../models/InterviewSession.js';
import { AppError } from '../utils/errors.js';
import { generateInterviewQuestions } from '../services/questionService.js';
import { evaluateAnswer, summarizeSession } from '../services/interviewScoringService.js';

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

    return {
      id: question.id,
      question: answer.question,
      transcript: answer.transcript,
      feedback: answer.feedback,
      betterAnswer: answer.betterAnswer,
      scores: answer.scores,
      keywords: answer.keywords,
    };
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

  const evaluation = evaluateAnswer({
    questionId,
    questionText: question.text,
    type: question.type,
    audioSize: req.file.size,
  });

  const nextAnswer = {
    questionId: question.id,
    question: question.text,
    type: question.type,
    transcript: evaluation.transcript,
    feedback: evaluation.feedback,
    betterAnswer: evaluation.betterAnswer,
    keywords: evaluation.keywords,
    scores: evaluation.scores,
    fillerWords: evaluation.fillerWords,
    audio: {
      fileName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
    },
    answeredAt: new Date(),
  };

  const existingIndex = session.answers.findIndex((answer) => answer.questionId === question.id);
  if (existingIndex >= 0) {
    session.answers[existingIndex] = nextAnswer;
  } else {
    session.answers.push(nextAnswer);
  }

  await session.save();

  res.json({
    status: 'processed',
    questionId,
  });
}

export async function endSession(req, res) {
  const { sessionId } = req.params;
  const session = await loadOwnedSession(req.user._id, sessionId);

  const summary = summarizeSession(session.answers);

  session.status = 'completed';
  session.endedAt = new Date();
  session.result = summary;
  await session.save();

  res.json({ sessionId: session._id, status: 'completed' });
}

export async function getResults(req, res) {
  const { sessionId } = req.params;
  const session = await loadOwnedSession(req.user._id, sessionId);

  if (!session.result?.overallScore && session.answers.length) {
    session.result = summarizeSession(session.answers);
    await session.save();
  }

  const perQuestion = buildPerQuestionReview(session);

  res.json({
    sessionId: session._id,
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
    perQuestion,
  });
}
