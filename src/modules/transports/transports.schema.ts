import { z } from 'zod';

const requiredName = z
  .string({
    required_error: 'Transport name is required',
    invalid_type_error: 'Transport name is required',
  })
  .refine((value) => value.trim().length > 0, 'Transport name is required');

const optionalText = z.string().nullable().optional();

const contactSchema = z.object({
  contactPerson: optionalText,
  contactNumber: optionalText,
  type: optionalText,
});

export const transportBodySchema = z.object({
  name: requiredName,
  email: optionalText,
  gstNo: optionalText,
  contacts: z.array(contactSchema).nullable().optional(),
  state: optionalText,
  city: optionalText,
  pincode: optionalText,
  addressLine1: optionalText,
  addressLine2: optionalText,
  status: z.enum(['ACTIVE', 'INACTIVE', 'DELETE']).nullable().optional(),
});

export const transportIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const transportPageQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().positive().default(5),
});

export const transportSearchQuerySchema = z.object({
  keyword: z.string().optional().default(''),
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().positive().default(10),
});
