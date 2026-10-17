import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { credits } from '../../db/schema/entries.js';
import { customers, suppliers } from '../../db/schema/parties.js';
import { auditStamp, countValue, touchStamp } from '../entries/common.js';

export type CreditWrite = {
  paymentType: number;
  billNumber: string | null;
  date: string | null;
  referenceNumber: string | null;
  referenceDate: string | null;
  receivedAmount: bigint;
  drawType: number | null;
  remark: string | null;
  supplierId: number;
  customerId: number;
  slipNumber: string | null;
  userId: number;
};

export type CreditSearchFilter = {
  fromDate: string | null;
  toDate: string | null;
  supplierId: number | null;
  customerId: number | null;
  pageIndex: number;
  size: number;
};

function creditWhere(filter: Omit<CreditSearchFilter, 'pageIndex' | 'size'>) {
  const conditions = [];
  if (filter.fromDate) {
    conditions.push(gte(credits.date, filter.fromDate));
  }
  if (filter.toDate) {
    conditions.push(lte(credits.date, filter.toDate));
  }
  if (filter.supplierId != null) {
    conditions.push(eq(credits.supplierId, filter.supplierId));
  }
  if (filter.customerId != null) {
    conditions.push(eq(credits.customerId, filter.customerId));
  }
  return conditions.length > 0 ? and(...conditions) : undefined;
}

export const creditRepository = {
  async insert(input: CreditWrite): Promise<void> {
    await getDb().insert(credits).values({
      paymentType: input.paymentType,
      billNumber: input.billNumber,
      date: input.date,
      referenceNumber: input.referenceNumber,
      referenceDate: input.referenceDate,
      receivedAmount: input.receivedAmount,
      drawType: input.drawType,
      remark: input.remark,
      supplierId: input.supplierId,
      customerId: input.customerId,
      slipNumber: input.slipNumber,
      ...auditStamp(input.userId),
    });
  },

  async list() {
    return getDb().select().from(credits).orderBy(asc(credits.id));
  },

  async search(filter: CreditSearchFilter) {
    const where = creditWhere(filter);
    const db = getDb();
    const [totals] = await db
      .select({
        total: sql<string | number | null>`COUNT(*)`,
        amount: sql<string | null>`SUM(${credits.receivedAmount})`,
      })
      .from(credits)
      .where(where);
    const rows = await db
      .select()
      .from(credits)
      .where(where)
      .orderBy(desc(credits.date), desc(credits.createdAt), desc(credits.id))
      .limit(filter.size)
      .offset(filter.pageIndex * filter.size);
    return { rows, total: countValue(totals?.total), amount: totals?.amount ?? null };
  },

  async findById(id: number) {
    const [row] = await getDb().select().from(credits).where(eq(credits.id, id)).limit(1);
    return row ?? null;
  },

  async update(
    id: number,
    input: {
      supplierId?: number;
      customerId?: number;
      paymentType?: number;
      referenceNumber: string | null;
      date: string | null;
      referenceDate: string | null;
      slipNumber: string | null;
      drawType?: number;
      receivedAmount: bigint;
      remark: string | null;
      userId: number;
    },
  ): Promise<void> {
    await getDb()
      .update(credits)
      .set({
        ...(input.supplierId !== undefined ? { supplierId: input.supplierId } : {}),
        ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
        ...(input.paymentType !== undefined ? { paymentType: input.paymentType } : {}),
        referenceNumber: input.referenceNumber,
        date: input.date,
        referenceDate: input.referenceDate,
        slipNumber: input.slipNumber,
        ...(input.drawType !== undefined ? { drawType: input.drawType } : {}),
        receivedAmount: input.receivedAmount,
        remark: input.remark,
        ...touchStamp(input.userId),
      })
      .where(eq(credits.id, id));
  },

  async remove(id: number): Promise<void> {
    await getDb().delete(credits).where(eq(credits.id, id));
  },

  async parties(ids: { supplierIds: number[]; customerIds: number[] }) {
    const supplierRows =
      ids.supplierIds.length === 0
        ? []
        : await getDb()
            .select({ id: suppliers.id, name: suppliers.name, city: suppliers.city })
            .from(suppliers)
            .where(inArray(suppliers.id, ids.supplierIds));
    const customerRows =
      ids.customerIds.length === 0
        ? []
        : await getDb()
            .select({ id: customers.id, name: customers.name, city: customers.city })
            .from(customers)
            .where(inArray(customers.id, ids.customerIds));
    return { suppliers: supplierRows, customers: customerRows };
  },
};
