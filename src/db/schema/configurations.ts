import { bigint, datetime, int, mysqlTable, tinyint, varchar } from 'drizzle-orm/mysql-core';

export const configurations = mysqlTable('configurations', {
  id: int('id').autoincrement().primaryKey(),
  configKey: varchar('config_key', { length: 255 }).notNull(),
  configValue: varchar('config_value', { length: 255 }),
  configType: tinyint('config_type').notNull(),
  description: varchar('description', { length: 500 }),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull(),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});
