import { eq } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { refreshTokens } from '../../db/schema/index.js';
import type { NewRefreshToken, RefreshTokenRecord } from './auth.types.js';

function toRecord(row: typeof refreshTokens.$inferSelect): RefreshTokenRecord {
  return {
    jti: row.jti,
    userId: row.userId,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    sessionExpiresAt: row.sessionExpiresAt,
    revokedAt: row.revokedAt,
  };
}

export const refreshTokenRepository = {
  async insert(token: NewRefreshToken): Promise<void> {
    await getDb().insert(refreshTokens).values({
      jti: token.jti,
      userId: token.userId,
      tokenHash: token.tokenHash,
      expiresAt: token.expiresAt,
      sessionExpiresAt: token.sessionExpiresAt,
      createdAt: new Date(),
    });
  },

  async findByJti(jti: string): Promise<RefreshTokenRecord | null> {
    const [row] = await getDb()
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.jti, jti))
      .limit(1);
    return row ? toRecord(row) : null;
  },

  async revoke(jti: string, replacedByJti: string | null): Promise<void> {
    await getDb()
      .update(refreshTokens)
      .set({
        revokedAt: new Date(),
        replacedByJti,
      })
      .where(eq(refreshTokens.jti, jti));
  },

  async revokeAllForUser(userId: number): Promise<void> {
    await getDb()
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.userId, userId));
  },
};
