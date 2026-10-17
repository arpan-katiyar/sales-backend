import { and, asc, desc, gte, inArray, lte, sql } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { bills, credits, purchases } from '../../db/schema/entries.js';
import { customers, suppliers } from '../../db/schema/parties.js';
import { staff } from '../../db/schema/staff.js';
import { countValue } from '../entries/common.js';

export type AmountRow = { id: number | null; amount: string | number | bigint | null };
export type MonthRow = { year: number; month: number; amount: string | number | bigint | null; count: number };
export type StaffCountRow = { staffId: number | null; count: number };

export const analyticsRepository = {
  async monthlyBills(fromDate: string, toDate: string, supplierIds: number[] | null, customerIds: number[] | null) {
    const year = sql<number>`YEAR(${bills.date})`;
    const month = sql<number>`MONTH(${bills.date})`;
    const rows = await getDb()
      .select({
        year,
        month,
        amount: sql<string>`COALESCE(SUM(${bills.billAmount}), 0)`,
        count: sql<number>`COUNT(${bills.id})`,
      })
      .from(bills)
      .where(
        and(
          sql`${bills.date} IS NOT NULL`,
          gte(bills.date, fromDate),
          lte(bills.date, toDate),
          supplierIds ? inArray(bills.supplierId, supplierIds) : undefined,
          customerIds ? inArray(bills.customerId, customerIds) : undefined,
        ),
      )
      .groupBy(year, month)
      .orderBy(year, month);
    return rows.map(toMonth);
  },

  async monthlyCredits(fromDate: string, toDate: string, supplierIds: number[] | null, customerIds: number[] | null) {
    const year = sql<number>`YEAR(${credits.date})`;
    const month = sql<number>`MONTH(${credits.date})`;
    const rows = await getDb()
      .select({
        year,
        month,
        amount: sql<string>`COALESCE(SUM(${credits.receivedAmount}), 0)`,
        count: sql<number>`COUNT(${credits.id})`,
      })
      .from(credits)
      .where(
        and(
          sql`${credits.date} IS NOT NULL`,
          gte(credits.date, fromDate),
          lte(credits.date, toDate),
          supplierIds ? inArray(credits.supplierId, supplierIds) : undefined,
          customerIds ? inArray(credits.customerId, customerIds) : undefined,
        ),
      )
      .groupBy(year, month)
      .orderBy(year, month);
    return rows.map(toMonth);
  },

  async supplierBills(fromDate: string, toDate: string, supplierIds: number[] | null): Promise<AmountRow[]> {
    return getDb()
      .select({
        id: bills.supplierId,
        amount: sql<string>`COALESCE(SUM(${bills.billAmount}), 0)`,
      })
      .from(bills)
      .where(and(gte(bills.date, fromDate), lte(bills.date, toDate), supplierIds ? inArray(bills.supplierId, supplierIds) : undefined))
      .groupBy(bills.supplierId)
      .orderBy(desc(sql`COALESCE(SUM(${bills.billAmount}), 0)`));
  },

  async supplierCredits(fromDate: string, toDate: string, supplierIds: number[]): Promise<AmountRow[]> {
    if (supplierIds.length === 0) {
      return [];
    }
    return getDb()
      .select({
        id: credits.supplierId,
        amount: sql<string>`COALESCE(SUM(${credits.receivedAmount}), 0)`,
      })
      .from(credits)
      .where(and(gte(credits.date, fromDate), lte(credits.date, toDate), inArray(credits.supplierId, supplierIds)))
      .groupBy(credits.supplierId);
  },

  async customerBills(fromDate: string, toDate: string, customerIds: number[] | null): Promise<AmountRow[]> {
    return getDb()
      .select({
        id: bills.customerId,
        amount: sql<string>`COALESCE(SUM(${bills.billAmount}), 0)`,
      })
      .from(bills)
      .where(and(gte(bills.date, fromDate), lte(bills.date, toDate), customerIds ? inArray(bills.customerId, customerIds) : undefined))
      .groupBy(bills.customerId)
      .orderBy(desc(sql`COALESCE(SUM(${bills.billAmount}), 0)`));
  },

  async customerCredits(fromDate: string, toDate: string, customerIds: number[]): Promise<AmountRow[]> {
    if (customerIds.length === 0) {
      return [];
    }
    return getDb()
      .select({
        id: credits.customerId,
        amount: sql<string>`COALESCE(SUM(${credits.receivedAmount}), 0)`,
      })
      .from(credits)
      .where(and(gte(credits.date, fromDate), lte(credits.date, toDate), inArray(credits.customerId, customerIds)))
      .groupBy(credits.customerId);
  },

  async staffSupplierCounts(fromDate: string, toDate: string): Promise<StaffCountRow[]> {
    const rows = await getDb()
      .select({
        staffId: purchases.staffId,
        count: sql<number>`COUNT(DISTINCT ${purchases.supplierId})`,
      })
      .from(purchases)
      .where(and(gte(purchases.date, fromDate), lte(purchases.date, toDate)))
      .groupBy(purchases.staffId);
    return rows.map((row) => ({ staffId: row.staffId, count: countValue(row.count) }));
  },

  async staffCustomerCounts(fromDate: string, toDate: string): Promise<StaffCountRow[]> {
    const rows = await getDb()
      .select({
        staffId: purchases.staffId,
        count: sql<number>`COUNT(DISTINCT ${purchases.customerId})`,
      })
      .from(purchases)
      .where(and(gte(purchases.date, fromDate), lte(purchases.date, toDate)))
      .groupBy(purchases.staffId);
    return rows.map((row) => ({ staffId: row.staffId, count: countValue(row.count) }));
  },

  async staffNames(): Promise<Map<number, string>> {
    const rows = await getDb().select({ id: staff.id, name: staff.name }).from(staff).orderBy(asc(staff.id));
    return new Map(rows.map((row) => [row.id, row.name]));
  },

  async supplierNames(): Promise<Map<number, string | null>> {
    const rows = await getDb().select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
    return new Map(rows.map((row) => [row.id, row.name]));
  },

  async customerNames(): Promise<Map<number, string | null>> {
    const rows = await getDb().select({ id: customers.id, name: customers.name }).from(customers);
    return new Map(rows.map((row) => [row.id, row.name]));
  },
};

function toMonth(row: { year: number; month: number; amount: string | number | bigint | null; count: unknown }): MonthRow {
  return {
    year: Number(row.year),
    month: Number(row.month),
    amount: row.amount,
    count: countValue(row.count),
  };
}
