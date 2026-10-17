import { z } from 'zod';

import { ROLE_NAMES } from '../../common/constants.js';

function requiredText(message: string) {
  return z
    .string({ required_error: message, invalid_type_error: message })
    .trim()
    .min(1, message);
}

export const loginSchema = z.object({
  username: requiredText('Username is required.'),
  password: z
    .string({
      required_error: 'Password is required.',
      invalid_type_error: 'Password is required.',
    })
    .min(1, 'Password is required.'),
});

export const addUserSchema = z.object({
  username: requiredText('Username is required'),
  password: z
    .string({
      required_error: 'Password must be at least 8 characters.',
      invalid_type_error: 'Password must be at least 8 characters.',
    })
    .min(8, 'Password must be at least 8 characters.'),
  roles: z.array(z.enum(ROLE_NAMES)).min(1, 'Role is required'),
});

export const changePasswordSchema = z.object({
  userId: z.number({
    required_error: 'User id is required',
    invalid_type_error: 'User id is required',
  }).int().positive(),
  newPassword: z
    .string({
      required_error: 'New password is required',
      invalid_type_error: 'New password is required',
    })
    .min(1, 'New password is required'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type AddUserInput = z.infer<typeof addUserSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
