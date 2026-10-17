import bcrypt from 'bcrypt';
import { describe, expect, it } from 'vitest';

import { AppError } from '../src/common/errors/app-error.js';
import { hashToken } from '../src/common/utils/tokens.js';
import { createAuthService } from '../src/modules/auth/auth.service.js';
import type { NewRefreshToken, RefreshTokenRecord, UserRecord } from '../src/modules/auth/auth.types.js';

function memoryAuth() {
  const users: UserRecord[] = [];
  const tokens: RefreshTokenRecord[] = [];

  const userStore = {
    async findByUsername(username: string) {
      return users.find((user) => user.username === username) ?? null;
    },
    async findById(id: number) {
      return users.find((user) => user.id === id) ?? null;
    },
  };

  const tokenStore = {
    async insert(token: NewRefreshToken) {
      tokens.push({ ...token, revokedAt: null });
    },
    async findByJti(jti: string) {
      return tokens.find((token) => token.jti === jti) ?? null;
    },
    async revoke(jti: string) {
      const row = tokens.find((token) => token.jti === jti);
      if (row) {
        row.revokedAt = new Date();
      }
    },
    async revokeAllForUser(userId: number) {
      for (const row of tokens) {
        if (row.userId === userId) {
          row.revokedAt = new Date();
        }
      }
    },
  };

  return {
    users,
    tokens,
    service: createAuthService(userStore, tokenStore),
  };
}

describe('auth service', () => {
  it('logs in with bcrypt and rotates refresh tokens', async () => {
    const { users, tokens, service } = memoryAuth();
    users.push({
      id: 1,
      username: 'admin',
      passwordHash: await bcrypt.hash('password123', 4),
      status: 'ACTIVE',
      passwordChangeRequired: true,
      roles: ['ADMIN'],
    });

    const session = await service.login('admin', 'password123');
    expect(session.user).toMatchObject({ userId: 1, username: 'admin', roles: ['ADMIN'] });
    expect(session.accessToken).not.toBe(session.refreshToken);
    expect(tokens).toHaveLength(1);

    const rotated = await service.refresh(session.refreshToken);
    expect(rotated.refreshToken).not.toBe(session.refreshToken);
    expect(tokens[0]?.revokedAt).toBeInstanceOf(Date);
    expect(tokens[1]?.tokenHash).toBe(hashToken(rotated.refreshToken));
    expect(tokens[1]?.sessionExpiresAt).toEqual(tokens[0]?.sessionExpiresAt);

    await expect(service.refresh(session.refreshToken)).rejects.toMatchObject({
      code: 401,
      message: 'Refresh token reuse detected',
    });
    expect(tokens.every((token) => token.revokedAt)).toBe(true);
  });

  it('returns the same error for an unknown user and a wrong password', async () => {
    const { users, service } = memoryAuth();
    users.push({
      id: 1,
      username: 'admin',
      passwordHash: await bcrypt.hash('password123', 4),
      status: 'ACTIVE',
      passwordChangeRequired: false,
      roles: ['AGENT'],
    });

    await expect(service.login('missing', 'password123')).rejects.toBeInstanceOf(AppError);
    await expect(service.login('admin', 'wrong-password')).rejects.toMatchObject({
      httpStatus: 200,
      message: 'Invalid username or password',
    });
  });

  it('rejects an inactive account', async () => {
    const { users, service } = memoryAuth();
    users.push({
      id: 2,
      username: 'former',
      passwordHash: await bcrypt.hash('password123', 4),
      status: 'INACTIVE',
      passwordChangeRequired: false,
      roles: ['AGENT'],
    });

    await expect(service.login('former', 'password123')).rejects.toMatchObject({
      message: 'This account is inactive.',
    });
  });

  it('refuses to rotate a refresh token past the login deadline', async () => {
    const { users, tokens, service } = memoryAuth();
    users.push({
      id: 1,
      username: 'admin',
      passwordHash: await bcrypt.hash('password123', 4),
      status: 'ACTIVE',
      passwordChangeRequired: false,
      roles: ['ADMIN'],
    });

    const session = await service.login('admin', 'password123');
    const deadline = new Date(Date.now() + 5000);
    const current = tokens[0];
    if (!current) {
      throw new Error('missing refresh token');
    }
    current.sessionExpiresAt = deadline;

    const rotated = await service.refresh(session.refreshToken);
    expect(tokens[1]?.sessionExpiresAt).toEqual(deadline);
    expect(tokens[1]?.expiresAt.getTime()).toBeLessThanOrEqual(deadline.getTime());
    expect(rotated.refreshMaxAgeMs).toBeLessThanOrEqual(5000);

    const expired = tokens[1];
    if (!expired) {
      throw new Error('missing rotated refresh token');
    }
    expired.sessionExpiresAt = new Date(Date.now() - 1000);
    await expect(service.refresh(rotated.refreshToken)).rejects.toMatchObject({
      message: 'Session expired',
    });
  });
});
