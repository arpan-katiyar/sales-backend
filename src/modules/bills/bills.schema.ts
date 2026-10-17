import { z } from 'zod';

import { isIsoDate, optionalDate, validationError } from '../entries/common.js';

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

export const billSearchQuerySchema = z.object({
  fromDate: optionalQueryDate,
  toDate: optionalQueryDate,
  supplierId: optionalQueryInt,
  customerId: optionalQueryInt,
  page: z.coerce.number().int().default(0),
  size: z.coerce.number().int().default(7),
});

export const billIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const billNumberParamSchema = z.object({
  billNumber: z.string().min(1),
});

export type BillItemBody = {
  pieces: number;
  grossAmount: number | string | null;
  discountPercent: number | string | null;
  discountAmount: number | string | null;
  addOnAmount: number | string | null;
  ecrAmount: number | string | null;
  gstPercent: number | string | null;
  gstAmount: number | string | null;
};

export type BillAddBody = {
  date: string;
  receivedDate: string | null;
  order: string;
  supplierId: number;
  customerId: number;
  transportName: string | null;
  lrNumber: string | null;
  remarks: string | null;
  taxableValue: number | string | null;
  billAmount: number | string | null;
  billItems: BillItemBody[];
};

export type BillUpdateBody = {
  date: string;
  receivedDate: string | null;
  order: string | null;
  supplierId: number | null;
  customerId: number | null;
  transport: string | null;
  lrNumber: string | null;
  remarks: string | null;
  taxableValue: number | string | null;
  billAmount: number | string | null;
  billItems: BillItemBody[];
  existingImageKeys: string[] | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid payload');
  }
  return value as Record<string, unknown>;
}

function nullableText(value: unknown): string | null {
  if (value == null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error('Invalid text');
  }
  return value;
}

function amount(value: unknown): number | string | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value === 'number' || typeof value === 'string') {
    return value;
  }
  throw new Error('Invalid amount');
}

function item(value: unknown): BillItemBody {
  const row = asRecord(value);
  const pieces = row.pieces == null ? 0 : row.pieces;
  if (typeof pieces !== 'number' || !Number.isInteger(pieces)) {
    throw new Error('Invalid pieces');
  }
  return {
    pieces,
    grossAmount: amount(row.grossAmount),
    discountPercent: amount(row.discountPercent),
    discountAmount: amount(row.discountAmount),
    addOnAmount: amount(row.addOnAmount),
    ecrAmount: amount(row.ecrAmount),
    gstPercent: amount(row.gstPercent),
    gstAmount: amount(row.gstAmount),
  };
}

export function parseBillAdd(value: unknown): BillAddBody {
  const body = asRecord(value);
  const messages: string[] = [];
  if (body.date == null || body.date === '') {
    messages.push('Date must not be empty');
  } else if (typeof body.date !== 'string' || !isIsoDate(body.date)) {
    throw new Error('Invalid date');
  }
  if (typeof body.order !== 'string' || body.order.trim() === '') {
    messages.push('order is required');
  }
  if (!Array.isArray(body.billItems) || body.billItems.length === 0) {
    messages.push('At least one bill item is required');
  }
  if (messages.length > 0) {
    throw validationError(messages);
  }
  if (body.supplierId === null || body.customerId === null) {
    throw new Error('Invalid party');
  }
  const supplierId = body.supplierId === undefined ? 0 : body.supplierId;
  const customerId = body.customerId === undefined ? 0 : body.customerId;
  if (typeof supplierId !== 'number' || typeof customerId !== 'number') {
    throw new Error('Invalid party');
  }
  return {
    date: body.date as string,
    receivedDate: optionalDate(body.receivedDate),
    order: body.order as string,
    supplierId,
    customerId,
    transportName: nullableText(body.transportName),
    lrNumber: nullableText(body.lrNumber),
    remarks: nullableText(body.remarks),
    taxableValue: amount(body.taxableValue),
    billAmount: amount(body.billAmount),
    billItems: (body.billItems as unknown[]).map(item),
  };
}

export function parseBillUpdate(value: unknown): BillUpdateBody {
  const body = asRecord(value);
  if (typeof body.date !== 'string' || !isIsoDate(body.date)) {
    throw new Error('Invalid date');
  }
  if (!Array.isArray(body.billItems)) {
    throw new Error('Invalid bill items');
  }
  const received = body.receivedDate;
  if (typeof received === 'string' && received.trim() !== '' && !isIsoDate(received.trim())) {
    throw new Error('Invalid date');
  }
  return {
    date: body.date,
    receivedDate: typeof received === 'string' ? received : null,
    order: nullableText(body.order),
    supplierId: body.supplierId == null ? null : asInt(body.supplierId),
    customerId: body.customerId == null ? null : asInt(body.customerId),
    transport: nullableText(body.transport),
    lrNumber: nullableText(body.lrNumber),
    remarks: nullableText(body.remarks),
    taxableValue: amount(body.taxableValue),
    billAmount: amount(body.billAmount),
    billItems: body.billItems.map(item),
    existingImageKeys: imageKeys(body.existingImageKeys),
  };
}

function asInt(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('Invalid integer');
  }
  return value;
}

function imageKeys(value: unknown): string[] | null {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('Invalid image keys');
  }
  return value;
}

