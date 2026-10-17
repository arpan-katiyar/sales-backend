import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

import { AppError } from '../errors/app-error.js';
import { env } from '../../config/env.js';
import type { StoredFile, UploadedFile } from '../../modules/entries/common.js';

const FILE_STORAGE_FAILED = new AppError(1015, 'File storage failed');

let client: S3Client | undefined;

function storageClient(): S3Client {
  if (!env.S3_ENDPOINT || !env.S3_BUCKET || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
    throw FILE_STORAGE_FAILED;
  }
  client ??= new S3Client({
    region: env.S3_REGION || 'us-east-1',
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });
  return client;
}

function publicUrl(key: string): string {
  const endpoint = env.S3_ENDPOINT.replace(/\/$/, '');
  return `${endpoint}/${env.S3_BUCKET}/${key}`;
}

function objectKey(originalName: string, folder: string, now = new Date()): string {
  const dot = originalName.lastIndexOf('.');
  if (dot < 0) {
    throw FILE_STORAGE_FAILED;
  }
  const extension = originalName.slice(dot);
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  const millis = String(now.getMilliseconds()).padStart(3, '0');
  return `${year}/${month}/${folder}/${year}${month}${day}_${hours}${minutes}${seconds}${millis}${extension}`;
}

export async function storeFile(file: UploadedFile, folder: string): Promise<StoredFile> {
  try {
    const key = objectKey(file.originalname, folder);
    await storageClient().send(
      new PutObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype || undefined,
      }),
    );
    return {
      key,
      publicUrl: publicUrl(key),
      originalFileName: file.originalname,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw FILE_STORAGE_FAILED;
  }
}

export async function deleteStoredFile(key: string): Promise<void> {
  try {
    await storageClient().send(
      new DeleteObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: key,
      }),
    );
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw FILE_STORAGE_FAILED;
  }
}

export async function uploadFiles(files: UploadedFile[], folder: string): Promise<StoredFile[]> {
  const uploaded: StoredFile[] = [];
  for (const file of files) {
    try {
      uploaded.push(await storeFile(file, folder));
    } catch {
      throw new AppError(1014, 'Failed to upload bill image');
    }
  }
  return uploaded;
}
