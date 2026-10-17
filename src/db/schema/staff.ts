import { bigint, date, int, mysqlTable, timestamp, tinyint, varchar } from 'drizzle-orm/mysql-core';

export const staff = mysqlTable('staff', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 50 }).notNull(),
  phone: varchar('phone', { length: 15 }),
  joiningDate: date('joining_date', { mode: 'string' }).notNull(),
  status: tinyint('status'),
  createdAt: timestamp('created_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});
