import { and, asc, count, desc, eq, inArray, ne, sql } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { transportContacts, transports } from '../../db/schema/transports.js';

export const ACTIVE_STATUS = 1;
export const DELETE_STATUS = 3;

export type TransportRow = typeof transports.$inferSelect;
export type TransportContactRow = typeof transportContacts.$inferSelect;

export type TransportContactInput = {
  contactPerson: string | null;
  contactNumber: string | null;
  type: string | null;
};

export type TransportWriteInput = {
  name: string;
  email: string | null;
  gstNo: string | null;
  state: string | null;
  city: string | null;
  pinCode: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  status: number | null;
  contacts: TransportContactInput[];
  userId: number;
};

export class TransportDataAccessError extends Error {
  constructor() {
    super('Transport data access error');
    this.name = 'TransportDataAccessError';
  }
}

function isMysqlError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' && error.code.startsWith('ER_');
}

async function insertContacts(
  tx: Pick<ReturnType<typeof getDb>, 'insert'>,
  transportId: number,
  contacts: TransportContactInput[],
  userId: number,
  now: Date,
): Promise<void> {
  if (contacts.length === 0) {
    return;
  }
  await tx.insert(transportContacts).values(
    contacts.map((contact) => ({
      contactPerson: contact.contactPerson,
      contactNumber: contact.contactNumber,
      type: contact.type,
      transportId,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    })),
  );
}

export const transportRepository = {
  async existsByName(name: string, excludeId?: number): Promise<boolean> {
    const nameMatch = sql`LOWER(${transports.name}) = LOWER(${name})`;
    const where = excludeId === undefined ? nameMatch : and(nameMatch, ne(transports.id, excludeId));
    const [row] = await getDb().select({ id: transports.id }).from(transports).where(where).limit(1);
    return Boolean(row);
  },

  async findById(id: number): Promise<TransportRow | null> {
    const [row] = await getDb().select().from(transports).where(eq(transports.id, id)).limit(1);
    return row ?? null;
  },

  async insert(input: TransportWriteInput): Promise<number> {
    const now = new Date();
    try {
      return await getDb().transaction(async (tx) => {
        const [created] = await tx
          .insert(transports)
          .values({
            name: input.name,
            email: input.email,
            gstNo: input.gstNo,
            state: input.state,
            city: input.city,
            pinCode: input.pinCode,
            addressLine1: input.addressLine1,
            addressLine2: input.addressLine2,
            status: ACTIVE_STATUS,
            createdAt: now,
            updatedAt: now,
            createdBy: input.userId,
            updatedBy: input.userId,
          })
          .$returningId();
        if (!created) {
          throw new TransportDataAccessError();
        }
        await insertContacts(tx, created.id, input.contacts, input.userId, now);
        return created.id;
      });
    } catch (error) {
      if (error instanceof TransportDataAccessError || isMysqlError(error)) {
        throw new TransportDataAccessError();
      }
      throw error;
    }
  },

  async update(id: number, input: TransportWriteInput): Promise<void> {
    const now = new Date();
    try {
      await getDb().transaction(async (tx) => {
        await tx
          .update(transports)
          .set({
            name: input.name,
            email: input.email,
            gstNo: input.gstNo,
            state: input.state,
            city: input.city,
            pinCode: input.pinCode,
            addressLine1: input.addressLine1,
            addressLine2: input.addressLine2,
            status: input.status,
            updatedAt: now,
            updatedBy: input.userId,
          })
          .where(eq(transports.id, id));
        await tx.delete(transportContacts).where(eq(transportContacts.transportId, id));
        await insertContacts(tx, id, input.contacts, input.userId, now);
      });
    } catch (error) {
      if (isMysqlError(error)) {
        throw new TransportDataAccessError();
      }
      throw error;
    }
  },

  async markDeleted(id: number, userId: number): Promise<void> {
    await getDb()
      .update(transports)
      .set({
        status: DELETE_STATUS,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(transports.id, id));
  },

  async pageActive(page: number, size: number): Promise<{ rows: TransportRow[]; total: number }> {
    const where = eq(transports.status, ACTIVE_STATUS);
    const [countRow] = await getDb().select({ total: count() }).from(transports).where(where);
    const rows = await getDb()
      .select()
      .from(transports)
      .where(where)
      .orderBy(desc(transports.createdAt))
      .limit(size)
      .offset(page * size);
    return { rows, total: Number(countRow?.total ?? 0) };
  },

  async searchActive(
    keyword: string,
    page: number,
    size: number,
  ): Promise<{ rows: TransportRow[]; total: number }> {
    const pattern = `%${keyword.toLowerCase()}%`;
    const where = and(
      eq(transports.status, ACTIVE_STATUS),
      sql`(LOWER(${transports.name}) LIKE ${pattern} OR LOWER(${transports.city}) LIKE ${pattern} OR LOWER(${transports.gstNo}) LIKE ${pattern})`,
    );
    const [countRow] = await getDb().select({ total: count() }).from(transports).where(where);
    const rows = await getDb()
      .select()
      .from(transports)
      .where(where)
      .orderBy(asc(transports.name))
      .limit(size)
      .offset(page * size);
    return { rows, total: Number(countRow?.total ?? 0) };
  },

  async listActiveLite(): Promise<Array<{ id: number; name: string }>> {
    return getDb()
      .select({ id: transports.id, name: transports.name })
      .from(transports)
      .where(eq(transports.status, ACTIVE_STATUS))
      .orderBy(desc(transports.id));
  },

  async contactsFor(ids: number[]): Promise<TransportContactRow[]> {
    if (ids.length === 0) {
      return [];
    }
    return getDb()
      .select()
      .from(transportContacts)
      .where(inArray(transportContacts.transportId, ids))
      .orderBy(asc(transportContacts.id));
  },
};
