import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { AppError } from '../utils/errors.js';

export async function updateProfile(req, res) {
  const { name, defaultRole } = req.body;

  if (!name || !defaultRole) {
    throw new AppError('name and defaultRole are required', 400);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.name = String(name).trim();
  user.defaultRole = String(defaultRole).trim();

  await user.save();

  res.json({
    name: user.name,
    defaultRole: user.defaultRole,
  });
}

export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new AppError('currentPassword and newPassword are required', 400);
  }

  if (String(newPassword).length < 6) {
    throw new AppError('newPassword must be at least 6 characters', 400);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const valid = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!valid) {
    throw new AppError('Current password is incorrect', 400);
  }

  user.passwordHash = await bcrypt.hash(String(newPassword), 10);
  await user.save();

  res.json({ success: true });
}

export async function deleteAccount(req, res) {
  await Promise.all([
    User.deleteOne({ _id: req.user._id }),
    InterviewSession.deleteMany({ user: req.user._id }),
  ]);

  res.json({ success: true });
}
