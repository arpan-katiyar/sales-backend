import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { retailSupplierDeposits, retailSuppliers, retailers } from '../../db/schema/entries.js';
import { customers, suppliers } from '../../db/schema/parties.js';
import { staff } from '../../db/schema/staff.js';
import { ACTIVE_STATUS, INACTIVE_STATUS, auditStamp, countValue, touchStamp } from '../entries/common.js';

export type RetailSupplierWrite = {
  supplierId: number;
  totalAmount: number | null;
  depositAmount: number;
  balanceAmount: number | null;
  depositDate: string | null;
  createDeposit: boolean;
};

export type RetailCreateInput = {
  name: string;
  date: string;
  referredByCustomerId: number | null;
  staffId: number | null;
  commission: string | null;
  suppliers: RetailSupplierWrite[];
  userId: number;
};

export type RetailSearchFilter = {
  fromDate: string | null;
  toDate: string | null;
  customerId: number | null;
  staffId: number | null;
  supplierId: number | null;
  pageIndex: number;
  size: number;
};

function longNumber(value: number | string | bigint | null | undefined): number | null {
  if (value == null) {
    return null;
  }
  return typeof value === 'bigint' ? Number(value) : Number(value);
}

export const retailRepository = {
  async customerExists(id: number): Promise<boolean> {
    const [row] = await getDb().select({ id: customers.id }).from(customers).where(eq(customers.id, id)).limit(1);
    return Boolean(row);
  },

  async staffExists(id: number): Promise<boolean> {
    const [row] = await getDb().select({ id: staff.id }).from(staff).where(eq(staff.id, id)).limit(1);
    return Boolean(row);
  },

  async supplierExists(id: number, activeOnly: boolean): Promise<boolean> {
    const where = activeOnly
      ? and(eq(suppliers.id, id), eq(suppliers.status, ACTIVE_STATUS))
      : eq(suppliers.id, id);
    const [row] = await getDb().select({ id: suppliers.id }).from(suppliers).where(where).limit(1);
    return Boolean(row);
  },

  async create(input: RetailCreateInput): Promise<void> {
    const stamp = auditStamp(input.userId);
    await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(retailers)
        .values({
          name: input.name,
          date: input.date,
          referredByCustomerId: input.referredByCustomerId,
          staffId: input.staffId,
          status: ACTIVE_STATUS,
          commission: input.commission,
          ...stamp,
        })
        .$returningId();
      if (!created) {
        throw Object.assign(new Error('Retail insert failed'), { code: 'ER_UNKNOWN' });
      }
      for (const supplier of input.suppliers) {
        const [retailSupplier] = await tx
          .insert(retailSuppliers)
          .values({
            retailId: created.id,
            supplierId: supplier.supplierId,
            totalAmount: supplier.totalAmount,
            depositAmount: supplier.depositAmount,
            balanceAmount: supplier.balanceAmount,
            status: ACTIVE_STATUS,
            ...stamp,
          })
          .$returningId();
        if (!retailSupplier) {
          throw Object.assign(new Error('Retail supplier insert failed'), { code: 'ER_UNKNOWN' });
        }
        if (supplier.createDeposit) {
          await tx.insert(retailSupplierDeposits).values({
            retailSupplierId: retailSupplier.id,
            depositDate: supplier.depositDate,
            amount: supplier.depositAmount,
            status: ACTIVE_STATUS,
            ...stamp,
          });
        }
      }
    });
  },

  async findById(id: number) {
    const [row] = await getDb().select().from(retailers).where(eq(retailers.id, id)).limit(1);
    return row ?? null;
  },

  async findActive(id: number) {
    const [row] = await getDb()
      .select()
      .from(retailers)
      .where(and(eq(retailers.id, id), eq(retailers.status, ACTIVE_STATUS)))
      .limit(1);
    return row ?? null;
  },

  async updateRetailer(
    id: number,
    input: {
      name: string;
      date: string;
      referredByCustomerId: number | null;
      staffId: number | null;
      commission: string | null;
      userId: number;
    },
  ): Promise<void> {
    await getDb()
      .update(retailers)
      .set({
        name: input.name,
        date: input.date,
        referredByCustomerId: input.referredByCustomerId,
        staffId: input.staffId,
        commission: input.commission,
        ...touchStamp(input.userId),
      })
      .where(eq(retailers.id, id));
  },

  async search(filter: RetailSearchFilter) {
    const conditions = [eq(retailers.status, ACTIVE_STATUS)];
    if (filter.fromDate) {
      conditions.push(gte(retailers.date, filter.fromDate));
    }
    if (filter.toDate) {
      conditions.push(lte(retailers.date, filter.toDate));
    }
    if (filter.customerId != null) {
      conditions.push(eq(retailers.referredByCustomerId, filter.customerId));
    }
    if (filter.staffId != null) {
      conditions.push(eq(retailers.staffId, filter.staffId));
    }
    if (filter.supplierId != null) {
      conditions.push(sql`EXISTS (
        SELECT 1 FROM retail_supplier rs
        WHERE rs.retail_id = ${retailers.id}
          AND rs.supplier_id = ${filter.supplierId}
          AND rs.status = ${ACTIVE_STATUS}
      )`);
    }
    const where = and(...conditions);
    const db = getDb();
    const [totals] = await db.select({ total: sql<string | number | null>`COUNT(*)` }).from(retailers).where(where);
    const rows = await db
      .select({
        id: retailers.id,
        name: retailers.name,
        date: retailers.date,
        customerName: customers.name,
        staffName: staff.name,
      })
      .from(retailers)
      .leftJoin(customers, eq(customers.id, retailers.referredByCustomerId))
      .leftJoin(staff, eq(staff.id, retailers.staffId))
      .where(where)
      .orderBy(desc(retailers.date), desc(retailers.id))
      .limit(filter.size)
      .offset(filter.pageIndex * filter.size);
    return { rows, total: countValue(totals?.total) };
  },

  async activeSuppliers(retailIds: number[]) {
    if (retailIds.length === 0) {
      return [];
    }
    const rows = await getDb()
      .select({
        id: retailSuppliers.id,
        retailId: retailSuppliers.retailId,
        supplierId: suppliers.id,
        supplierName: suppliers.name,
        supplierCity: suppliers.city,
        totalAmount: retailSuppliers.totalAmount,
        depositAmount: retailSuppliers.depositAmount,
        balanceAmount: retailSuppliers.balanceAmount,
        status: retailSuppliers.status,
      })
      .from(retailSuppliers)
      .leftJoin(suppliers, eq(suppliers.id, retailSuppliers.supplierId))
      .where(and(inArray(retailSuppliers.retailId, retailIds), eq(retailSuppliers.status, ACTIVE_STATUS)))
      .orderBy(asc(retailSuppliers.id));
    return rows.map((row) => ({
      ...row,
      totalAmount: longNumber(row.totalAmount),
      depositAmount: longNumber(row.depositAmount),
      balanceAmount: longNumber(row.balanceAmount),
    }));
  },

  async findRetailSupplier(id: number) {
    const [row] = await getDb().select().from(retailSuppliers).where(eq(retailSuppliers.id, id)).limit(1);
    if (!row) {
      return null;
    }
    return {
      ...row,
      totalAmount: longNumber(row.totalAmount),
      depositAmount: longNumber(row.depositAmount),
      balanceAmount: longNumber(row.balanceAmount),
    };
  },

  async updateRetailSupplier(id: number, totalAmount: number, balanceAmount: number, userId: number): Promise<void> {
    await getDb()
      .update(retailSuppliers)
      .set({
        totalAmount,
        balanceAmount,
        ...touchStamp(userId),
      })
      .where(eq(retailSuppliers.id, id));
  },

  async activeSupplierLink(retailId: number, supplierId: number): Promise<boolean> {
    const [row] = await getDb()
      .select({ id: retailSuppliers.id })
      .from(retailSuppliers)
      .where(
        and(
          eq(retailSuppliers.retailId, retailId),
          eq(retailSuppliers.supplierId, supplierId),
          eq(retailSuppliers.status, ACTIVE_STATUS),
        ),
      )
      .limit(1);
    return Boolean(row);
  },

  async addSupplier(retailId: number, supplier: RetailSupplierWrite, userId: number): Promise<void> {
    const stamp = auditStamp(userId);
    await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(retailSuppliers)
        .values({
          retailId,
          supplierId: supplier.supplierId,
          totalAmount: supplier.totalAmount,
          depositAmount: supplier.depositAmount,
          balanceAmount: supplier.balanceAmount,
          status: ACTIVE_STATUS,
          ...stamp,
        })
        .$returningId();
      if (!created) {
        throw Object.assign(new Error('Retail supplier insert failed'), { code: 'ER_UNKNOWN' });
      }
      if (supplier.createDeposit) {
        await tx.insert(retailSupplierDeposits).values({
          retailSupplierId: created.id,
          depositDate: supplier.depositDate,
          amount: supplier.depositAmount,
          status: ACTIVE_STATUS,
          ...stamp,
        });
      }
    });
  },

  async deactivateSupplier(id: number, userId: number): Promise<void> {
    await getDb()
      .update(retailSuppliers)
      .set({ status: INACTIVE_STATUS, ...touchStamp(userId) })
      .where(eq(retailSuppliers.id, id));
  },

  async addDeposit(
    retailSupplierId: number,
    input: { depositDate: string | null; amount: number; depositAmount: number; balanceAmount: number; userId: number },
  ): Promise<void> {
    const stamp = auditStamp(input.userId);
    await getDb().transaction(async (tx) => {
      await tx.insert(retailSupplierDeposits).values({
        retailSupplierId,
        depositDate: input.depositDate,
        amount: input.amount,
        status: ACTIVE_STATUS,
        ...stamp,
      });
      await tx
        .update(retailSuppliers)
        .set({
          depositAmount: input.depositAmount,
          balanceAmount: input.balanceAmount,
          ...touchStamp(input.userId),
        })
        .where(eq(retailSuppliers.id, retailSupplierId));
    });
  },

  async activeDeposits(retailSupplierIds: number[]) {
    if (retailSupplierIds.length === 0) {
      return [];
    }
    const rows = await getDb()
      .select()
      .from(retailSupplierDeposits)
      .where(
        and(
          inArray(retailSupplierDeposits.retailSupplierId, retailSupplierIds),
          eq(retailSupplierDeposits.status, ACTIVE_STATUS),
        ),
      );
    return rows.map((row) => ({
      ...row,
      amount: longNumber(row.amount),
    }));
  },

  async deactivateRetailer(retailId: number, userId: number): Promise<void> {
    const stamp = touchStamp(userId);
    await getDb().transaction(async (tx) => {
      const supplierRows = await tx
        .select({ id: retailSuppliers.id })
        .from(retailSuppliers)
        .where(eq(retailSuppliers.retailId, retailId));
      const supplierIds = supplierRows.map((row) => row.id);
      if (supplierIds.length > 0) {
        await tx
          .update(retailSupplierDeposits)
          .set({ status: INACTIVE_STATUS, ...stamp })
          .where(inArray(retailSupplierDeposits.retailSupplierId, supplierIds));
      }
      await tx
        .update(retailSuppliers)
        .set({ status: INACTIVE_STATUS, ...stamp })
        .where(eq(retailSuppliers.retailId, retailId));
      await tx.update(retailers).set({ status: INACTIVE_STATUS, ...stamp }).where(eq(retailers.id, retailId));
    });
  },

  async detail(id: number) {
    const [row] = await getDb()
      .select({
        id: retailers.id,
        name: retailers.name,
        date: retailers.date,
        customerId: customers.id,
        customerName: customers.name,
        staffId: staff.id,
        staffName: staff.name,
        commission: retailers.commission,
        status: retailers.status,
      })
      .from(retailers)
      .leftJoin(customers, eq(customers.id, retailers.referredByCustomerId))
      .leftJoin(staff, eq(staff.id, retailers.staffId))
      .where(and(eq(retailers.id, id), eq(retailers.status, ACTIVE_STATUS)))
      .limit(1);
    return row ?? null;
  },
};
