export const ROLES = {
  ADMIN: 'ADMIN',
  AGENT: 'AGENT',
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_NAMES = [ROLES.ADMIN, ROLES.AGENT] as const;
