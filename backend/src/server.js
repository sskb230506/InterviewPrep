import http from 'http';
import mongoose from 'mongoose';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { subscribeToInterviewEvents } from './services/realtime/interviewEvents.js';
import { closeRedisConnections } from './services/queue/redisConnection.js';
import { closeInterviewEvaluationQueue } from './services/queue/interviewEvaluationQueue.js';
import { broadcastInterviewEvent, registerWebSocketServer } from './websocket.js';

async function bootstrap() {
  await connectDatabase(env.mongoUri);

  const app = createApp();
  const server = http.createServer(app);
  registerWebSocketServer(server);
  const unsubscribeFromInterviewEvents = await subscribeToInterviewEvents((event) => {
    broadcastInterviewEvent(event.sessionId, {
      type: event.type,
      payload: event.payload,
    });
  });

  server.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port}`);
    console.log(`WebSocket endpoint ws://localhost:${env.port}/ws/interview/:sessionId`);
  });

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`Received ${signal}. Shutting down API server...`);

    await unsubscribeFromInterviewEvents();
    await closeInterviewEvaluationQueue();
    await closeRedisConnections();
    await new Promise((resolve) => server.close(resolve));
    await mongoose.disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
