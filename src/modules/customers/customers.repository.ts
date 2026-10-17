import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { bankDetails, contacts, customerPreferredTransports, customers } from '../../db/schema/parties.js';
import { transports } from '../../db/schema/transports.js';
import {
  ACTIVE_STATUS,
  BankNotFoundError,
  INACTIVE_STATUS,
  isMysqlError,
  uniqueIds,
  type BankInput,
  type ContactInput,
  type StatusFilter,
} from '../parties/party.js';

export type CustomerRow = typeof customers.$inferSelect;
export type CustomerContactRow = typeof contacts.$inferSelect;
export type CustomerBankRow = typeof bankDetails.$inferSelect;

export type CustomerWrite = {
  code?: string;
  name: string | null;
  email: string | null;
  groupName: string | null;
  gstNo: string | null;
  referencedBy: string | null;
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
  customerId: number,
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
      customerId,
      supplierId: null,
      ...audit(userId, now),
    })),
  );
}

async function insertBanks(
  tx: Pick<ReturnType<typeof getDb>, 'insert'>,
  customerId: number,
  items: BankInput[],
  userId: number,
  now: Date,
) {
  if (items.length === 0) {
    return;
  }
  await tx.insert(bankDetails).values(
    items.map((item) => ({
      bankName: item.bankName ?? null,
      ifscCode: item.ifscCode ?? null,
      branchName: item.branchName ?? null,
      accountName: item.accountName ?? null,
      accountNumber: item.accountNumber ?? null,
      customerId,
      supplierId: null,
      ...audit(userId, now),
    })),
  );
}

async function insertTransports(
  tx: Pick<ReturnType<typeof getDb>, 'insert'>,
  customerId: number,
  transportIds: number[],
  userId: number,
  now: Date,
) {
  const ids = uniqueIds(transportIds);
  if (ids.length === 0) {
    return;
  }
  await tx.insert(customerPreferredTransports).values(
    ids.map((transportId) => ({
      customerId,
      transportId,
      ...audit(userId, now),
    })),
  );
}

export const customerRepository = {
  async maxCodeSuffix(): Promise<number | null> {
    const [row] = await getDb()
      .select({
        maxSuffix: sql<number | null>`MAX(CAST(SUBSTRING(${customers.code}, 2) AS UNSIGNED))`,
      })
      .from(customers);
    if (row?.maxSuffix == null) {
      return null;
    }
    return Number(row.maxSuffix);
  },

  async existsByCode(code: string): Promise<boolean> {
    const [row] = await getDb()
      .select({ id: customers.id })
      .from(customers)
      .where(eq(customers.code, code))
      .limit(1);
    return Boolean(row);
  },

  async insert(input: CustomerWrite & { code: string }): Promise<void> {
    const now = new Date();
    await getDb().transaction(async (tx) => {
      const [created] = await tx
        .insert(customers)
        .values({
          code: input.code,
          name: input.name,
          email: input.email,
          groupName: input.groupName,
          gstNo: input.gstNo,
          referencedBy: input.referencedBy,
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
        throw new Error('Customer insert did not return an id');
      }
      if (input.contacts) {
        await insertContacts(tx, created.id, input.contacts, input.userId, now);
      }
      if (input.banks) {
        await insertBanks(tx, created.id, input.banks, input.userId, now);
      }
      if (input.transportIds && input.transportIds.length > 0) {
        await insertTransports(tx, created.id, input.transportIds, input.userId, now);
      }
    });
  },

  async pageActive(page: number, size: number): Promise<{ rows: CustomerRow[]; total: number }> {
    const where = eq(customers.status, ACTIVE_STATUS);
    const [countRow] = await getDb()
      .select({ total: sql<number>`COUNT(*)` })
      .from(customers)
      .where(where);
    const rows = await getDb()
      .select()
      .from(customers)
      .where(where)
      .orderBy(desc(customers.id))
      .limit(size)
      .offset(page * size);
    return { rows, total: Number(countRow?.total ?? 0) };
  },

  async listByFilter(filter: StatusFilter): Promise<CustomerRow[]> {
    const query = getDb().select().from(customers).orderBy(desc(customers.id)).$dynamic();
    if (filter === 'INACTIVE') {
      return query.where(eq(customers.status, INACTIVE_STATUS));
    }
    if (filter === 'ACTIVE') {
      return query.where(eq(customers.status, ACTIVE_STATUS));
    }
    return query;
  },

  async search(
    keyword: string,
    page: number,
    size: number,
  ): Promise<{ rows: CustomerRow[]; total: number }> {
    const pattern = `%${keyword.toLowerCase()}%`;
    const where = and(
      eq(customers.status, ACTIVE_STATUS),
      sql`(
        LOWER(${customers.name}) LIKE ${pattern}
        OR LOWER(${customers.gstNo}) LIKE ${pattern}
        OR LOWER(${contacts.mobileNumber}) LIKE ${pattern}
        OR LOWER(${customers.city}) LIKE ${pattern}
      )`,
    );
    const [countRow] = await getDb()
      .select({ total: sql<number>`COUNT(DISTINCT ${customers.id})` })
      .from(customers)
      .leftJoin(contacts, eq(contacts.customerId, customers.id))
      .where(where);
    const idRows = await getDb()
      .select({ id: customers.id, name: customers.name })
      .from(customers)
      .leftJoin(contacts, eq(contacts.customerId, customers.id))
      .where(where)
      .groupBy(customers.id, customers.name)
      .orderBy(asc(customers.name))
      .limit(size)
      .offset(page * size);
    const ids = idRows.map((row) => row.id);
    if (ids.length === 0) {
      return { rows: [], total: Number(countRow?.total ?? 0) };
    }
    const rows = await getDb().select().from(customers).where(inArray(customers.id, ids));
    const byId = new Map(rows.map((row) => [row.id, row]));
    return {
      rows: ids.flatMap((id) => {
        const row = byId.get(id);
        return row ? [row] : [];
      }),
      total: Number(countRow?.total ?? 0),
    };
  },

  async contactsFor(ids: number[]): Promise<CustomerContactRow[]> {
    if (ids.length === 0) {
      return [];
    }
    return getDb()
      .select()
      .from(contacts)
      .where(inArray(contacts.customerId, ids))
      .orderBy(asc(contacts.id));
  },

  async findByCode(code: string): Promise<CustomerRow | null> {
    const [row] = await getDb().select().from(customers).where(eq(customers.code, code)).limit(1);
    return row ?? null;
  },

  async findDetail(id: number): Promise<{
    customer: CustomerRow;
    contactRows: CustomerContactRow[];
    bankRows: CustomerBankRow[];
    transportRows: Array<{ id: number; name: string }>;
  } | null> {
    const [customer] = await getDb().select().from(customers).where(eq(customers.id, id)).limit(1);
    if (!customer) {
      return null;
    }
    const [contactRows, bankRows, transportRows] = await Promise.all([
      getDb().select().from(contacts).where(eq(contacts.customerId, id)).orderBy(asc(contacts.id)),
      getDb().select().from(bankDetails).where(eq(bankDetails.customerId, id)).orderBy(asc(bankDetails.id)),
      getDb()
        .select({ id: transports.id, name: transports.name })
        .from(customerPreferredTransports)
        .innerJoin(transports, eq(transports.id, customerPreferredTransports.transportId))
        .where(eq(customerPreferredTransports.customerId, id))
        .orderBy(asc(transports.id)),
    ]);
    return { customer, contactRows, bankRows, transportRows };
  },

  async update(id: number, input: CustomerWrite): Promise<void> {
    const now = new Date();
    try {
      await getDb().transaction(async (tx) => {
        await tx
          .update(customers)
          .set({
            name: input.name,
            email: input.email,
            groupName: input.groupName,
            gstNo: input.gstNo,
            referencedBy: input.referencedBy,
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
          .where(eq(customers.id, id));

        if (input.contacts) {
          await tx.delete(contacts).where(eq(contacts.customerId, id));
          await insertContacts(tx, id, input.contacts, input.userId, now);
        }

        if (input.banks) {
          const existing = await tx.select().from(bankDetails).where(eq(bankDetails.customerId, id));
          const existingIds = new Set(existing.map((bank) => bank.id));
          for (const bank of input.banks) {
            if (bank.id != null && !existingIds.has(bank.id)) {
              throw new BankNotFoundError();
            }
          }
          const keep = new Set(
            input.banks.flatMap((bank) => (bank.id == null ? [] : [bank.id])),
          );
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
                customerId: id,
                supplierId: null,
                createdAt: now,
                createdBy: input.userId,
              });
            }
          }
        }

        if (input.transportIds) {
          await tx
            .delete(customerPreferredTransports)
            .where(eq(customerPreferredTransports.customerId, id));
          await insertTransports(tx, id, input.transportIds, input.userId, now);
        }
      });
    } catch (error) {
      if (error instanceof BankNotFoundError || isMysqlError(error)) {
        throw error;
      }
      throw error;
    }
  },

  async deactivate(id: number, userId: number): Promise<void> {
    await getDb()
      .update(customers)
      .set({ status: INACTIVE_STATUS, updatedAt: new Date(), updatedBy: userId })
      .where(eq(customers.id, id));
  },
};
