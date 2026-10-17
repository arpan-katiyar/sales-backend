import { and, count, desc, eq, sql } from 'drizzle-orm';

import { getDb } from '../../db/client.js';
import { staff } from '../../db/schema/staff.js';

export const ACTIVE_STATUS = 1;
export const INACTIVE_STATUS = 2;

export type StaffRow = typeof staff.$inferSelect;

function isDuplicateError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === 'ER_DUP_ENTRY'
  );
}

export class StaffDuplicateError extends Error {
  constructor() {
    super('Duplicate staff phone');
    this.name = 'StaffDuplicateError';
  }
}

export const staffRepository = {
  async insert(input: {
    name: string;
    phone: string | null;
    joiningDate: string;
    userId: number;
  }): Promise<void> {
    const now = new Date();
    try {
      await getDb().insert(staff).values({
        name: input.name,
        phone: input.phone,
        joiningDate: input.joiningDate,
        status: ACTIVE_STATUS,
        createdAt: now,
        updatedAt: now,
        createdBy: input.userId,
        updatedBy: input.userId,
      });
    } catch (error) {
      if (isDuplicateError(error)) {
        throw new StaffDuplicateError();
      }
      throw error;
    }
  },

  async findById(id: number): Promise<StaffRow | null> {
    const [row] = await getDb().select().from(staff).where(eq(staff.id, id)).limit(1);
    return row ?? null;
  },

  async pageActive(page: number, size: number): Promise<{ rows: StaffRow[]; total: number }> {
    const where = eq(staff.status, ACTIVE_STATUS);
    const [countRow] = await getDb().select({ total: count() }).from(staff).where(where);
    const rows = await getDb()
      .select()
      .from(staff)
      .where(where)
      .orderBy(desc(staff.id))
      .limit(size)
      .offset(page * size);
    return { rows, total: Number(countRow?.total ?? 0) };
  },

  async listActive(): Promise<StaffRow[]> {
    return getDb()
      .select()
      .from(staff)
      .where(eq(staff.status, ACTIVE_STATUS))
      .orderBy(desc(staff.id));
  },

  async searchActive(
    keyword: string,
    page: number,
    size: number,
  ): Promise<{ rows: StaffRow[]; total: number }> {
    const where = and(
      eq(staff.status, ACTIVE_STATUS),
      sql`LOWER(${staff.name}) LIKE ${`%${keyword.toLowerCase()}%`}`,
    );
    const [countRow] = await getDb().select({ total: count() }).from(staff).where(where);
    const rows = await getDb()
      .select()
      .from(staff)
      .where(where)
      .limit(size)
      .offset(page * size);
    return { rows, total: Number(countRow?.total ?? 0) };
  },

  async update(
    id: number,
    input: { name: string; phone: string | null; joiningDate: string; userId: number },
  ): Promise<void> {
    try {
      await getDb()
        .update(staff)
        .set({
          name: input.name,
          phone: input.phone,
          joiningDate: input.joiningDate,
          updatedAt: new Date(),
          updatedBy: input.userId,
        })
        .where(eq(staff.id, id));
    } catch (error) {
      if (isDuplicateError(error)) {
        throw new StaffDuplicateError();
      }
      throw error;
    }
  },

  async deactivate(id: number, userId: number): Promise<void> {
    await getDb()
      .update(staff)
      .set({
        status: INACTIVE_STATUS,
        updatedAt: new Date(),
        updatedBy: userId,
      })
      .where(eq(staff.id, id));
  },
};
