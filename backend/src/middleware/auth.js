import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';

export async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');

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

    req.user = user;
    next();
  } catch {
    next(new AppError('Invalid or expired token', 401));
  }
}
