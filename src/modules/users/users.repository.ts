import { eq } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { userRoles, users } from '../../db/schema/index.js';
import type { CreateUserInput, UserRecord } from '../auth/auth.types.js';

function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}

async function loadRoles(userId: number): Promise<string[]> {
  const rows = await getDb()
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  return rows.map((row) => row.role);
}

function toRecord(
  row: typeof users.$inferSelect,
  roles: string[],
): UserRecord {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.passwordHash,
    status: row.status,
    passwordChangeRequired: row.passwordChangeRequired,
    roles,
  };
}

export const usersRepository = {
  async findByUsername(username: string): Promise<UserRecord | null> {
    const [row] = await getDb().select().from(users).where(eq(users.username, username)).limit(1);
    if (!row) {
      return null;
    }
    return toRecord(row, await loadRoles(row.id));
  },

  async findById(id: number): Promise<UserRecord | null> {
    const [row] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
    if (!row) {
      return null;
    }
    return toRecord(row, await loadRoles(row.id));
  },

  async create(input: CreateUserInput): Promise<UserRecord> {
    const now = new Date();
    return getDb().transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(users)
        .values({
          username: input.username,
          passwordHash: input.passwordHash,
          status: 'ACTIVE',
          passwordChangeRequired: input.passwordChangeRequired,
          createdAt: now,
          updatedAt: now,
        })
        .$returningId();

      if (input.roles.length > 0) {
        await tx.insert(userRoles).values(
          input.roles.map((role) => ({
            userId: id,
            role,
          })),
        );
      }

      return {
        id,
        username: input.username,
        passwordHash: input.passwordHash,
        status: 'ACTIVE' as const,
        passwordChangeRequired: input.passwordChangeRequired,
        roles: [...input.roles],
      };
    });
  },

  async updatePassword(userId: number, passwordHash: string): Promise<void> {
    await getDb()
      .update(users)
      .set({
        passwordHash,
        passwordChangeRequired: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  },
};

export { isDuplicateError };
