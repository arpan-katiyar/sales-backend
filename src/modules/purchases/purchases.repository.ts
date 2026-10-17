import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { purchaseImages, purchases } from '../../db/schema/entries.js';
import { bankDetails, customers, suppliers } from '../../db/schema/parties.js';
import { staff } from '../../db/schema/staff.js';
import { auditStamp, countValue, touchStamp } from '../entries/common.js';
import type { StoredFile } from '../entries/common.js';

export type PurchaseWrite = {
  date: string | null;
  staffId: number | null;
  supplierId: number | null;
  customerId: number | null;
  remarks: string | null;
  images: StoredFile[];
  userId: number;
};

export type PurchasePatch = {
  date?: string;
  staffId?: number;
  supplierId?: number;
  customerId?: number;
  remarks?: string;
  removedImageIds: number[];
  images: StoredFile[];
  userId: number;
};

export type PurchaseFilter = {
  fromDate: string | null;
  toDate: string | null;
  supplierId: number | null;
  customerId: number | null;
  staffId: number | null;
};

function purchaseWhere(filter: PurchaseFilter) {
  const conditions = [];
  if (filter.fromDate) {
    conditions.push(gte(purchases.date, filter.fromDate));
  }
  if (filter.toDate) {
    conditions.push(lte(purchases.date, filter.toDate));
  }
  if (filter.supplierId != null) {
    conditions.push(eq(purchases.supplierId, filter.supplierId));
  }
  if (filter.customerId != null) {
    conditions.push(eq(purchases.customerId, filter.customerId));
  }
  if (filter.staffId != null) {
    conditions.push(eq(purchases.staffId, filter.staffId));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

const historySelection = {
  id: purchases.id,
  date: purchases.date,
  staffId: purchases.staffId,
  remarks: purchases.remarks,
  supplierId: suppliers.id,
  supplierName: suppliers.name,
  supplierCity: suppliers.city,
  customerId: customers.id,
  customerName: customers.name,
  customerCity: customers.city,
};

export const purchaseRepository = {
  async supplierExists(id: number): Promise<boolean> {
    const [row] = await getDb().select({ id: suppliers.id }).from(suppliers).where(eq(suppliers.id, id)).limit(1);
    return Boolean(row);
  },

  async customerExists(id: number): Promise<boolean> {
    const [row] = await getDb().select({ id: customers.id }).from(customers).where(eq(customers.id, id)).limit(1);
    return Boolean(row);
  },

  async addMany(rows: PurchaseWrite[]): Promise<void> {
    const db = getDb();
    await db.transaction(async (tx) => {
      for (const row of rows) {
        const stamp = auditStamp(row.userId);
        const [created] = await tx
          .insert(purchases)
          .values({
            date: row.date,
            staffId: row.staffId,
            supplierId: row.supplierId,
            customerId: row.customerId,
            remarks: row.remarks,
            ...stamp,
          })
          .$returningId();
        if (!created) {
          throw Object.assign(new Error('Purchase insert failed'), { code: 'ER_UNKNOWN' });
        }
        if (row.images.length > 0) {
          await tx.insert(purchaseImages).values(
            row.images.map((image) => ({
              objectKey: image.key,
              publicUrl: image.publicUrl,
              originalFileName: image.originalFileName,
              purchaseId: created.id,
              ...stamp,
            })),
          );
        }
      }
    });
  },

  async search(filter: PurchaseFilter, pageIndex: number, size: number) {
    const where = purchaseWhere(filter);
    const db = getDb();
    const [totals] = await db
      .select({ total: sql<string | number | null>`COUNT(*)` })
      .from(purchases)
      .where(where);
    const rows = await db
      .select(historySelection)
      .from(purchases)
      .leftJoin(suppliers, eq(suppliers.id, purchases.supplierId))
      .leftJoin(customers, eq(customers.id, purchases.customerId))
      .where(where)
      .orderBy(desc(purchases.date), desc(purchases.createdAt), desc(purchases.id))
      .limit(size)
      .offset(pageIndex * size);
    return { rows, total: countValue(totals?.total) };
  },

  async list(filter: PurchaseFilter) {
    return getDb()
      .select(historySelection)
      .from(purchases)
      .leftJoin(suppliers, eq(suppliers.id, purchases.supplierId))
      .leftJoin(customers, eq(customers.id, purchases.customerId))
      .where(purchaseWhere(filter))
      .orderBy(desc(purchases.date), desc(purchases.createdAt), desc(purchases.id));
  },

  async findById(id: number) {
    const [row] = await getDb().select().from(purchases).where(eq(purchases.id, id)).limit(1);
    return row ?? null;
  },

  async findImages(purchaseId: number) {
    return getDb()
      .select()
      .from(purchaseImages)
      .where(eq(purchaseImages.purchaseId, purchaseId))
      .orderBy(asc(purchaseImages.id));
  },

  async update(id: number, input: PurchasePatch): Promise<void> {
    const created = auditStamp(input.userId);
    await getDb().transaction(async (tx) => {
      await tx
        .update(purchases)
        .set({
          ...(input.date !== undefined ? { date: input.date } : {}),
          ...(input.staffId !== undefined ? { staffId: input.staffId } : {}),
          ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
          ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
          ...(input.remarks !== undefined ? { remarks: input.remarks } : {}),
          ...touchStamp(input.userId),
        })
        .where(eq(purchases.id, id));
      for (const imageId of input.removedImageIds) {
        await tx.delete(purchaseImages).where(eq(purchaseImages.id, imageId));
      }
      if (input.images.length > 0) {
        await tx.insert(purchaseImages).values(
          input.images.map((image) => ({
            objectKey: image.key,
            publicUrl: image.publicUrl,
            originalFileName: image.originalFileName,
            purchaseId: id,
            ...created,
          })),
        );
      }
    });
  },

  async remove(id: number): Promise<void> {
    await getDb().transaction(async (tx) => {
      await tx.delete(purchaseImages).where(eq(purchaseImages.purchaseId, id));
      await tx.delete(purchases).where(eq(purchases.id, id));
    });
  },

  async findDetail(id: number) {
    const [row] = await getDb()
      .select({
        id: purchases.id,
        date: purchases.date,
        staffId: purchases.staffId,
        remarks: purchases.remarks,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        customerId: customers.id,
        customerName: customers.name,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(suppliers.id, purchases.supplierId))
      .leftJoin(customers, eq(customers.id, purchases.customerId))
      .where(eq(purchases.id, id))
      .limit(1);
    return row ?? null;
  },

  async staffNames(ids: number[]): Promise<Map<number, string>> {
    if (ids.length === 0) {
      return new Map();
    }
    const rows = await getDb().select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, ids));
    return new Map(rows.map((row) => [row.id, row.name]));
  },

  async copySuppliers(filter: PurchaseFilter) {
    const rows = await getDb()
      .select({
        purchaseId: purchases.id,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(suppliers.id, purchases.supplierId))
      .where(purchaseWhere(filter))
      .orderBy(asc(purchases.id));
    return rows;
  },

  async banksForSuppliers(supplierIds: number[]) {
    if (supplierIds.length === 0) {
      return [];
    }
    return getDb()
      .select({
        id: bankDetails.id,
        supplierId: bankDetails.supplierId,
        bankName: bankDetails.bankName,
        ifscCode: bankDetails.ifscCode,
        branchName: bankDetails.branchName,
        accountName: bankDetails.accountName,
        accountNumber: bankDetails.accountNumber,
      })
      .from(bankDetails)
      .where(inArray(bankDetails.supplierId, supplierIds))
      .orderBy(asc(bankDetails.id));
  },
};
