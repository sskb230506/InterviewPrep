import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

function extractBearerToken(req) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  return token;
}

export async function requireAuth(req, res, next) {
  const token = extractBearerToken(req);

  if (!token) {
    next(new AppError('Unauthorized', 401));
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret);
    const user = await User.findById(payload.sub).lean();

    if (!user) {
      next(new AppError('Unauthorized', 401));
      return;
    }

    req.user = {
      ...user,
      userId: user._id.toString(),
    };
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}
