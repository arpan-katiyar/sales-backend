import {
  bigint,
  datetime,
  decimal,
  int,
  mysqlTable,
  timestamp,
  tinyint,
  varchar,
} from 'drizzle-orm/mysql-core';

export const customers = mysqlTable('customer', {
  id: int('id').autoincrement().primaryKey(),
  code: varchar('code', { length: 7 }),
  name: varchar('name', { length: 255 }),
  groupName: varchar('group_name', { length: 255 }),
  gstNo: varchar('gst_no', { length: 255 }),
  referencedBy: varchar('referenced_by', { length: 255 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 50 }),
  pinCode: varchar('pin_code', { length: 8 }),
  msme: varchar('msme', { length: 8 }),
  remark: varchar('remark', { length: 150 }),
  status: tinyint('status'),
  createdAt: timestamp('created_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
  email: varchar('email', { length: 255 }),
  state: varchar('state', { length: 255 }),
});

export const suppliers = mysqlTable('supplier', {
  id: int('id').autoincrement().primaryKey(),
  code: varchar('code', { length: 7 }),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  groupName: varchar('group_name', { length: 255 }),
  gstNo: varchar('gst_no', { length: 255 }),
  commissionScheme: varchar('commission_scheme', { length: 20 }),
  commissionRate: decimal('commission_rate', { precision: 10, scale: 2 }),
  addressLine1: varchar('address_line1', { length: 255 }),
  addressLine2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 25 }),
  pinCode: varchar('pin_code', { length: 8 }),
  msme: varchar('msme', { length: 8 }),
  remark: varchar('remark', { length: 150 }),
  status: tinyint('status'),
  createdAt: timestamp('created_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
  referenceBy: varchar('reference_by', { length: 100 }),
  state: varchar('state', { length: 255 }),
});

export const contacts = mysqlTable('contact', {
  id: int('id').autoincrement().primaryKey(),
  contactPerson: varchar('person', { length: 255 }),
  mobileNumber: varchar('mobile_number', { length: 20 }),
  supplierId: int('supplier_id'),
  customerId: int('customer_id'),
  type: varchar('type', { length: 50 }),
  createdAt: timestamp('created_at', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});

export const bankDetails = mysqlTable('bank_detail', {
  id: int('id').autoincrement().primaryKey(),
  bankName: varchar('bank_name', { length: 255 }),
  ifscCode: varchar('ifsc_code', { length: 255 }),
  branchName: varchar('branch_name', { length: 255 }),
  accountName: varchar('account_name', { length: 255 }),
  accountNumber: varchar('account_number', { length: 255 }),
  supplierId: int('supplier_id'),
  customerId: int('customer_id'),
  createdAt: datetime('created_at', { mode: 'date' }),
  updatedAt: datetime('updated_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});

export const customerPreferredTransports = mysqlTable('customer_preferred_transport', {
  customerId: int('customer_id').notNull(),
  transportId: int('transport_id').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});

export const supplierPreferredTransports = mysqlTable('supplier_preferred_transport', {
  supplierId: int('supplier_id').notNull(),
  transportId: int('transport_id').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});
