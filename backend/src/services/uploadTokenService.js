import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const TOKEN_AUDIENCE = 'direct-upload';
const TOKEN_ISSUER = 'ai-interview-prep';

export function createUploadToken(payload) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.directUploadTokenTtl,
    audience: TOKEN_AUDIENCE,
    issuer: TOKEN_ISSUER,
  });
}

export function verifyUploadToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret, {
      audience: TOKEN_AUDIENCE,
      issuer: TOKEN_ISSUER,
    });
  } catch {
    throw new AppError('Invalid or expired direct upload token', 400);
  }
}
