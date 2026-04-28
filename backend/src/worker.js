import mongoose from 'mongoose';
import { closeInterviewEvaluationQueue } from './services/queue/interviewEvaluationQueue.js';
import { closeRedisConnections } from './services/queue/redisConnection.js';
import { startInterviewEvaluationWorker } from './workers/interviewEvaluationWorker.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

async function bootstrap() {
  await connectDatabase(env.mongoUri);

  if (env.evaluationMode !== 'redis') {
    console.log('Interview evaluation worker is disabled because EVALUATION_MODE is not redis.');
    await mongoose.disconnect();
    return;
  }

  const worker = startInterviewEvaluationWorker();
  console.log(`Interview evaluation worker listening on queue "${env.interviewEvaluationQueue}"`);

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`Received ${signal}. Shutting down worker...`);

    await worker.close();
    await closeInterviewEvaluationQueue();
    await closeRedisConnections();
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start interview evaluation worker', error);
  process.exit(1);
});
