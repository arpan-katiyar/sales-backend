import { ROLES, type RoleName } from '../../common/constants.js';
import { AppError } from '../../common/errors/app-error.js';
import { hashPassword, verifyPassword } from '../../common/utils/password.js';
import type { PublicUser } from '../auth/auth.types.js';
import { refreshTokenRepository } from '../auth/auth.repository.js';
import type { AddUserInput, ChangePasswordInput } from '../auth/auth.schema.js';
import { isDuplicateError, usersRepository } from './users.repository.js';

export function createUserService(
  users: Pick<typeof usersRepository, 'findByUsername' | 'findById' | 'create' | 'updatePassword'>,
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

      if (isSelf) {
        if (!input.currentPassword) {
          throw new AppError(400, 'Current password is required.', 200);
        }
        const matches = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!matches) {
          throw new AppError(401, 'Current password is incorrect.', 200);
        }
      }

      await users.updatePassword(user.id, await hashPassword(input.newPassword));
      await refreshTokens.revokeAllForUser(user.id);

      return {
        message: 'Password changed',
        userId: user.id,
        status: 'SUCCESS',
      };
    },
  };
}

export const userService = createUserService(usersRepository, refreshTokenRepository);
