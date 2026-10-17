import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../errors/app-error.js';
import { ACCESS_COOKIE } from '../utils/cookies.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { usersRepository } from '../../modules/users/users.repository.js';

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.[ACCESS_COOKIE];
  if (typeof token !== 'string' || token.length === 0) {
    next(new AppError(401, 'Missing or invalid session', 401));
    return;
  }

  try {
    const claims = await verifyAccessToken(token);
    const user = await usersRepository.findById(claims.userId);
    if (!user || user.status !== 'ACTIVE') {
      next(new AppError(401, 'Missing or invalid session', 401));
      return;
    }
    req.user = {
      userId: user.id,
      username: user.username,
      roles: user.roles,
      passwordChangeRequired: user.passwordChangeRequired,
    };
    next();
  } catch {
    next(new AppError(401, 'Missing or invalid session', 401));
  }
}

export function requireRoles(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || !roles.some((role) => req.user?.roles.includes(role))) {
      next(new AppError(403, 'You do not have permission to perform this action', 403));
      return;
    }
    next();
  };
}
