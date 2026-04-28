import { Worker } from 'bullmq';
import { env } from '../config/env.js';
import { processInterviewEvaluationJob } from '../services/interviewEvaluationService.js';
import {
  createRedisConnection,
} from '../services/queue/redisConnection.js';
import { INTERVIEW_EVALUATION_JOB } from '../services/queue/interviewEvaluationQueue.js';

export function startInterviewEvaluationWorker() {
  const connection = createRedisConnection('interview-evaluation-worker');

  const worker = new Worker(
    env.interviewEvaluationQueue,
    async (job) => {
      if (job.name !== INTERVIEW_EVALUATION_JOB) {
        return null;
      }

      return processInterviewEvaluationJob(job.data);
    },
    {
      connection,
      concurrency: env.interviewEvaluationConcurrency,
    },
  );

  worker.on('completed', (job) => {
    console.log(`Interview evaluation completed for job ${job.id}`);
  });

  worker.on('failed', (job, error) => {
    console.error(`Interview evaluation failed for job ${job?.id || 'unknown'}`, error);
  });

  return worker;
}
