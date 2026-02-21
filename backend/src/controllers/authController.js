import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { isValidEmail, requireFields } from '../middleware/validation.js';

function signToken(userId) {
  return jwt.sign({ sub: userId }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function toUserPayload(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    hasResume: Boolean(user.resume?.fileName),
    defaultRole: user.defaultRole,
  };
}

export async function signup(req, res) {
  const { name, email, password } = req.body;
  requireFields(req.body, ['name', 'email', 'password']);

  if (!isValidEmail(email)) {
    throw new AppError('Invalid email address', 400);
  }

  if (String(password).length < 6) {
    throw new AppError('Password must be at least 6 characters', 400);
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    throw new AppError('User already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name: name.trim(),
    email: email.toLowerCase(),
    passwordHash,
  });

  const token = signToken(user._id.toString());
  res.status(201).json({ token, user: toUserPayload(user) });
}

export async function login(req, res) {
  const { email, password } = req.body;
  requireFields(req.body, ['email', 'password']);

  const user = await User.findOne({ email: String(email).toLowerCase() });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isValid = await bcrypt.compare(String(password), user.passwordHash);
  if (!isValid) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user._id.toString());
  res.json({ token, user: toUserPayload(user) });
}

export async function forgotPassword(req, res) {
  const { email } = req.body;
  requireFields(req.body, ['email']);

  if (!isValidEmail(email)) {
    throw new AppError('Invalid email address', 400);
  }

  res.json({ message: `Reset link sent to ${email}` });
}

export async function me(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json(toUserPayload(user));
}
