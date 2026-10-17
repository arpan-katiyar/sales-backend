import { and, asc, desc, eq, inArray, sql, type AnyColumn } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import {
  bankDetails,
  contacts,
  supplierPreferredTransports,
  suppliers,
} from '../../db/schema/parties.js';
import { transports } from '../../db/schema/transports.js';
import {
  ACTIVE_STATUS,
  BankNotFoundError,
  INACTIVE_STATUS,
  uniqueIds,
  type BankInput,
  type ContactInput,
  type StatusFilter,
} from '../parties/party.js';

export type SupplierRow = typeof suppliers.$inferSelect;
export type SupplierContactRow = typeof contacts.$inferSelect;
export type SupplierBankRow = typeof bankDetails.$inferSelect;

const SORT_COLUMNS: Record<string, AnyColumn> = {
  supplierName: suppliers.name,
  id: suppliers.id,
  createdAt: suppliers.createdAt,
  updatedAt: suppliers.updatedAt,
  code: suppliers.code,
  email: suppliers.email,
  groupName: suppliers.groupName,
  gstNo: suppliers.gstNo,
  commissionScheme: suppliers.commissionScheme,
  commissionRate: suppliers.commissionRate,
  referenceBy: suppliers.referenceBy,
  addressLine1: suppliers.addressLine1,
  addressLine2: suppliers.addressLine2,
  state: suppliers.state,
  city: suppliers.city,
  pinCode: suppliers.pinCode,
  msme: suppliers.msme,
  remark: suppliers.remark,
  status: suppliers.status,
};

export type SupplierWrite = {
  code?: string;
  name: string | null;
  email: string | null;
  groupName: string | null;
  gstNo: string | null;
  commissionScheme: string | null;
  commissionRate: string | null;
  referenceBy: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  state: string | null;
  city: string | null;
  pinCode: string | null;
  msme: string | null;
  remark: string | null;
  contacts: ContactInput[] | null;
  banks: BankInput[] | null;
  transportIds: number[] | null;
  userId: number;
};

function audit(userId: number, now: Date) {
  return { createdAt: now, updatedAt: now, createdBy: userId, updatedBy: userId };
}

async function insertContacts(
  tx: Pick<ReturnType<typeof getDb>, 'insert'>,
  supplierId: number,
  items: ContactInput[],
  userId: number,
  now: Date,
) {
  if (items.length === 0) {
    return;
  }
  await tx.insert(contacts).values(
    items.map((item) => ({
      contactPerson: item.contactPerson ?? null,
      mobileNumber: item.mobileNumber ?? null,
      type: item.type ?? null,
      supplierId,
      customerId: null,
      ...audit(userId, now),
    })),
  );
}

export const supplierRepository = {
  async maxCodeSuffix(): Promise<number | null> {
    const [row] = await getDb()
      .select({
        maxSuffix: sql<number | null>`MAX(CAST(SUBSTRING(${suppliers.code}, 2) AS UNSIGNED))`,
      })
      .from(suppliers);
    if (row?.maxSuffix == null) {
      return null;
    }
    return Number(row.maxSuffix);
  },

  async existsByCode(code: string): Promise<boolean> {
    const [row] = await getDb()
      .select({ id: suppliers.id })
      .from(suppliers)
      .where(eq(suppliers.code, code))
      .limit(1);
    return Boolean(row);
  },

  async insert(input: SupplierWrite & { code: string }): Promise<void> {
    const now = new Date();
    await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(suppliers)
        .values({
          code: input.code,
          name: input.name,
          email: input.email,
          groupName: input.groupName,
          gstNo: input.gstNo,
          commissionScheme: input.commissionScheme,
          commissionRate: input.commissionRate,
          referenceBy: input.referenceBy,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          state: input.state,
          city: input.city,
          pinCode: input.pinCode,
          msme: input.msme,
          remark: input.remark,
          status: ACTIVE_STATUS,
          ...audit(input.userId, now),
        })
        .$returningId();
      if (!created) {
        throw new Error('Supplier insert did not return an id');
      }
      if (input.contacts) {
        await insertContacts(tx, created.id, input.contacts, input.userId, now);
      }
      if (input.banks) {
        if (input.banks.length > 0) {
          await tx.insert(bankDetails).values(
            input.banks.map((bank) => ({
              bankName: bank.bankName ?? null,
              ifscCode: bank.ifscCode ?? null,
              branchName: bank.branchName ?? null,
              accountName: bank.accountName ?? null,
              accountNumber: bank.accountNumber ?? null,
              supplierId: created.id,
              customerId: null,
              ...audit(input.userId, now),
            })),
          );
        }
      }
      if (input.transportIds && input.transportIds.length > 0) {
        await tx.insert(supplierPreferredTransports).values(
          uniqueIds(input.transportIds).map((transportId) => ({
            supplierId: created.id,
            transportId,
            ...audit(input.userId, now),
          })),
        );
      }
    });
  },

  async pageActive(page: number, size: number): Promise<{ rows: SupplierRow[]; total: number }> {
    const where = eq(suppliers.status, ACTIVE_STATUS);
    const [countRow] = await getDb()
      .select({ total: sql<number>`COUNT(*)` })
      .from(suppliers)
      .where(where);
    const rows = await getDb()
      .select()
      .from(suppliers)
      .where(where)
      .orderBy(desc(suppliers.createdAt))
      .limit(size)
      .offset(page * size);
    return { rows, total: Number(countRow?.total ?? 0) };
  },

  async listByFilter(filter: StatusFilter): Promise<SupplierRow[]> {
    const ordered = getDb().select().from(suppliers).orderBy(desc(suppliers.id)).$dynamic();
    if (filter === 'INACTIVE') {
      return ordered.where(eq(suppliers.status, INACTIVE_STATUS));
    }
    if (filter === 'ACTIVE') {
      return ordered.where(eq(suppliers.status, ACTIVE_STATUS));
    }
    return ordered;
  },

  async search(
    keyword: string,
    page: number,
    size: number,
    sortBy: string,
    sortDir: string,
  ): Promise<{ rows: SupplierRow[]; total: number }> {
    const column = SORT_COLUMNS[sortBy];
    const direction = sortDir.toLowerCase();
    if (!column || (direction !== 'asc' && direction !== 'desc')) {
      throw new Error(`No property ${sortBy} found`);
    }
    const pattern = `%${keyword.toLowerCase()}%`;
    const where = and(
      eq(suppliers.status, ACTIVE_STATUS),
      sql`(
        LOWER(${suppliers.name}) LIKE ${pattern}
        OR LOWER(${suppliers.gstNo}) LIKE ${pattern}
        OR LOWER(${contacts.mobileNumber}) LIKE ${pattern}
        OR LOWER(${suppliers.city}) LIKE ${pattern}
      )`,
    );
    const [countRow] = await getDb()
      .select({ total: sql<number>`COUNT(DISTINCT ${suppliers.id})` })
      .from(suppliers)
      .leftJoin(contacts, eq(contacts.supplierId, suppliers.id))
      .where(where);
    const idRows = await getDb()
      .select({ id: suppliers.id })
      .from(suppliers)
      .leftJoin(contacts, eq(contacts.supplierId, suppliers.id))
      .where(where)
      .groupBy(suppliers.id, column as typeof suppliers.name)
      .orderBy(direction === 'desc' ? desc(column as typeof suppliers.name) : asc(column as typeof suppliers.name))
      .limit(size)
      .offset(page * size);
    const ids = idRows.map((row) => row.id);
    if (ids.length === 0) {
      return { rows: [], total: Number(countRow?.total ?? 0) };
    }
    const rows = await getDb().select().from(suppliers).where(inArray(suppliers.id, ids));
    const byId = new Map(rows.map((row) => [row.id, row]));
    return {
      rows: ids.flatMap((id) => {
        const row = byId.get(id);
        return row ? [row] : [];
      }),
      total: Number(countRow?.total ?? 0),
    };
  },

  async contactsFor(ids: number[]): Promise<SupplierContactRow[]> {
    if (ids.length === 0) {
      return [];
    }
    return getDb()
      .select()
      .from(contacts)
      .where(inArray(contacts.supplierId, ids))
      .orderBy(asc(contacts.id));
  },

  async findByCode(code: string): Promise<SupplierRow | null> {
    const [row] = await getDb().select().from(suppliers).where(eq(suppliers.code, code)).limit(1);
    return row ?? null;
  },

  async findDetail(id: number) {
    const [supplier] = await getDb().select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
    if (!supplier) {
      return null;
    }
    const [contactRows, bankRows, transportRows] = await Promise.all([
      getDb().select().from(contacts).where(eq(contacts.supplierId, id)).orderBy(asc(contacts.id)),
      getDb()
        .select()
        .from(bankDetails)
        .where(eq(bankDetails.supplierId, id))
        .orderBy(asc(bankDetails.id)),
      getDb()
        .select({ id: transports.id, name: transports.name })
        .from(supplierPreferredTransports)
        .innerJoin(transports, eq(transports.id, supplierPreferredTransports.transportId))
        .where(eq(supplierPreferredTransports.supplierId, id))
        .orderBy(asc(transports.id)),
    ]);
    return { supplier, contactRows, bankRows, transportRows };
  },

  async update(id: number, input: SupplierWrite): Promise<void> {
    const now = new Date();
    await getDb().transaction(async (tx) => {
      await tx
        .update(suppliers)
        .set({
          name: input.name,
          email: input.email,
          groupName: input.groupName,
          gstNo: input.gstNo,
          commissionScheme: input.commissionScheme,
          commissionRate: input.commissionRate,
          referenceBy: input.referenceBy,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          state: input.state,
          city: input.city,
          pinCode: input.pinCode,
          msme: input.msme,
          remark: input.remark,
          updatedAt: now,
          updatedBy: input.userId,
        })
        .where(eq(suppliers.id, id));

      if (input.contacts) {
        await tx.delete(contacts).where(eq(contacts.supplierId, id));
        await insertContacts(tx, id, input.contacts, input.userId, now);
      }

      if (input.banks) {
        const existing = await tx.select().from(bankDetails).where(eq(bankDetails.supplierId, id));
        const existingIds = new Set(existing.map((bank) => bank.id));
        for (const bank of input.banks) {
          if (bank.id != null && !existingIds.has(bank.id)) {
            throw new BankNotFoundError();
          }
        }
        const keep = new Set(input.banks.flatMap((bank) => (bank.id == null ? [] : [bank.id])));
        const remove = existing.flatMap((bank) => (keep.has(bank.id) ? [] : [bank.id]));
        if (remove.length > 0) {
          await tx.delete(bankDetails).where(inArray(bankDetails.id, remove));
        }
        for (const bank of input.banks) {
          const values = {
            bankName: bank.bankName ?? null,
            ifscCode: bank.ifscCode ?? null,
            branchName: bank.branchName ?? null,
            accountName: bank.accountName ?? null,
            accountNumber: bank.accountNumber ?? null,
            updatedAt: now,
            updatedBy: input.userId,
          };
          if (bank.id != null) {
            await tx.update(bankDetails).set(values).where(eq(bankDetails.id, bank.id));
          } else {
            await tx.insert(bankDetails).values({
              ...values,
              supplierId: id,
              customerId: null,
              createdAt: now,
              createdBy: input.userId,
            });
          }
        }
      }

      if (input.transportIds) {
        await tx
          .delete(supplierPreferredTransports)
          .where(eq(supplierPreferredTransports.supplierId, id));
        if (input.transportIds.length > 0) {
          await tx.insert(supplierPreferredTransports).values(
            uniqueIds(input.transportIds).map((transportId) => ({
              supplierId: id,
              transportId,
              ...audit(input.userId, now),
            })),
          );
        }
      }
    });
  },

  async deactivate(id: number, userId: number): Promise<void> {
    await getDb()
      .update(suppliers)
      .set({ status: INACTIVE_STATUS, updatedAt: new Date(), updatedBy: userId })
      .where(eq(suppliers.id, id));
  },
};
