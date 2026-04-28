import multer from 'multer';
import { AppError } from '../utils/errors.js';

export const ALLOWED_RESUME_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/wav',
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'video/webm',
]);

function normalizeMimeType(value = '') {
  return value.split(';')[0].trim().toLowerCase();
}

function resumeFileFilter(_req, file, cb) {
  if (!ALLOWED_RESUME_MIME_TYPES.has(normalizeMimeType(file.mimetype))) {
    cb(new AppError('Only PDF and DOC/DOCX resumes are supported', 400));
    return;
  }

  cb(null, true);
}

function audioFileFilter(_req, file, cb) {
  if (!ALLOWED_AUDIO_MIME_TYPES.has(normalizeMimeType(file.mimetype))) {
    cb(new AppError('Only WebM, WAV, MP3, or MP4 audio recordings are supported', 400));
    return;
  }

  cb(null, true);
}

export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: resumeFileFilter,
});

export const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: audioFileFilter,
});
