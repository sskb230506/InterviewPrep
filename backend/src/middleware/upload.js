import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const rootUploadDir = path.resolve(process.cwd(), env.uploadDir);
const resumeDir = path.join(rootUploadDir, 'resumes');
const audioDir = path.join(rootUploadDir, 'audio');

for (const dir of [rootUploadDir, resumeDir, audioDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const resumeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, resumeDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin';
    cb(null, `resume-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, audioDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `audio-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

function resumeFileFilter(_req, file, cb) {
  const allowedMimeTypes = new Set([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]);

  if (!allowedMimeTypes.has(file.mimetype)) {
    cb(new AppError('Only PDF and DOC/DOCX resumes are supported', 400));
    return;
  }

  cb(null, true);
}

export const resumeUpload = multer({
  storage: resumeStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: resumeFileFilter,
});

export const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
});
