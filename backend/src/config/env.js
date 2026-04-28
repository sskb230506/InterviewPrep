import dotenv from 'dotenv';

dotenv.config();

function readNumber(name, fallback) {
  const rawValue = process.env[name];
  if (!rawValue) {
    return fallback;
  }

  const parsed = Number(rawValue);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be a valid number`);
  }

  return parsed;
}

const required = ['MONGO_URI', 'JWT_SECRET'];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const port = readNumber('PORT', 5000);
const storageDriver = process.env.STORAGE_DRIVER || 'local';
const evaluationMode = process.env.EVALUATION_MODE || 'redis';
const directUploadsEnabled = process.env.DIRECT_UPLOADS_ENABLED === 'true';

if (!['local', 's3'].includes(storageDriver)) {
  throw new Error('STORAGE_DRIVER must be either "local" or "s3"');
}

if (!['redis', 'inline'].includes(evaluationMode)) {
  throw new Error('EVALUATION_MODE must be either "redis" or "inline"');
}

if (storageDriver === 's3') {
  for (const key of ['S3_BUCKET', 'AWS_REGION']) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable for S3 storage: ${key}`);
    }
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  publicServerUrl: process.env.PUBLIC_SERVER_URL || `http://localhost:${port}`,
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  mongoMaxPoolSize: readNumber('MONGO_MAX_POOL_SIZE', 20),
  mongoMinPoolSize: readNumber('MONGO_MIN_POOL_SIZE', 5),
  mongoMaxIdleTimeMs: readNumber('MONGO_MAX_IDLE_TIME_MS', 30000),
  mongoServerSelectionTimeoutMs: readNumber('MONGO_SERVER_SELECTION_TIMEOUT_MS', 5000),
  storageDriver,
  evaluationMode,
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  interviewEvaluationQueue:
    process.env.INTERVIEW_EVALUATION_QUEUE || 'interview-answer-evaluations',
  interviewEvaluationConcurrency: readNumber('INTERVIEW_EVALUATION_CONCURRENCY', 4),
  directUploadsEnabled,
  directUploadUrlExpiresIn: readNumber('DIRECT_UPLOAD_URL_EXPIRES_IN', 900),
  directUploadTokenTtl: process.env.DIRECT_UPLOAD_TOKEN_TTL || '15m',
  s3Bucket: process.env.S3_BUCKET || '',
  s3Region: process.env.AWS_REGION || '',
  s3Endpoint: process.env.S3_ENDPOINT || '',
  s3ForcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
  s3PublicBaseUrl: process.env.S3_PUBLIC_BASE_URL || '',
};
