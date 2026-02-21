import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import { registerWebSocketServer } from './websocket.js';

async function bootstrap() {
  await connectDatabase(env.mongoUri);

  const app = createApp();
  const server = http.createServer(app);
  registerWebSocketServer(server);

  server.listen(env.port, () => {
    console.log(`Backend running on http://localhost:${env.port}`);
    console.log(`WebSocket endpoint ws://localhost:${env.port}/ws/interview/:sessionId`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to start backend', error);
  process.exit(1);
});
