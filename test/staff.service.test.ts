import { describe, expect, it } from 'vitest';

import { toPagedResponse } from '../src/common/paged.js';
import { createStaffService } from '../src/modules/staff/staff.service.js';
import type { StaffRow } from '../src/modules/staff/staff.repository.js';

function row(overrides: Partial<StaffRow> = {}): StaffRow {
  return {
    id: 10,
    name: 'Aman Shukla',
    phone: '9910756557',
    joiningDate: '2007-08-04',
    status: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 1,
    updatedBy: 1,
    ...overrides,
  };
}

function memoryStore(initial: StaffRow[] = [row()]) {
  const rows = initial.map((item) => ({ ...item }));
  return {
    rows,
    async insert() {
      return undefined;
    },
    async findById(id: number) {
      return rows.find((item) => item.id === id) ?? null;
    },
    async pageActive(page: number, size: number) {
      const active = rows.filter((item) => item.status === 1).sort((a, b) => b.id - a.id);
      return { rows: active.slice(page * size, page * size + size), total: active.length };
    },
    async listActive() {
      return rows.filter((item) => item.status === 1).sort((a, b) => b.id - a.id);
    },
    async searchActive(keyword: string, page: number, size: number) {
      const matched = rows.filter(
        (item) => item.status === 1 && item.name.toLowerCase().includes(keyword.toLowerCase()),
      );
      return { rows: matched.slice(page * size, page * size + size), total: matched.length };
    },
    async update(id: number, input: { name: string; phone: string | null; joiningDate: string }) {
      const current = rows.find((item) => item.id === id);
      if (!current) {
        return;
      }
      current.name = input.name;
      current.phone = input.phone;
      current.joiningDate = input.joiningDate;
    },
    async deactivate(id: number) {
      const current = rows.find((item) => item.id === id);
      if (current) {
        current.status = 2;
      }
    },
  };
}

describe('paged response', () => {
  it('uses a one-based page number like the Java response', () => {
    expect(toPagedResponse(['a'], 0, 8, 1)).toMatchObject({
      page: 1,
      size: 8,
      totalElements: 1,
      totalPages: 1,
      last: true,
    });
  });
});

describe('staff service', () => {
  it('lists active staff newest first with a calendar joining date', async () => {
    const service = createStaffService(
      memoryStore([row({ id: 1, name: 'Older' }), row({ id: 3, name: 'Newer', status: 2 })]),
    );
    const page = await service.list(0, 8);
    expect(page.content).toEqual([
      {
        staffId: 1,
        staffName: 'Older',
        phone: '9910756557',
        joiningDate: '2007-08-04',
      },
    ]);
    expect(page.page).toBe(1);
  });

  it('returns an empty page when the search keyword is blank', async () => {
    const service = createStaffService(memoryStore());
    await expect(service.search('   ', 0, 8)).resolves.toMatchObject({
      content: [],
      totalElements: 0,
      totalPages: 0,
      last: true,
      page: 1,
    });
  });

  it('soft-deletes by marking the staff inactive', async () => {
    const store = memoryStore();
    const service = createStaffService(store);
    await expect(service.deactivate(10, 4)).resolves.toEqual({
      message: 'Staff ID: 10 became INACTIVE',
    });
    expect(store.rows[0]?.status).toBe(2);
  });

  it('returns the Java not-found payload', async () => {
    const service = createStaffService(memoryStore([]));
    await expect(service.getById(99)).rejects.toMatchObject({
      code: 1111,
      message: 'Data not found. ',
      httpStatus: 200,
    });
  });
});
