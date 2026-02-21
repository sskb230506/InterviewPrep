import { AppError } from '../utils/errors.js';

export function requireFields(payload, fields) {
  for (const field of fields) {
    if (payload[field] === undefined || payload[field] === null || payload[field] === '') {
      throw new AppError(`Missing required field: ${field}`, 400);
    }
  }
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
