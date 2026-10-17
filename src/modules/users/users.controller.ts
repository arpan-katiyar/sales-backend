import type { Request, Response } from 'express';

import { clearAuthCookies } from '../../common/utils/cookies.js';
import { AppError } from '../../common/errors/app-error.js';
import type { AddUserInput, ChangePasswordInput } from '../auth/auth.schema.js';
import { userService } from './users.service.js';

export async function addUser(req: Request, res: Response): Promise<void> {
  const body = req.body as AddUserInput;
  const result = await userService.addUser(body);
  res.status(200).json(result);
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    throw new AppError(401, 'Missing or invalid session', 401);
  }
  const body = req.body as ChangePasswordInput;
  const result = await userService.changePassword(req.user, body);
  if (req.user.userId === body.userId) {
    clearAuthCookies(res);
  }
  res.status(200).json(result);
}
