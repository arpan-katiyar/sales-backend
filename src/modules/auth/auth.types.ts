import type { RoleName } from '../../common/constants.js';

export type UserStatus = 'ACTIVE' | 'INACTIVE';

export type PublicUser = {
  userId: number;
  username: string;
  roles: string[];
  passwordChangeRequired: boolean;
};

export type UserRecord = {
  id: number;
  username: string;
  passwordHash: string;
  status: UserStatus;
  passwordChangeRequired: boolean;
  roles: string[];
};

export type CreateUserInput = {
  username: string;
  passwordHash: string;
  roles: RoleName[];
  passwordChangeRequired: boolean;
};

export type RefreshTokenRecord = {
  jti: string;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  sessionExpiresAt: Date;
  revokedAt: Date | null;
};

export type NewRefreshToken = {
  jti: string;
  userId: number;
  tokenHash: string;
  expiresAt: Date;
  sessionExpiresAt: Date;
};
