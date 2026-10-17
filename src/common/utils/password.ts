import bcrypt from 'bcrypt';

import { env } from '../../config/env.js';

let dummyHashPromise: Promise<string> | undefined;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_COST);
}

export function verifyPassword(plain: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plain, passwordHash);
}

export function dummyPasswordHash(): Promise<string> {
  dummyHashPromise ??= bcrypt.hash('not-a-real-password', env.BCRYPT_COST);
  return dummyHashPromise;
}
