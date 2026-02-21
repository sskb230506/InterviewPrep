import path from 'path';
import { User } from '../models/User.js';
import { AppError } from '../utils/errors.js';
import { extractSkillsFromResumeName } from '../services/resumeService.js';

export async function uploadResume(req, res) {
  if (!req.file) {
    throw new AppError('Resume file is required', 400);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const resumeId = `resume_${Date.now()}`;
  const fileName = req.file.originalname;
  const skills = extractSkillsFromResumeName(fileName, user.defaultRole);

  user.resume = {
    resumeId,
    fileName,
    filePath: path.normalize(req.file.path),
    status: 'parsed',
    skills,
    uploadedAt: new Date(),
  };

  await user.save();

  res.json({
    resumeId,
    status: 'parsed',
    skills,
    fileName,
  });
}

export async function updateResumeSkills(req, res) {
  const { skills } = req.body;

  if (!Array.isArray(skills)) {
    throw new AppError('skills must be an array', 400);
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  user.resume = {
    ...user.resume,
    status: user.resume?.status || 'parsed',
    skills: skills.map((value) => String(value).trim()).filter(Boolean),
    uploadedAt: user.resume?.uploadedAt || new Date(),
  };

  await user.save();

  res.json({ skills: user.resume.skills });
}
