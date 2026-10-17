import { z } from 'zod';

const requiredName = z
  .string({
    required_error: 'Supplier name is required',
    invalid_type_error: 'Supplier name is required',
  })
  .refine((value) => value.trim().length > 0, 'Supplier name is required');

const optionalText = z.string().nullable().optional();
const msme = z.enum(['MICRO', 'SMALL', 'MEDIUM']).nullable().optional();

const contactSchema = z.object({
  contactPerson: optionalText,
  mobileNumber: optionalText,
  type: optionalText,
});

const bankSchema = z.object({
  id: z.number().int().nullable().optional(),
  bankName: optionalText,
  ifscCode: optionalText,
  branchName: optionalText,
  accountName: optionalText,
  accountNumber: optionalText,
});

export const addSupplierSchema = z
  .object({
    supplierName: requiredName,
    email: optionalText,
    referenceBy: optionalText,
    supplierGroup: optionalText,
    supplierGstNo: optionalText,
    supplierMsme: msme,
    commissionScheme: optionalText,
    commissionRate: z
      .number()
      .min(0, 'Commission rate must be positive')
      .nullable()
      .optional(),
    addressLine1: optionalText,
    addressLine2: optionalText,
    state: optionalText,
    city: optionalText,
    pinCode: optionalText,
    remark: optionalText,
    contacts: z.array(contactSchema).nullable().optional(),
    bankDetails: z.array(bankSchema).nullable().optional(),
    preferredTransportIds: z.array(z.number().int()).nullable().optional(),
  })
  .superRefine((value, context) => {
    if (value.preferredTransportIds == null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Preferred transport is required',
        path: ['preferredTransportIds'],
      });
    }
  });

export const updateSupplierSchema = z.object({
  supplierName: optionalText,
  email: optionalText,
  groupName: optionalText,
  gstNo: optionalText,
  commissionScheme: optionalText,
  commissionRate: z.number().nullable().optional(),
  referenceBy: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  state: optionalText,
  city: optionalText,
  pinCode: optionalText,
  msme,
  remark: optionalText,
  contacts: z.array(contactSchema).nullable().optional(),
  bankDetails: z.array(bankSchema).nullable().optional(),
  preferredTransportIds: z.array(z.number().int()).nullable().optional(),
});

export const deleteSupplierSchema = z.object({
  code: z.string().nullable().optional(),
});

export const supplierIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const supplierPageQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().positive().default(8),
});

export const supplierSearchQuerySchema = z.object({
  keyword: z.string().optional().default(''),
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().positive().default(10),
  sortBy: z.string().default('supplierName'),
  sortDir: z.string().default('asc'),
});

export const supplierFilterQuerySchema = z.object({
  filter: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ACTIVE'),
});
