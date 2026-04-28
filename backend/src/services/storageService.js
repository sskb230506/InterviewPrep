import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

let s3Client;

function sanitizeFileName(fileName = 'upload.bin') {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function buildStorageKey(category, prefix, fileName) {
  const extension = path.extname(fileName) || '.bin';
  return path.posix.join(
    category,
    `${prefix}-${Date.now()}-${crypto.randomUUID()}${extension}`,
  );
}

function buildLocalFileMetadata(key, file) {
  const normalizedKey = key.replace(/\\/g, '/');
  const absolutePath = path.resolve(process.cwd(), env.uploadDir, normalizedKey);

  return {
    provider: 'local',
    key: normalizedKey,
    path: absolutePath,
    url: new URL(`/uploads/${normalizedKey}`, env.publicServerUrl).toString(),
    fileName: sanitizeFileName(file.originalname),
    mimeType: file.mimetype,
    size: file.size,
  };
}

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: env.s3Region,
      endpoint: env.s3Endpoint || undefined,
      forcePathStyle: env.s3ForcePathStyle,
    });
  }

  return s3Client;
}

function buildS3Url(key) {
  if (env.s3PublicBaseUrl) {
    return new URL(key, `${env.s3PublicBaseUrl.replace(/\/$/, '')}/`).toString();
  }

  if (env.s3Endpoint) {
    return new URL(`/${env.s3Bucket}/${key}`, env.s3Endpoint).toString();
  }

  return `https://${env.s3Bucket}.s3.${env.s3Region}.amazonaws.com/${key}`;
}

export function shouldServeLocalUploads() {
  return env.storageDriver === 'local';
}

export function canUseDirectUploads() {
  return env.storageDriver === 's3' && env.directUploadsEnabled;
}

export async function createDirectUploadTarget({
  category,
  prefix,
  fileName,
  mimeType,
  metadata = {},
}) {
  if (!canUseDirectUploads()) {
    return { enabled: false };
  }

  const safeName = sanitizeFileName(fileName || `${prefix}.bin`);
  const key = buildStorageKey(category, prefix, safeName);
  const command = new PutObjectCommand({
    Bucket: env.s3Bucket,
    Key: key,
    ContentType: mimeType,
    Metadata: metadata,
  });
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: env.directUploadUrlExpiresIn,
  });

  return {
    enabled: true,
    uploadUrl,
    method: 'PUT',
    headers: {
      'Content-Type': mimeType,
    },
    object: {
      provider: 's3',
      key,
      url: buildS3Url(key),
      fileName: safeName,
      mimeType,
    },
  };
}

export async function confirmDirectUpload({
  key,
  fileName,
  expectedSize = 0,
  expectedMimeType = '',
}) {
  let result;

  try {
    result = await getS3Client().send(
      new HeadObjectCommand({
        Bucket: env.s3Bucket,
        Key: key,
      }),
    );
  } catch {
    throw new AppError('Uploaded object could not be verified in storage', 400);
  }

  const actualSize = Number(result.ContentLength || 0);
  const actualMimeType = result.ContentType || expectedMimeType;

  if (expectedSize && actualSize !== Number(expectedSize)) {
    throw new AppError('Uploaded object size does not match the requested file size', 400);
  }

  if (expectedMimeType && actualMimeType !== expectedMimeType) {
    throw new AppError('Uploaded object content type does not match the requested file type', 400);
  }

  return {
    provider: 's3',
    key,
    path: '',
    url: buildS3Url(key),
    fileName: sanitizeFileName(fileName),
    mimeType: actualMimeType,
    size: actualSize || Number(expectedSize || 0),
  };
}

export async function storeUploadedFile({ file, category, prefix }) {
  if (!file?.buffer) {
    throw new Error('Uploaded file buffer is missing');
  }

  const safeName = sanitizeFileName(file.originalname || `${prefix}.bin`);
  const key = buildStorageKey(category, prefix, safeName);

  if (env.storageDriver === 's3') {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: env.s3Bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    return {
      provider: 's3',
      key,
      path: '',
      url: buildS3Url(key),
      fileName: safeName,
      mimeType: file.mimetype,
      size: file.size,
    };
  }

  const metadata = buildLocalFileMetadata(key, file);
  await fs.mkdir(path.dirname(metadata.path), { recursive: true });
  await fs.writeFile(metadata.path, file.buffer);

  return metadata;
}
