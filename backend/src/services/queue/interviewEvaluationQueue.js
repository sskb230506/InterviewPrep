import { Queue } from 'bullmq';
import { env } from '../../config/env.js';
import { createRedisConnection } from './redisConnection.js';

export const INTERVIEW_EVALUATION_JOB = 'evaluate-answer';

let interviewEvaluationQueue;
let queueConnection;

function getQueue() {
  if (!interviewEvaluationQueue) {
    queueConnection = createRedisConnection('interview-evaluation-queue');
    interviewEvaluationQueue = new Queue(env.interviewEvaluationQueue, {
      connection: queueConnection,
      defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 250,
        removeOnFail: 500,
        backoff: {
          type: 'exponential',
          delay: 1_000,
        },
      },
    });
  }

  return interviewEvaluationQueue;
}

export async function enqueueInterviewEvaluation(payload) {
  const queue = getQueue();

  return queue.add(INTERVIEW_EVALUATION_JOB, payload, {
    jobId: `${payload.sessionId}:${payload.questionId}:${Date.now()}`,
  });
}

export async function closeInterviewEvaluationQueue() {
  if (interviewEvaluationQueue) {
    await interviewEvaluationQueue.close();
    interviewEvaluationQueue = null;
    queueConnection = null;
  }
}
