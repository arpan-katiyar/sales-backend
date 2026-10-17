import type { CookieOptions, Response } from 'express';

import { env } from '../../config/env.js';

export const ACCESS_COOKIE = 'accessToken';
export const REFRESH_COOKIE = 'refreshToken';
export const REFRESH_COOKIE_PATH = '/csm/api/v1/auth';

const accessCookieOptions = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/',
  maxAge,
});

const refreshCookieOptions = (maxAge: number): CookieOptions => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  path: REFRESH_COOKIE_PATH,
  maxAge,
});

export function setAuthCookies(
  res: Response,
  accessToken: string,
  refreshToken: string,
  accessMaxAgeMs: number,
  refreshMaxAgeMs: number,
): void {
  res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions(accessMaxAgeMs));
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions(refreshMaxAgeMs));
}

export function clearAuthCookies(res: Response): void {
  const access = accessCookieOptions(0);
  const refresh = refreshCookieOptions(0);
  res.clearCookie(ACCESS_COOKIE, {
    httpOnly: access.httpOnly,
    secure: access.secure,
    sameSite: access.sameSite,
    path: access.path,
  });
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: refresh.httpOnly,
    secure: refresh.secure,
    sameSite: refresh.sameSite,
    path: refresh.path,
  });
}
