import { z } from 'zod';

import { isIsoDate, optionalDate } from '../entries/common.js';

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

export const purchaseSearchQuerySchema = z.object({
  fromDate: optionalQueryDate,
  toDate: optionalQueryDate,
  supplierId: optionalQueryInt,
  customerId: optionalQueryInt,
  staffId: optionalQueryInt,
  page: z.coerce.number().int().default(0),
  size: z.coerce.number().int().default(7),
});

export const purchaseDownloadQuerySchema = purchaseSearchQuerySchema.omit({ page: true, size: true });

export const purchaseIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type PurchaseSupplierBody = {
  supplierId: number | null;
  remarks: string | null;
};

export type PurchaseAddBody = {
  date: string | null;
  staffId: number | null;
  customerId: number | null;
  suppliers: PurchaseSupplierBody[];
};

export type PurchaseUpdateBody = {
  date: string | null;
  staffId: number | null;
  customerId: number | null;
  supplierId: number | null;
  remarks: string | null;
  existingImageKeys: string[] | null;
};

export type CopySuppliersBody = {
  fromDate: string | null;
  toDate: string | null;
  supplierId: number | null;
  customerId: number | null;
  staffId: number | null;
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

export function parsePurchaseAdd(value: unknown): PurchaseAddBody {
  const body = asRecord(value);
  if (!Array.isArray(body.suppliers)) {
    throw new Error('Missing suppliers');
  }
  return {
    date: optionalDate(body.date),
    staffId: optionalInt(body.staffId),
    customerId: optionalInt(body.customerId),
    suppliers: body.suppliers.map((supplier) => {
      const row = asRecord(supplier);
      return {
        supplierId: optionalInt(row.supplierId),
        remarks: text(row.remarks),
      };
    }),
  };
}

export function parsePurchaseUpdate(value: unknown): PurchaseUpdateBody {
  const body = asRecord(value);
  return {
    date: optionalDate(body.date),
    staffId: optionalInt(body.staffId),
    customerId: optionalInt(body.customerId),
    supplierId: optionalInt(body.supplierId),
    remarks: text(body.remarks),
    existingImageKeys: imageKeys(body.existingImageKeys),
  };
}

export function parseCopySuppliers(value: unknown): CopySuppliersBody {
  const body = asRecord(value);
  return {
    fromDate: optionalDate(body.fromDate),
    toDate: optionalDate(body.toDate),
    supplierId: optionalInt(body.supplierId),
    customerId: optionalInt(body.customerId),
    staffId: optionalInt(body.staffId),
  };
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
