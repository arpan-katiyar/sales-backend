import { and, asc, desc, eq, gte, lte, sql } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { billDetails, billImages, bills } from '../../db/schema/entries.js';
import { customers, suppliers } from '../../db/schema/parties.js';
import { transports } from '../../db/schema/transports.js';
import { ACTIVE_STATUS, auditStamp, countValue, nextBillNumber, touchStamp } from '../entries/common.js';
import type { StoredFile } from '../entries/common.js';

export type BillItemInput = {
  pieces: number;
  grossAmount: bigint;
  discountPercent: number;
  discountAmount: bigint;
  addOnAmount: bigint;
  ecrAmount: bigint;
  gstPercent: number;
  gstAmount: bigint;
};

export type BillHeaderInput = {
  date: string;
  receivedDate: string | null;
  invoiceNo: string | null;
  supplierId: number;
  customerId: number;
  transportName: string | null;
  lrNumber: string | null;
  remarks: string | null;
  taxableValue: bigint;
  billAmount: bigint;
  items: BillItemInput[];
  images: StoredFile[];
  userId: number;
};

export type BillUpdateInput = {
  date: string;
  receivedDate?: string;
  invoiceNo: string | null;
  supplierId?: number;
  customerId?: number;
  transportId: number | null;
  clearTransport: boolean;
  lrNumber: string | null;
  remarks: string | null;
  taxableValue: bigint;
  billAmount: bigint;
  items: BillItemInput[];
  removedImageIds: number[];
  images: StoredFile[];
  userId: number;
};

export type BillSearchFilter = {
  fromDate: string | null;
  toDate: string | null;
  supplierId: number | null;
  customerId: number | null;
  pageIndex: number;
  size: number;
};

type BillExecutor = Pick<ReturnType<typeof getDb>, 'select' | 'insert'>;

async function transportIdForName(
  tx: BillExecutor,
  name: string | null,
  userId: number,
  now: Date,
): Promise<number | null> {
  if (name == null || name.trim() === '') {
    return null;
  }
  const trimmed = name.trim();
  const rows = await tx
    .select({ id: transports.id })
    .from(transports)
    .where(sql`LOWER(${transports.name}) = LOWER(${trimmed})`)
    .limit(2);
  if (rows.length > 1) {
    throw Object.assign(new Error('Non unique transport'), { code: 'ER_DUP_ENTRY' });
  }
  if (rows[0]) {
    return rows[0].id;
  }
  const [created] = await tx
    .insert(transports)
    .values({
      name: trimmed,
      status: ACTIVE_STATUS,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    })
    .$returningId();
  if (!created) {
    throw Object.assign(new Error('Transport insert failed'), { code: 'ER_UNKNOWN' });
  }
  return created.id;
}

function billWhere(filter: Omit<BillSearchFilter, 'pageIndex' | 'size'>) {
  const conditions = [];
  if (filter.fromDate) {
    conditions.push(gte(bills.date, filter.fromDate));
  }
  if (filter.toDate) {
    conditions.push(lte(bills.date, filter.toDate));
  }
  if (filter.supplierId != null) {
    conditions.push(eq(bills.supplierId, filter.supplierId));
  }
  if (filter.customerId != null) {
    conditions.push(eq(bills.customerId, filter.customerId));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const billRepository = {
  async findTransportId(name: string): Promise<number | null> {
    const rows = await getDb()
      .select({ id: transports.id })
      .from(transports)
      .where(sql`LOWER(${transports.name}) = LOWER(${name})`)
      .limit(2);
    if (rows.length > 1) {
      throw Object.assign(new Error('Non unique transport'), { code: 'ER_DUP_ENTRY' });
    }
    return rows[0]?.id ?? null;
  },

  async add(input: BillHeaderInput): Promise<string> {
    return getDb().transaction(async (tx) => {
      await tx.execute(sql`SELECT GET_LOCK('csm_bill_number', 10)`);
      try {
        const [last] = await tx
          .select({ billNumber: bills.billNumber })
          .from(bills)
          .orderBy(desc(bills.id))
          .limit(1);
        const billNumber = nextBillNumber(last?.billNumber);
        const stamp = auditStamp(input.userId);
        const transportId = await transportIdForName(tx, input.transportName, input.userId, stamp.createdAt);
        const [created] = await tx
          .insert(bills)
          .values({
            billNumber,
            date: input.date,
            receivedDate: input.receivedDate,
            invoiceNo: input.invoiceNo,
            taxableValue: input.taxableValue,
            billAmount: input.billAmount,
            transportId,
            lrNumber: input.lrNumber,
            remarks: input.remarks,
            supplierId: input.supplierId,
            customerId: input.customerId,
            ...stamp,
          })
          .$returningId();
        if (!created) {
          throw Object.assign(new Error('Bill insert failed'), { code: 'ER_UNKNOWN' });
        }
        if (input.items.length > 0) {
          await tx.insert(billDetails).values(
            input.items.map((item) => ({
              ...item,
              billEntryId: created.id,
              ...stamp,
            })),
          );
        }
        if (input.images.length > 0) {
          await tx.insert(billImages).values(
            input.images.map((image) => ({
              objectKey: image.key,
              publicUrl: image.publicUrl,
              originalFileName: image.originalFileName,
              billId: created.id,
              ...stamp,
            })),
          );
        }
        return billNumber;
      } finally {
        await tx.execute(sql`SELECT RELEASE_LOCK('csm_bill_number')`);
      }
    });
  },

  async findById(id: number) {
    const [row] = await getDb().select().from(bills).where(eq(bills.id, id)).limit(1);
    return row ?? null;
  },

  async findImages(billId: number) {
    return getDb().select().from(billImages).where(eq(billImages.billId, billId)).orderBy(asc(billImages.id));
  },

  async update(id: number, input: BillUpdateInput): Promise<void> {
    const stamp = touchStamp(input.userId);
    const created = auditStamp(input.userId);
    await getDb().transaction(async (tx) => {
      await tx
        .update(bills)
        .set({
          date: input.date,
          ...(input.receivedDate !== undefined ? { receivedDate: input.receivedDate } : {}),
          invoiceNo: input.invoiceNo,
          ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
          ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
          ...(input.clearTransport || input.transportId != null ? { transportId: input.transportId } : {}),
          lrNumber: input.lrNumber,
          remarks: input.remarks,
          taxableValue: input.taxableValue,
          billAmount: input.billAmount,
          ...stamp,
        })
        .where(eq(bills.id, id));
      await tx.delete(billDetails).where(eq(billDetails.billEntryId, id));
      if (input.items.length > 0) {
        await tx.insert(billDetails).values(
          input.items.map((item) => ({
            ...item,
            billEntryId: id,
            ...created,
          })),
        );
      }
      if (input.removedImageIds.length > 0) {
        for (const imageId of input.removedImageIds) {
          await tx.delete(billImages).where(eq(billImages.id, imageId));
        }
      }
      if (input.images.length > 0) {
        await tx.insert(billImages).values(
          input.images.map((image) => ({
            objectKey: image.key,
            publicUrl: image.publicUrl,
            originalFileName: image.originalFileName,
            billId: id,
            ...created,
          })),
        );
      }
    });
  },

  async search(filter: BillSearchFilter) {
    const where = billWhere(filter);
    const db = getDb();
    const [totals] = await db
      .select({
        total: sql<string | number | null>`COUNT(*)`,
        amount: sql<string | null>`SUM(${bills.billAmount})`,
      })
      .from(bills)
      .where(where);
    const rows = await db
      .select({
        id: bills.id,
        billNumber: bills.billNumber,
        date: bills.date,
        receivedDate: bills.receivedDate,
        invoiceNo: bills.invoiceNo,
        billAmount: bills.billAmount,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        supplierCity: suppliers.city,
        customerId: customers.id,
        customerName: customers.name,
        customerCity: customers.city,
      })
      .from(bills)
      .leftJoin(suppliers, eq(suppliers.id, bills.supplierId))
      .leftJoin(customers, eq(customers.id, bills.customerId))
      .where(where)
      .orderBy(desc(bills.date), desc(bills.createdAt), desc(bills.id))
      .limit(filter.size)
      .offset(filter.pageIndex * filter.size);
    return {
      rows,
      total: countValue(totals?.total),
      amount: totals?.amount ?? null,
    };
  },

  async findByBillNumber(billNumber: string) {
    const [row] = await getDb().select().from(bills).where(eq(bills.billNumber, billNumber)).limit(1);
    return row ?? null;
  },

  async findDetails(billId: number) {
    return getDb().select().from(billDetails).where(eq(billDetails.billEntryId, billId)).orderBy(asc(billDetails.id));
  },

  async findParty(supplierId: number | null, customerId: number | null) {
    const [supplier] =
      supplierId == null
        ? []
        : await getDb()
            .select({
              id: suppliers.id,
              name: suppliers.name,
              groupName: suppliers.groupName,
              gstNo: suppliers.gstNo,
              msme: suppliers.msme,
              city: suppliers.city,
            })
            .from(suppliers)
            .where(eq(suppliers.id, supplierId))
            .limit(1);
    const [customer] =
      customerId == null
        ? []
        : await getDb()
            .select({
              id: customers.id,
              name: customers.name,
              groupName: customers.groupName,
              gstNo: customers.gstNo,
              msme: customers.msme,
              city: customers.city,
            })
            .from(customers)
            .where(eq(customers.id, customerId))
            .limit(1);
    return { supplier: supplier ?? null, customer: customer ?? null };
  },

  async findTransportName(transportId: number | null): Promise<string | null> {
    if (transportId == null) {
      return null;
    }
    const [row] = await getDb()
      .select({ name: transports.name })
      .from(transports)
      .where(eq(transports.id, transportId))
      .limit(1);
    return row?.name ?? null;
  },

  async remove(id: number): Promise<void> {
    await getDb().transaction(async (tx) => {
      await tx.delete(billDetails).where(eq(billDetails.billEntryId, id));
      await tx.delete(billImages).where(eq(billImages.billId, id));
      await tx.delete(bills).where(eq(bills.id, id));
    });
  },
};
