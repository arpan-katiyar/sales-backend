import {
  bigint,
  datetime,
  int,
  mysqlTable,
  tinyint,
  varchar,
} from 'drizzle-orm/mysql-core';

export const transports = mysqlTable('transports', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  gstNo: varchar('gst_no', { length: 255 }),
  city: varchar('city', { length: 100 }),
  status: tinyint('status'),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull(),
  updatedBy: bigint('updated_by', { mode: 'number' }),
  email: varchar('email', { length: 255 }),
  state: varchar('state', { length: 50 }),
  pinCode: varchar('pin_code', { length: 50 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
});

export const transportContacts = mysqlTable('transport_contacts', {
  id: int('id').autoincrement().primaryKey(),
  contactPerson: varchar('contact_person', { length: 100 }),
  contactNumber: varchar('contact_number', { length: 15 }),
  type: varchar('type', { length: 50 }),
  transportId: int('transport_id').notNull(),
  createdAt: datetime('created_at', { mode: 'date' }),
  updatedAt: datetime('updated_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});
