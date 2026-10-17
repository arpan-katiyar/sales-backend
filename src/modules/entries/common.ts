import type { Request } from 'express';

import { AppError } from '../../common/errors/app-error.js';

export const ACTIVE_STATUS = 1;
export const INACTIVE_STATUS = 2;
export const BOOLEAN_CONFIG = 2;

export const PAYMENT_TYPES = ['NEFT_RTGS', 'UPI', 'CASH', 'CHEQUE'] as const;
export const DRAW_TYPES = ['DRAW', 'CHEQUE'] as const;

const PAYMENT_TO_CODE: Record<(typeof PAYMENT_TYPES)[number], number> = {
  NEFT_RTGS: 1,
  UPI: 2,
  CASH: 3,
  CHEQUE: 4,
};

const DRAW_TO_CODE: Record<(typeof DRAW_TYPES)[number], number> = {
  DRAW: 1,
  CHEQUE: 2,
};

export type PaymentType = (typeof PAYMENT_TYPES)[number];
export type DrawType = (typeof DRAW_TYPES)[number];

export type UploadedFile = {
  fieldname: string;
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type StoredFile = {
  key: string;
  publicUrl: string;
  originalFileName: string;
};

export function apiSuccess<T>(message: string, data: T | null = null) {
  return { success: true as const, message, data };
}

export function databaseError(): AppError {
  return new AppError(1028, 'Something went wrong. Please try again later.', 500);
}

export function isDatabaseError(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current && typeof current === 'object'; depth += 1) {
    if ('code' in current && typeof current.code === 'string') {
      if (current.code.startsWith('ER_') || current.code === 'ECONNREFUSED' || current.code === 'ECONNRESET' || current.code === 'PROTOCOL_CONNECTION_LOST' || current.code === 'ETIMEDOUT') {
        return true;
      }
    }
    current = 'cause' in current ? current.cause : undefined;
  }
  return false;
}

export function rethrow(error: unknown): never {
  if (error instanceof AppError) {
    throw error;
  }
  if (isDatabaseError(error)) {
    throw databaseError();
  }
  throw error instanceof Error ? error : new Error('Unexpected error');
}

export function requireUserId(req: Request): number {
  if (!req.user) {
    throw new AppError(401, 'Missing or invalid session', 401);
  }
  return req.user.userId;
}

export function auditStamp(userId: number, now = new Date()) {
  return {
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    updatedBy: userId,
  };
}

export function touchStamp(userId: number, now = new Date()) {
  return {
    updatedAt: now,
    updatedBy: userId,
  };
}

export function springPage<T>(content: T[], pageIndex: number, size: number, totalElements: number) {
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
  return {
    content,
    page: pageIndex,
    size,
    totalElements,
    totalPages,
    last: totalPages === 0 || pageIndex >= totalPages - 1,
  };
}

export function assertPage(page: number, size: number, clampPage: boolean): number {
  const pageIndex = clampPage ? Math.max(page, 0) : page;
  if (pageIndex < 0 || size < 1) {
    throw new Error('Page index must not be less than zero');
  }
  return pageIndex;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function optionalDate(value: unknown): string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value !== 'string' || !isIsoDate(value)) {
    throw new Error('Invalid date');
  }
  return value;
}

export function requiredDate(value: unknown, message: string): string {
  if (value == null || value === '') {
    throw new AppError(400, message);
  }
  if (typeof value !== 'string' || !isIsoDate(value)) {
    throw new Error('Invalid date');
  }
  return value;
}

export function todayIso(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function paymentCode(name: PaymentType): number {
  return PAYMENT_TO_CODE[name];
}

export function paymentName(code: number | null): PaymentType | null {
  if (code == null) {
    return null;
  }
  const match = PAYMENT_TYPES.find((name) => PAYMENT_TO_CODE[name] === code);
  if (!match) {
    throw new Error('Unknown payment type');
  }
  return match;
}

export function drawCode(name: DrawType): number {
  return DRAW_TO_CODE[name];
}

export function drawName(code: number | null): DrawType | null {
  if (code == null) {
    return null;
  }
  const match = DRAW_TYPES.find((name) => DRAW_TO_CODE[name] === code);
  if (!match) {
    throw new Error('Unknown draw type');
  }
  return match;
}

export function asPayment(value: unknown): PaymentType | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'string' || !PAYMENT_TYPES.includes(value as PaymentType)) {
    throw new Error('Invalid payment type');
  }
  return value as PaymentType;
}

export function asDraw(value: unknown): DrawType | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'string' || !DRAW_TYPES.includes(value as DrawType)) {
    throw new Error('Invalid draw type');
  }
  return value as DrawType;
}

export function asLong(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^-?\d+$/.test(value)) {
    return Number(value);
  }
  throw new Error('Invalid integer amount');
}

export function countValue(value: unknown): number {
  if (typeof value === 'bigint') {
    return Number(value);
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    return Number(value);
  }
  return 0;
}

export function nextBillNumber(lastBillNumber: string | null | undefined): string {
  let nextNumber = 1;
  if (lastBillNumber != null && lastBillNumber.startsWith('INV-')) {
    const numberPart = lastBillNumber.slice(4);
    if (/^\d+$/.test(numberPart)) {
      const parsed = Number.parseInt(numberPart, 10);
      nextNumber = parsed > 2_147_483_647 ? 1 : parsed + 1;
    }
  }
  return `INV-${String(nextNumber).padStart(5, '0')}`;
}

export function billImageShouldRemove(existingKeys: string[] | null, objectKey: string): boolean {
  return existingKeys != null && !existingKeys.includes(objectKey);
}

export function purchaseImageShouldRemove(existingKeys: string[] | null, objectKey: string): boolean {
  return existingKeys == null || !existingKeys.includes(objectKey);
}

export function readJsonPart(req: Request, name: string): unknown {
  const files = uploadedFiles(req);
  const file = files.find((item) => item.fieldname === name);
  const raw = file ? file.buffer.toString('utf8') : bodyField(req, name);
  if (typeof raw !== 'string' || raw.trim() === '') {
    throw new Error(`Missing ${name}`);
  }
  return JSON.parse(raw) as unknown;
}

export function filesForField(req: Request, fieldName: string): UploadedFile[] {
  return uploadedFiles(req).filter((file) => file.fieldname === fieldName);
}

export function filesByPrefix(req: Request, prefix: string): UploadedFile[] {
  return uploadedFiles(req).filter((file) => file.fieldname.startsWith(prefix));
}

function uploadedFiles(req: Request): UploadedFile[] {
  if (!Array.isArray(req.files)) {
    return [];
  }
  return req.files.flatMap((file) => {
    if (
      typeof file !== 'object' ||
      file == null ||
      !('fieldname' in file) ||
      !('buffer' in file) ||
      !('originalname' in file) ||
      !Buffer.isBuffer(file.buffer)
    ) {
      return [];
    }
    return [
      {
        fieldname: String(file.fieldname),
        originalname: String(file.originalname),
        mimetype: 'mimetype' in file ? String(file.mimetype) : '',
        size: 'size' in file && typeof file.size === 'number' ? file.size : file.buffer.length,
        buffer: file.buffer,
      },
    ];
  });
}

function bodyField(req: Request, name: string): unknown {
  if (!req.body || typeof req.body !== 'object') {
    return undefined;
  }
  return (req.body as Record<string, unknown>)[name];
}

export function validationError(messages: string[]): AppError {
  return new AppError(400, messages.join('; '));
}
