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

export async function listUsers(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await userService.list());
}

export async function searchUsers(req: Request, res: Response): Promise<void> {
  const keyword = typeof req.query.keyword === 'string' ? req.query.keyword : '';
  res.status(200).json(await userService.search(keyword));
}

export async function deleteUser(req: Request, res: Response): Promise<void> {
  res.status(200).json(await userService.remove(Number(req.params.userId)));
}

export async function getUserDetail(req: Request, res: Response): Promise<void> {
  res.status(200).json(await userService.detail(Number(req.params.userId)));
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
