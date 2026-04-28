import { User } from '../models/User.js';
import { ALLOWED_RESUME_MIME_TYPES } from '../middleware/upload.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';
import { extractSkillsFromResumeName } from '../services/resumeService.js';
import {
  canUseDirectUploads,
  confirmDirectUpload,
  createDirectUploadTarget,
  storeUploadedFile,
} from '../services/storageService.js';
import { createUploadToken, verifyUploadToken } from '../services/uploadTokenService.js';

function validateResumeFile({ fileName, mimeType, size }) {
  const normalizedMimeType = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  if (!fileName || !mimeType || !size) {
    throw new AppError('fileName, mimeType, and size are required', 400);
  }

  if (!ALLOWED_RESUME_MIME_TYPES.has(normalizedMimeType)) {
    throw new AppError('Only PDF and DOC/DOCX resumes are supported', 400);
  }

  if (Number(size) > 10 * 1024 * 1024) {
    throw new AppError('Resume file size should be under 10MB', 400);
  }
}

async function persistResumeUpload({ userId, fileName, storedResume }) {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const resumeId = `resume_${Date.now()}`;
  const skills = extractSkillsFromResumeName(fileName, user.defaultRole);

  user.resume = {
    resumeId,
    fileName,
    filePath: storedResume.path || storedResume.key,
    fileUrl: storedResume.url,
    storageKey: storedResume.key,
    storageProvider: storedResume.provider,
    status: 'parsed',
    skills,
    uploadedAt: new Date(),
  };

  await user.save();

  return {
    resumeId,
    status: 'parsed',
    skills,
    fileName,
    storageProvider: storedResume.provider,
    directUpload: storedResume.provider === 's3' && env.directUploadsEnabled,
  };
}

export async function createResumeUploadTarget(req, res) {
  const { fileName, mimeType, size } = req.body;
  const normalizedMimeType = String(mimeType || '')
    .split(';')[0]
    .trim()
    .toLowerCase();

  validateResumeFile({ fileName, mimeType, size });

  if (!canUseDirectUploads()) {
    res.json({ enabled: false });
    return;
  }

  const target = await createDirectUploadTarget({
    category: 'resumes',
    prefix: 'resume',
    fileName,
    mimeType: normalizedMimeType,
    metadata: {
      userId: String(req.user._id),
      purpose: 'resume',
    },
  });

  const uploadToken = createUploadToken({
    kind: 'resume',
    userId: String(req.user._id),
    key: target.object.key,
    fileName: target.object.fileName,
    mimeType: normalizedMimeType,
    size: Number(size),
  });

  res.json({
    enabled: true,
    uploadUrl: target.uploadUrl,
    method: target.method,
    headers: target.headers,
    uploadToken,
    storageKey: target.object.key,
    fileUrl: target.object.url,
  });
}

export async function completeResumeUpload(req, res) {
  const { uploadToken } = req.body;

  if (!uploadToken) {
    throw new AppError('uploadToken is required', 400);
  }

  const payload = verifyUploadToken(uploadToken);

  if (payload.kind !== 'resume' || payload.userId !== String(req.user._id)) {
    throw new AppError('Invalid direct upload token', 400);
  }

  const storedResume = await confirmDirectUpload({
    key: payload.key,
    fileName: payload.fileName,
    expectedSize: payload.size,
    expectedMimeType: payload.mimeType,
  });

  const result = await persistResumeUpload({
    userId: req.user._id,
    fileName: storedResume.fileName,
    storedResume,
  });

  res.json(result);
}

export async function uploadResume(req, res) {
  if (!req.file) {
    throw new AppError('Resume file is required', 400);
  }

  const storedResume = await storeUploadedFile({
    file: req.file,
    category: 'resumes',
    prefix: 'resume',
  });
  const result = await persistResumeUpload({
    userId: req.user._id,
    fileName: storedResume.fileName,
    storedResume,
  });

  res.json(result);
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
