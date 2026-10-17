import { createHash, randomUUID } from 'node:crypto';

import { SignJWT, jwtVerify } from 'jose';

import { env } from '../../config/env.js';
import type { PublicUser } from '../../modules/auth/auth.types.js';

const accessKey = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshKey = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export type AccessClaims = {
  userId: number;
  username: string;
  roles: string[];
};

export type RefreshClaims = {
  userId: number;
  jti: string;
};

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function newJti(): string {
  return randomUUID();
}

export async function signAccessToken(user: PublicUser, expiresInSeconds: number): Promise<string> {
  return new SignJWT({
    username: user.username,
    roles: user.roles,
    typ: 'access',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.userId))
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(accessKey);
}

export async function signRefreshToken(
  userId: number,
  jti: string,
  expiresInSeconds: number,
): Promise<string> {
  return new SignJWT({ typ: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(userId))
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(`${expiresInSeconds}s`)
    .sign(refreshKey);
}

export async function verifyAccessToken(token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, accessKey);
  if (payload.typ !== 'access' || typeof payload.sub !== 'string') {
    throw new Error('Invalid access token');
  }
  const roles = Array.isArray(payload.roles)
    ? payload.roles.filter((role): role is string => typeof role === 'string')
    : [];
  return {
    userId: Number(payload.sub),
    username: typeof payload.username === 'string' ? payload.username : '',
    roles,
  };
}

export async function verifyRefreshToken(token: string): Promise<RefreshClaims> {
  const { payload } = await jwtVerify(token, refreshKey);
  if (payload.typ !== 'refresh' || typeof payload.sub !== 'string' || typeof payload.jti !== 'string') {
    throw new Error('Invalid refresh token');
  }
  return {
    userId: Number(payload.sub),
    jti: payload.jti,
  };
}
