import { z } from 'zod';

const requiredName = z
  .string({
    required_error: 'Staff name is required',
    invalid_type_error: 'Staff name is required',
  })
  .refine((value) => value.trim().length > 0, 'Staff name is required');

const joiningDate = z
  .string({
    required_error: 'Joining date is required',
    invalid_type_error: 'Joining date is required',
  })
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Joining date is required');

export const addStaffSchema = z.object({
  staffName: requiredName,
  phone: z.string().nullable().optional(),
  joiningDate,
});

export const updateStaffSchema = z.object({
  staffName: requiredName,
  phone: z.string().nullable().optional(),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const deleteStaffSchema = z.object({
  staffId: z
    .number({
      required_error: 'Staff Id is required.',
      invalid_type_error: 'Staff Id is required.',
    })
    .int(),
});

export const staffIdParamSchema = z.object({
  staffId: z.coerce.number().int().positive(),
});

export const staffPageQuerySchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  size: z.coerce.number().int().positive().default(8),
});

export const staffSearchQuerySchema = staffPageQuerySchema.extend({
  keyword: z.string().optional().default(''),
});
