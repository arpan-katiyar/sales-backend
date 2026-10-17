import { relations } from 'drizzle-orm';
import {
  bigint,
  boolean,
  datetime,
  index,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core';

export const users = mysqlTable(
  'users',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    username: varchar('username', { length: 100 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    status: mysqlEnum('status', ['ACTIVE', 'INACTIVE']).notNull().default('ACTIVE'),
    passwordChangeRequired: boolean('password_change_required').notNull().default(true),
    createdAt: datetime('created_at', { mode: 'date' }).notNull(),
    updatedAt: datetime('updated_at', { mode: 'date' }).notNull(),
  },
  (table) => [uniqueIndex('users_username_unique').on(table.username)],
);

export const userRoles = mysqlTable(
  'user_roles',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id),
    role: varchar('role', { length: 50 }).notNull(),
  },
  (table) => [
    uniqueIndex('user_roles_user_id_role_unique').on(table.userId, table.role),
    index('user_roles_user_id_idx').on(table.userId),
  ],
);

export const refreshTokens = mysqlTable(
  'refresh_tokens',
  {
    id: bigint('id', { mode: 'number', unsigned: true }).autoincrement().primaryKey(),
    jti: varchar('jti', { length: 36 }).notNull(),
    userId: bigint('user_id', { mode: 'number', unsigned: true })
      .notNull()
      .references(() => users.id),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: datetime('expires_at', { mode: 'date' }).notNull(),
    sessionExpiresAt: datetime('session_expires_at', { mode: 'date' }).notNull(),
    revokedAt: datetime('revoked_at', { mode: 'date' }),
    replacedByJti: varchar('replaced_by_jti', { length: 36 }),
    createdAt: datetime('created_at', { mode: 'date' }).notNull(),
  },
  (table) => [
    uniqueIndex('refresh_tokens_jti_unique').on(table.jti),
    index('refresh_tokens_user_id_idx').on(table.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  roles: many(userRoles),
  refreshTokens: many(refreshTokens),
}));

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(users, { fields: [userRoles.userId], references: [users.id] }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));
