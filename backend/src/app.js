import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { env } from './config/env.js';
import { isDatabaseReady } from './config/db.js';
import apiRoutes from './routes/index.js';
import { shouldServeLocalUploads } from './services/storageService.js';
import { getRedisStatus } from './services/queue/redisConnection.js';
import { errorHandler, notFoundHandler } from './utils/errors.js';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true,
    }),
  );
  app.use(morgan('dev'));
  app.use(express.json({ limit: '4mb' }));
  app.use(express.urlencoded({ extended: true, limit: '4mb' }));

  app.get('/health/live', (_req, res) => {
    res.json({
      ok: true,
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/health/ready', (_req, res) => {
    const databaseReady = isDatabaseReady();
    const redisStatus = getRedisStatus();
    const redisReady = env.evaluationMode === 'inline' || redisStatus === 'ready';
    const ok = databaseReady && redisReady;

    res.status(ok ? 200 : 503).json({
      ok,
      database: databaseReady ? 'ready' : 'not_ready',
      redis: env.evaluationMode === 'inline' ? 'disabled' : redisStatus,
      storage: env.storageDriver,
      evaluationMode: env.evaluationMode,
    });
  });

  if (shouldServeLocalUploads()) {
    app.use('/uploads', express.static(path.resolve(process.cwd(), env.uploadDir)));
  }

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
