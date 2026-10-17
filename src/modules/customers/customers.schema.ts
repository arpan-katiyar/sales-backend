import { z } from 'zod';

const requiredName = z
  .string({
    required_error: 'Customer name is required',
    invalid_type_error: 'Customer name is required',
  })
  .refine((value) => value.trim().length > 0, 'Customer name is required');

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

export const addCustomerSchema = z.object({
  customerName: requiredName,
  email: optionalText,
  customerGroup: optionalText,
  customerGstNo: optionalText,
  customerMsme: msme,
  referencedBy: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  state: optionalText,
  city: optionalText,
  pinCode: optionalText,
  remark: optionalText,
  contacts: z.array(contactSchema).nullable().optional(),
  bankDetails: z.array(bankSchema).nullable().optional(),
  preferredTransportIds: z.array(z.number().int()).nullable().optional(),
});

export const updateCustomerSchema = z.object({
  customerName: optionalText,
  email: optionalText,
  groupName: optionalText,
  gstNo: optionalText,
  referencedBy: optionalText,
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

export const deleteCustomerSchema = z.object({
  customerCode: z.string().nullable().optional(),
});

export const customerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const customerPageQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().positive().default(8),
});

export const customerSearchQuerySchema = z.object({
  keyword: z.string().optional().default(''),
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().positive().default(10),
});

export const customerFilterQuerySchema = z.object({
  filter: z.enum(['ALL', 'ACTIVE', 'INACTIVE']).default('ACTIVE'),
});
