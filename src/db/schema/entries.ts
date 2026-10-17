import {
  bigint,
  date,
  datetime,
  int,
  mysqlTable,
  timestamp,
  tinyint,
  varchar,
} from 'drizzle-orm/mysql-core';

export const bills = mysqlTable('bill', {
  id: int('id').autoincrement().primaryKey(),
  billNumber: varchar('bill_number', { length: 50 }),
  date: date('date', { mode: 'string' }),
  receivedDate: date('received_date', { mode: 'string' }),
  invoiceNo: varchar('invoice_no', { length: 100 }),
  taxableValue: bigint('taxable_value', { mode: 'bigint' }),
  billAmount: bigint('bill_amount', { mode: 'bigint' }),
  transportId: int('transport_id'),
  lrNumber: varchar('lr_number', { length: 20 }),
  remarks: varchar('remarks', { length: 255 }),
  supplierId: int('supplier_id'),
  customerId: int('customer_id'),
  createdAt: timestamp('created_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});

export const billDetails = mysqlTable('bill_detail', {
  id: int('id').autoincrement().primaryKey(),
  pieces: int('pieces'),
  grossAmount: bigint('gross_amount', { mode: 'bigint' }),
  discountPercent: int('discount_percent'),
  discountAmount: bigint('discount_amount', { mode: 'bigint' }),
  addOnAmount: bigint('add_on_amount', { mode: 'bigint' }),
  ecrAmount: bigint('ecr_amount', { mode: 'bigint' }),
  gstPercent: int('gst_percent'),
  gstAmount: bigint('gst_amount', { mode: 'bigint' }),
  billEntryId: int('bill_entry_id'),
  createdAt: timestamp('created_at', { mode: 'date' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});

export const billImages = mysqlTable('bill_images', {
  id: bigint('id', { mode: 'number' }).autoincrement().primaryKey(),
  objectKey: varchar('object_key', { length: 500 }).notNull(),
  billId: int('bill_id').notNull(),
  publicUrl: varchar('public_url', { length: 500 }),
  createdAt: datetime('created_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: datetime('updated_at', { mode: 'date' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
  originalFileName: varchar('original_file_name', { length: 100 }),
});

export const credits = mysqlTable('credit', {
  id: int('id').autoincrement().primaryKey(),
  paymentType: tinyint('payment_type'),
  billNumber: varchar('bill_number', { length: 50 }),
  date: date('date', { mode: 'string' }),
  referenceNumber: varchar('reference_number', { length: 100 }),
  referenceDate: date('reference_date', { mode: 'string' }),
  receivedAmount: bigint('received_amount', { mode: 'bigint' }),
  drawType: tinyint('draw_type'),
  remark: varchar('remark', { length: 150 }),
  slipNumber: varchar('slip_number', { length: 30 }),
  supplierId: int('supplier_id'),
  customerId: int('customer_id'),
  createdAt: timestamp('created_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});

export const purchases = mysqlTable('purchase', {
  id: int('id').autoincrement().primaryKey(),
  date: date('date', { mode: 'string' }),
  staffId: int('staff_id'),
  customerId: int('customer_id'),
  createdAt: timestamp('created_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
  supplierId: int('supplier_id'),
  remarks: varchar('remarks', { length: 255 }),
});

export const purchaseImages = mysqlTable('purchase_images', {
  id: int('id').autoincrement().primaryKey(),
  objectKey: varchar('object_key', { length: 500 }).notNull(),
  publicUrl: varchar('public_url', { length: 500 }),
  purchaseId: int('purchase_id'),
  originalFileName: varchar('original_file_name', { length: 255 }),
  createdAt: datetime('created_at', { mode: 'date' }),
  updatedAt: datetime('updated_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});

export const retailers = mysqlTable('retailers', {
  id: int('id').autoincrement().primaryKey(),
  name: varchar('name', { length: 255 }),
  date: date('date', { mode: 'string' }).notNull(),
  referredByCustomerId: int('referred_by_customer_id'),
  staffId: int('staff_id'),
  status: tinyint('status'),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull(),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
  commission: varchar('commission', { length: 255 }),
});

export const retailSuppliers = mysqlTable('retail_supplier', {
  id: int('id').autoincrement().primaryKey(),
  retailId: int('retail_id').notNull(),
  supplierId: int('supplier_id').notNull(),
  totalAmount: bigint('total_amount', { mode: 'number' }),
  depositAmount: bigint('deposit_amount', { mode: 'number' }),
  balanceAmount: bigint('balance_amount', { mode: 'number' }),
  status: tinyint('status'),
  createdAt: datetime('created_at', { mode: 'date' }).notNull(),
  updatedAt: datetime('updated_at', { mode: 'date' }).notNull(),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});

export const retailSupplierDeposits = mysqlTable('retail_supplier_deposits', {
  id: int('id').autoincrement().primaryKey(),
  retailSupplierId: int('retail_supplier_id').notNull(),
  depositDate: date('deposit_date', { mode: 'string' }),
  amount: bigint('amount', { mode: 'number' }),
  status: tinyint('status'),
  createdAt: timestamp('created_at', { mode: 'date' }),
  createdBy: bigint('created_by', { mode: 'number' }),
  updatedAt: timestamp('updated_at', { mode: 'date' }),
  updatedBy: bigint('updated_by', { mode: 'number' }),
});
