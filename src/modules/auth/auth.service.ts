import { env } from '../../config/env.js';
import { AppError } from '../../common/errors/app-error.js';
import { dummyPasswordHash, verifyPassword } from '../../common/utils/password.js';
import { hashToken, newJti, signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/tokens.js';
import type { PublicUser, UserRecord } from './auth.types.js';
import { refreshTokenRepository } from './auth.repository.js';
import { usersRepository } from '../users/users.repository.js';

export type UserStore = Pick<typeof usersRepository, 'findByUsername' | 'findById'>;
export type RefreshTokenStore = Pick<
  typeof refreshTokenRepository,
  'insert' | 'findByJti' | 'revoke' | 'revokeAllForUser'
>;

export type Session = {
  accessToken: string;
  refreshToken: string;
  accessMaxAgeMs: number;
  refreshMaxAgeMs: number;
  user: PublicUser;
};

function toPublicUser(user: UserRecord): PublicUser {
  return {
    userId: user.id,
    username: user.username,
    roles: user.roles,
    passwordChangeRequired: user.passwordChangeRequired,
  };
}

export function createAuthService(users: UserStore, refreshTokens: RefreshTokenStore) {
  function cappedLifetimeMs(now: number, ttlSeconds: number, sessionExpiresAt: Date): number {
    const remaining = sessionExpiresAt.getTime() - now;
    if (remaining < 1000) {
      throw new AppError(401, 'Session expired', 401);
    }
    return Math.min(ttlSeconds * 1000, remaining);
  }

  async function createRefreshToken(
    userId: number,
    sessionExpiresAt: Date,
    expiresAt: Date,
  ): Promise<{ jti: string; token: string }> {
    const jti = newJti();
    const expiresInSeconds = Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
    const token = await signRefreshToken(userId, jti, expiresInSeconds);
    await refreshTokens.insert({
      jti,
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      sessionExpiresAt,
    });
    return { jti, token };
  }

  async function issueSession(
    user: UserRecord,
    sessionExpiresAt: Date,
  ): Promise<Session & { refreshJti: string }> {
    const now = Date.now();
    const accessMaxAgeMs = cappedLifetimeMs(now, env.JWT_ACCESS_TTL_SECONDS, sessionExpiresAt);
    const refreshMaxAgeMs = cappedLifetimeMs(now, env.JWT_REFRESH_TTL_SECONDS, sessionExpiresAt);
    const publicUser = toPublicUser(user);
    const accessToken = await signAccessToken(publicUser, Math.floor(accessMaxAgeMs / 1000));
    const refresh = await createRefreshToken(
      user.id,
      sessionExpiresAt,
      new Date(now + refreshMaxAgeMs),
    );
    return {
      accessToken,
      refreshToken: refresh.token,
      accessMaxAgeMs,
      refreshMaxAgeMs,
      user: publicUser,
      refreshJti: refresh.jti,
    };
  }

  return {
    async login(username: string, password: string): Promise<Session> {
      const user = await users.findByUsername(username.trim());
      const passwordHash = user?.passwordHash ?? (await dummyPasswordHash());
      const matches = await verifyPassword(password, passwordHash);
      if (!user || !matches) {
        throw new AppError(401, 'Invalid username or password', 200);
      }
      if (user.status !== 'ACTIVE') {
        throw new AppError(401, 'This account is inactive.', 200);
      }
      const sessionExpiresAt = new Date(Date.now() + env.JWT_SESSION_TTL_SECONDS * 1000);
      return issueSession(user, sessionExpiresAt);
    },

    async refresh(refreshToken: string | undefined): Promise<Session> {
      if (!refreshToken) {
        throw new AppError(401, 'Missing refresh token', 401);
      }

      let claims;
      try {
        claims = await verifyRefreshToken(refreshToken);
      } catch {
        throw new AppError(401, 'Invalid refresh token', 401);
      }

      const stored = await refreshTokens.findByJti(claims.jti);
      if (!stored || stored.userId !== claims.userId || stored.tokenHash !== hashToken(refreshToken)) {
        throw new AppError(401, 'Invalid refresh token', 401);
      }

      if (stored.revokedAt) {
        await refreshTokens.revokeAllForUser(stored.userId);
        throw new AppError(401, 'Refresh token reuse detected', 401);
      }

      if (stored.sessionExpiresAt.getTime() <= Date.now()) {
        throw new AppError(401, 'Session expired', 401);
      }

      if (stored.expiresAt.getTime() <= Date.now()) {
        throw new AppError(401, 'Refresh token expired', 401);
      }

      const user = await users.findById(stored.userId);
      if (!user || user.status !== 'ACTIVE') {
        throw new AppError(401, 'Invalid refresh token', 401);
      }

      const next = await issueSession(user, stored.sessionExpiresAt);
      await refreshTokens.revoke(stored.jti, next.refreshJti);
      return next;
    },

    async logout(refreshToken: string | undefined): Promise<void> {
      if (!refreshToken) {
        return;
      }
      try {
        const claims = await verifyRefreshToken(refreshToken);
        await refreshTokens.revokeAllForUser(claims.userId);
      } catch {
        return;
      }
    },

    async me(userId: number): Promise<PublicUser> {
      const user = await users.findById(userId);
      if (!user || user.status !== 'ACTIVE') {
        throw new AppError(401, 'Missing or invalid session', 401);
      }
      return toPublicUser(user);
    },
  };
}

export const authService = createAuthService(usersRepository, refreshTokenRepository);
