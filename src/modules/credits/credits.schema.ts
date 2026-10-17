import { z } from 'zod';

import { AppError } from '../../common/errors/app-error.js';
import {
  asDraw,
  asPayment,
  isIsoDate,
  optionalDate,
  validationError,
} from '../entries/common.js';
import type { DrawType, PaymentType } from '../entries/common.js';

const emptyToUndefined = (value: unknown) =>
  value === '' || value === 'null' || value === 'undefined' ? undefined : value;

const optionalQueryInt = z.preprocess(
  emptyToUndefined,
  z.coerce.number({ invalid_type_error: 'Invalid number' }).int().optional(),
);

const optionalQueryDate = z.preprocess(emptyToUndefined, z.string().optional()).superRefine((value, context) => {
  if (value !== undefined && !isIsoDate(value)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Invalid date' });
  }
});

export const creditSearchQuerySchema = z.object({
  fromDate: optionalQueryDate,
  toDate: optionalQueryDate,
  supplierId: optionalQueryInt,
  customerId: optionalQueryInt,
  page: z.coerce.number().int().default(0),
  size: z.coerce.number().int().default(7),
});

export const creditIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreditAddBody = {
  paymentType: PaymentType;
  billNumber: string | null;
  date: string | null;
  referenceNumber: string | null;
  referenceDate: string;
  receivedAmount: number | null;
  drawType: DrawType | null;
  remark: string | null;
  supplierId: number;
  customerId: number;
  slipNumber: string | null;
};

export type CreditUpdateBody = {
  date: string | null;
  supplierId: number | null;
  customerId: number | null;
  paymentType: PaymentType | null;
  referenceNumber: string | null;
  referenceDate: string | null;
  slipNumber: string | null;
  drawType: DrawType | null;
  receivedAmount: number | null;
  remark: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid payload');
  }
  return value as Record<string, unknown>;
}

function text(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('Invalid text');
  }
  return value;
}

function integer(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('Invalid integer');
  }
  return value;
}

function money(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Invalid amount');
  }
  return value;
}

export function parseCreditAdd(value: unknown): CreditAddBody {
  const body = asRecord(value);
  const messages: string[] = [];
  if (body.paymentType == null) {
    messages.push('Payment type is required');
  }
  if (body.referenceDate == null || body.referenceDate === '') {
    messages.push('Reference date is required');
  }
  if (body.supplierId == null) {
    messages.push('Supplier is required');
  }
  if (body.customerId == null) {
    messages.push('Customer is required');
  }
  if (messages.length > 0) {
    throw validationError(messages);
  }
  const referenceDate = body.referenceDate;
  if (typeof referenceDate !== 'string' || !isIsoDate(referenceDate)) {
    throw new Error('Invalid date');
  }
  return {
    paymentType: asPayment(body.paymentType) as PaymentType,
    billNumber: text(body.billNumber),
    date: optionalDate(body.date),
    referenceNumber: text(body.referenceNumber),
    referenceDate,
    receivedAmount: money(body.receivedAmount),
    drawType: asDraw(body.drawType),
    remark: text(body.remark),
    supplierId: integer(body.supplierId),
    customerId: integer(body.customerId),
    slipNumber: text(body.slipNumber),
  };
}

export function parseCreditUpdate(value: unknown): CreditUpdateBody {
  const body = asRecord(value);
  return {
    date: optionalDate(body.date),
    supplierId: body.supplierId == null ? null : integer(body.supplierId),
    customerId: body.customerId == null ? null : integer(body.customerId),
    paymentType: asPayment(body.paymentType),
    referenceNumber: text(body.referenceNumber),
    referenceDate: optionalDate(body.referenceDate),
    slipNumber: text(body.slipNumber),
    drawType: asDraw(body.drawType),
    receivedAmount: money(body.receivedAmount),
    remark: text(body.remark),
  };
}

export function creditNotFound(id: number): AppError {
  return new AppError(1011, `Credit entry not found for this bill number with id ${id}`);
}
