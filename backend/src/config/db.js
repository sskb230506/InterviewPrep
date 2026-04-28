import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(mongoUri) {
  mongoose.set('strictQuery', true);
  await mongoose.connect(mongoUri, {
    maxPoolSize: env.mongoMaxPoolSize,
    minPoolSize: env.mongoMinPoolSize,
    maxIdleTimeMS: env.mongoMaxIdleTimeMs,
    serverSelectionTimeoutMS: env.mongoServerSelectionTimeoutMs,
  });
}

export function isDatabaseReady() {
  return mongoose.connection.readyState === 1;
}
