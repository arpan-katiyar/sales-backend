import type { Request, Response } from 'express';

import { REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from '../../common/utils/cookies.js';
import { authService } from './auth.service.js';

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username: string; password: string };
  const session = await authService.login(username, password);
  setAuthCookies(
    res,
    session.accessToken,
    session.refreshToken,
    session.accessMaxAgeMs,
    session.refreshMaxAgeMs,
  );
  res.status(200).json(session.user);
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE];
  try {
    const session = await authService.refresh(typeof token === 'string' ? token : undefined);
    setAuthCookies(
      res,
      session.accessToken,
      session.refreshToken,
      session.accessMaxAgeMs,
      session.refreshMaxAgeMs,
    );
    res.status(200).json(session.user);
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE];
  await authService.logout(typeof token === 'string' ? token : undefined);
  clearAuthCookies(res);
  res.status(200).json({ message: 'Logged out' });
}

export async function me(req: Request, res: Response): Promise<void> {
  const userId = req.user?.userId;
  if (!userId) {
    res.status(401).json({
      code: 401,
      message: 'Missing or invalid session',
      timestamp: new Date().toISOString(),
    });
    return;
  }
  const user = await authService.me(userId);
  res.status(200).json(user);
}
