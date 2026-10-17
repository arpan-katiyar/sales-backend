import { z } from 'zod';

import { AppError } from '../../common/errors/app-error.js';
import { asLong, isIsoDate, optionalDate, validationError } from '../entries/common.js';

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

export const retailSearchQuerySchema = z.object({
  fromDate: optionalQueryDate,
  toDate: optionalQueryDate,
  customerId: optionalQueryInt,
  staffId: optionalQueryInt,
  supplierId: optionalQueryInt,
  page: z.coerce.number().int().default(0),
  size: z.coerce.number().int().default(10),
});

export const retailIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const retailPathIdParamSchema = z.object({
  retailId: z.coerce.number().int().positive(),
});

export const retailSupplierParamSchema = z.object({
  retailSupplierId: z.coerce.number().int().positive(),
});

export type RetailSupplierBody = {
  supplierId: number;
  totalAmount: number | null;
  depositAmount: number | null;
};

export type RetailCreateBody = {
  name: string;
  date: string;
  referredByCustomerId: number | null;
  staffId: number | null;
  suppliers: RetailSupplierBody[];
  commission: string | null;
};

export type RetailUpdateBody = {
  name: string;
  date: string;
  referredByCustomerId: number | null;
  staffId: number | null;
  commission: string | null;
};

export type RetailSupplierAddBody = {
  retailId: number;
  supplierId: number;
  totalAmount: number | null;
  depositAmount: number | null;
  depositDate: string | null;
};

export type DepositBody = {
  deposits: {
    retailSupplierId: number;
    depositDate: string | null;
    amount: number | null;
  }[];
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid payload');
  }
  return value as Record<string, unknown>;
}

function optionalInt(value: unknown): number | null {
  if (value == null || value === '') {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error('Invalid integer');
  }
  return value;
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

function retailName(value: unknown, messages: string[]): string {
  if (typeof value !== 'string' || value.trim() === '') {
    messages.push('Retail name is required');
    return '';
  }
  if (value.length > 255) {
    messages.push('Retail name cannot exceed 255 characters');
  }
  return value;
}

export function parseRetailCreate(value: unknown): RetailCreateBody {
  const body = asRecord(value);
  const messages: string[] = [];
  const name = retailName(body.name, messages);
  if (body.date == null || body.date === '') {
    messages.push('Date is required');
  } else if (typeof body.date !== 'string' || !isIsoDate(body.date)) {
    throw new Error('Invalid date');
  }
  if (messages.length > 0) {
    throw validationError(messages);
  }
  if (!Array.isArray(body.suppliers)) {
    throw new Error('Missing suppliers');
  }
  return {
    name,
    date: body.date as string,
    referredByCustomerId: optionalInt(body.referredByCustomerId),
    staffId: optionalInt(body.staffId),
    commission: text(body.commission),
    suppliers: body.suppliers.map((supplier) => {
      const row = asRecord(supplier);
      const supplierId = optionalInt(row.supplierId);
      if (supplierId == null) {
        throw new Error('Missing supplier');
      }
      return {
        supplierId,
        totalAmount: asLong(row.totalAmount),
        depositAmount: asLong(row.depositAmount),
      };
    }),
  };
}

export function parseRetailUpdate(value: unknown): RetailUpdateBody {
  const body = asRecord(value);
  const messages: string[] = [];
  const name = retailName(body.name, messages);
  if (body.date == null || body.date === '') {
    messages.push('Date is required');
  } else if (typeof body.date !== 'string' || !isIsoDate(body.date)) {
    throw new Error('Invalid date');
  }
  if (messages.length > 0) {
    throw validationError(messages);
  }
  return {
    name,
    date: body.date as string,
    referredByCustomerId: optionalInt(body.referredByCustomerId),
    staffId: optionalInt(body.staffId),
    commission: text(body.commission),
  };
}

export function parseRetailSupplierAdd(value: unknown): RetailSupplierAddBody {
  const body = asRecord(value);
  const messages: string[] = [];
  if (body.retailId == null) {
    messages.push('Retail Id is required');
  }
  if (body.supplierId == null) {
    messages.push('Supplier Id is required');
  }
  if (messages.length > 0) {
    throw validationError(messages);
  }
  const retailId = optionalInt(body.retailId);
  const supplierId = optionalInt(body.supplierId);
  if (retailId == null || supplierId == null) {
    throw new Error('Invalid integer');
  }
  return {
    retailId,
    supplierId,
    totalAmount: asLong(body.totalAmount),
    depositAmount: asLong(body.depositAmount),
    depositDate: optionalDate(body.depositDate),
  };
}

export function parseRetailSupplierUpdate(value: unknown): { totalAmount: number } {
  const body = asRecord(value);
  if (body.totalAmount == null) {
    throw validationError(['Total Amount is required']);
  }
  const totalAmount = asLong(body.totalAmount);
  if (totalAmount == null) {
    throw new Error('Invalid amount');
  }
  return { totalAmount };
}

export function parseDeposits(value: unknown): DepositBody {
  const body = asRecord(value);
  if (!Array.isArray(body.deposits) || body.deposits.length === 0) {
    throw validationError(['Deposits list cannot be empty']);
  }
  return {
    deposits: body.deposits.map((deposit) => {
      const row = asRecord(deposit);
      const retailSupplierId = optionalInt(row.retailSupplierId);
      if (retailSupplierId == null) {
        throw new Error('Missing retail supplier');
      }
      return {
        retailSupplierId,
        depositDate: optionalDate(row.depositDate),
        amount: asLong(row.amount),
      };
    }),
  };
}

export function retailerNotFound(id: number): AppError {
  return new AppError(1030, `Retailer not found  : Retail Id = ${id}`);
}

export function retailSupplierNotFound(id: number): AppError {
  return new AppError(1031, `Retail Supplier not found : Retail Supplier Id = ${id}`);
}
