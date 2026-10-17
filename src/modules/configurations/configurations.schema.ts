import { z } from 'zod';

export const updateConfigurationParamsSchema = z.object({
  configurationId: z.coerce
    .number({
      required_error: 'Invalid request',
      invalid_type_error: 'Invalid request',
    })
    .int('Invalid request')
    .positive('Invalid request'),
});

export const updateConfigurationBodySchema = z.object({
  value: z
    .string({
      required_error: 'Configuration value is required',
      invalid_type_error: 'Configuration value is required',
    })
    .refine((value) => value.trim().length > 0, 'Configuration value is required'),
});

export type UpdateConfigurationBody = z.infer<typeof updateConfigurationBodySchema>;
