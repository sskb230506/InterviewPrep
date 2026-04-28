import { InterviewSession } from '../models/InterviewSession.js';
import { env } from '../config/env.js';
import { enqueueInterviewEvaluation } from './queue/interviewEvaluationQueue.js';
import { publishInterviewEvent } from './realtime/interviewEvents.js';
import { evaluateAnswer, summarizeSession } from './interviewScoringService.js';

export function countPendingEvaluations(session) {
  return session.answers.filter(
    (answer) => answer.status === 'queued' || answer.status === 'processing',
  ).length;
}

export function countFailedEvaluations(session) {
  return session.answers.filter((answer) => answer.status === 'failed').length;
}

function normalizeAudioMetadata(storedAudio) {
  return {
    fileName: storedAudio.fileName,
    mimeType: storedAudio.mimeType,
    size: storedAudio.size,
    path: storedAudio.path,
    key: storedAudio.key,
    url: storedAudio.url,
    provider: storedAudio.provider,
  };
}

export function buildQueuedAnswer({ question, storedAudio, jobId = '' }) {
  return {
    questionId: question.id,
    question: question.text,
    type: question.type,
    status: 'queued',
    processingError: '',
    evaluationJobId: jobId,
    transcript: '',
    feedback: [],
    betterAnswer: '',
    keywords: [],
    scores: {
      technical: 0,
      clarity: 0,
      confidence: 0,
    },
    fillerWords: 0,
    audio: normalizeAudioMetadata(storedAudio),
    answeredAt: new Date(),
  };
}

function findQuestionById(session, questionId) {
  return session.questions.find((item) => item.id === questionId);
}

function findAnswerById(session, questionId) {
  return session.answers.find((item) => item.questionId === questionId);
}

function markCompletedIfReady(session) {
  const pendingEvaluations = countPendingEvaluations(session);
  if (!session.endedAt || pendingEvaluations > 0) {
    return;
  }

  session.result = summarizeSession(session.answers);
  session.status = 'completed';
}

async function emitInterviewEvent(sessionId, type, payload) {
  try {
    await publishInterviewEvent(sessionId, type, payload);
  } catch (error) {
    console.error(`Failed to publish interview event "${type}" for session ${sessionId}`, error);
  }
}

export async function queueAnswerEvaluation({ session, question, storedAudio }) {
  const queuedAnswer = buildQueuedAnswer({ question, storedAudio });
  const existingIndex = session.answers.findIndex((answer) => answer.questionId === question.id);

  if (existingIndex >= 0) {
    session.answers[existingIndex] = queuedAnswer;
  } else {
    session.answers.push(queuedAnswer);
  }

  await session.save();

  if (env.evaluationMode === 'inline') {
    await processInterviewEvaluationJob({
      sessionId: String(session._id),
      questionId: question.id,
    });

    const updatedSession = await InterviewSession.findById(session._id);

    return {
      status: 'processed',
      pendingEvaluations: updatedSession ? countPendingEvaluations(updatedSession) : 0,
      jobId: 'inline',
    };
  }

  let job;

  try {
    job = await enqueueInterviewEvaluation({
      sessionId: String(session._id),
      questionId: question.id,
    });
  } catch (error) {
    const failedAnswer = findAnswerById(session, question.id);
    if (failedAnswer) {
      failedAnswer.status = 'failed';
      failedAnswer.processingError = error.message;
      await session.save();
    }

    throw error;
  }

  const savedAnswer = findAnswerById(session, question.id);
  if (savedAnswer) {
    savedAnswer.evaluationJobId = job.id;
    await session.save();
  }

  await emitInterviewEvent(String(session._id), 'answer_queued', {
    questionId: question.id,
    pendingEvaluations: countPendingEvaluations(session),
  });

  return {
    status: 'queued',
    pendingEvaluations: countPendingEvaluations(session),
    jobId: job.id,
  };
}

export async function processInterviewEvaluationJob({ sessionId, questionId }) {
  const session = await InterviewSession.findById(sessionId);
  if (!session) {
    throw new Error(`Interview session ${sessionId} not found`);
  }

  const question = findQuestionById(session, questionId);
  const answer = findAnswerById(session, questionId);

  if (!question || !answer) {
    throw new Error(`Question ${questionId} not found in session ${sessionId}`);
  }

  answer.status = 'processing';
  answer.processingError = '';
  await session.save();

  try {
    const evaluation = evaluateAnswer({
      questionId,
      questionText: question.text,
      type: question.type,
      audioSize: answer.audio?.size || 0,
    });

    answer.transcript = evaluation.transcript;
    answer.feedback = evaluation.feedback;
    answer.betterAnswer = evaluation.betterAnswer;
    answer.keywords = evaluation.keywords;
    answer.scores = evaluation.scores;
    answer.fillerWords = evaluation.fillerWords;
    answer.status = 'completed';
    answer.processingError = '';

    markCompletedIfReady(session);
    await session.save();

    const pendingEvaluations = countPendingEvaluations(session);

    await emitInterviewEvent(String(session._id), 'answer_processed', {
      questionId,
      pendingEvaluations,
      sessionStatus: session.status,
    });

    if (session.status === 'completed') {
      await emitInterviewEvent(String(session._id), 'session_completed', {
        overallScore: session.result?.overallScore || 0,
      });
    }

    return {
      sessionId: String(session._id),
      questionId,
      pendingEvaluations,
      sessionStatus: session.status,
    };
  } catch (error) {
    answer.status = 'failed';
    answer.processingError = error.message;
    markCompletedIfReady(session);
    await session.save();

    await emitInterviewEvent(String(session._id), 'answer_failed', {
      questionId,
      message: error.message,
      pendingEvaluations: countPendingEvaluations(session),
    });

    throw error;
  }
}
