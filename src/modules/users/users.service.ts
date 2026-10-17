import { ROLES, type RoleName } from '../../common/constants.js';
import { AppError } from '../../common/errors/app-error.js';
import { hashPassword } from '../../common/utils/password.js';
import type { PublicUser } from '../auth/auth.types.js';
import { refreshTokenRepository } from '../auth/auth.repository.js';
import type { AddUserInput, ChangePasswordInput } from '../auth/auth.schema.js';
import { isDuplicateError, usersRepository } from './users.repository.js';

export type ListedUser = {
  id: number;
  username: string;
  roles: string[];
  status: string;
};

export function createUserService(
  users: Pick<
    typeof usersRepository,
    'findByUsername' | 'findById' | 'create' | 'updatePassword' | 'listActive' | 'searchActive' | 'deactivate'
  >,
  refreshTokens: Pick<typeof refreshTokenRepository, 'revokeAllForUser'>,
) {
  return {
    async addUser(input: AddUserInput): Promise<{ status: 'ACTIVE' }> {
      const existing = await users.findByUsername(input.username);
      if (existing) {
        throw new AppError(1005, 'Duplicate entry', 200);
      }

      try {
        await users.create({
          username: input.username,
          passwordHash: await hashPassword(input.password),
          roles: input.roles as RoleName[],
          passwordChangeRequired: true,
        });
      } catch (error) {
        if (isDuplicateError(error)) {
          throw new AppError(1005, 'Duplicate entry', 200);
        }
        throw error;
      }

      return { status: 'ACTIVE' };
    },

    async changePassword(actor: PublicUser, input: ChangePasswordInput): Promise<{
      message: string;
      userId: number;
      status: 'SUCCESS';
    }> {
      const isSelf = actor.userId === input.userId;
      const isAdmin = actor.roles.includes(ROLES.ADMIN);
      if (!isSelf && !isAdmin) {
        throw new AppError(403, 'You do not have permission to perform this action', 403);
      }

      const user = await users.findById(input.userId);
      if (!user) {
        throw new AppError(1111, 'Data not found. ', 200);
      }

      await users.updatePassword(user.id, await hashPassword(input.newPassword));
      await refreshTokens.revokeAllForUser(user.id);

      return {
        message: 'Password changed',
        userId: user.id,
        status: 'SUCCESS',
      };
    },

    async list(): Promise<{ users: ListedUser[] }> {
      const rows = await users.listActive();
      return {
        users: rows.map((row) => ({
          id: row.id,
          username: row.username,
          roles: row.roles,
          status: row.status,
        })),
      };
    },

    async search(keyword: string): Promise<Array<{ id: number; username: string; roles: string[] }>> {
      const trimmed = keyword.trim();
      if (trimmed === '') {
        return [];
      }
      const rows = await users.searchActive(trimmed);
      return rows.map((row) => ({
        id: row.id,
        username: row.username,
        roles: row.roles,
      }));
    },

    async remove(userId: number): Promise<{ message: string }> {
      const removed = await users.deactivate(userId);
      if (!removed) {
        throw new AppError(1111, 'Data not found. ', 200);
      }
      await refreshTokens.revokeAllForUser(userId);
      return { message: 'User deleted successfully' };
    },

    async detail(userId: number): Promise<{ encryptedPayload: string }> {
      const user = await users.findById(userId);
      if (!user || user.status !== 'ACTIVE') {
        throw new AppError(1111, 'Data not found. ', 200);
      }
      const payload = Buffer.from(
        JSON.stringify({
          id: user.id,
          username: user.username,
          roles: user.roles,
          status: user.status,
        }),
      ).toString('base64');
      return { encryptedPayload: payload };
    },
  };
}

export const userService = createUserService(usersRepository, refreshTokenRepository);
