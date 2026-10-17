import { describe, expect, it } from 'vitest';

import { createTransportService } from '../src/modules/transports/transports.service.js';
import type { TransportContactRow, TransportRow } from '../src/modules/transports/transports.repository.js';

function transport(overrides: Partial<TransportRow> = {}): TransportRow {
  return {
    id: 4,
    name: 'Sharma Roadlines',
    gstNo: 'GST1',
    city: 'Lucknow',
    status: 1,
    createdAt: new Date('2026-10-01T00:00:00.000Z'),
    createdBy: 1,
    updatedAt: new Date('2026-10-01T00:00:00.000Z'),
    updatedBy: 1,
    email: 'road@example.com',
    state: 'UP',
    pinCode: '226001',
    addressLine1: 'Line 1',
    addressLine2: null,
    ...overrides,
  };
}

function memoryStore(initial: TransportRow[] = [transport()]) {
  const rows = initial.map((item) => ({ ...item }));
  const contacts: TransportContactRow[] = [
    {
      id: 1,
      contactPerson: 'Aman',
      contactNumber: '9999999999',
      type: 'PRIMARY',
      transportId: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 1,
      updatedBy: 1,
    },
  ];
  return {
    rows,
    async existsByName(name: string, excludeId?: number) {
      return rows.some(
        (item) => item.name.toLowerCase() === name.toLowerCase() && item.id !== excludeId,
      );
    },
    async findById(id: number) {
      return rows.find((item) => item.id === id) ?? null;
    },
    async insert() {
      return 20;
    },
    async update(id: number, input: { name: string; status: number | null }) {
      const current = rows.find((item) => item.id === id);
      if (current) {
        current.name = input.name;
        current.status = input.status;
      }
    },
    async markDeleted(id: number) {
      const current = rows.find((item) => item.id === id);
      if (current) {
        current.status = 3;
      }
    },
    async pageActive(page: number, size: number) {
      const active = rows.filter((item) => item.status === 1);
      return { rows: active.slice(page * size, page * size + size), total: active.length };
    },
    async searchActive(keyword: string, page: number, size: number) {
      const matched = rows.filter(
        (item) =>
          item.status === 1 &&
          [item.name, item.city, item.gstNo].some((value) =>
            value?.toLowerCase().includes(keyword.toLowerCase()),
          ),
      );
      return { rows: matched.slice(page * size, page * size + size), total: matched.length };
    },
    async listActiveLite() {
      return rows
        .filter((item) => item.status === 1)
        .sort((a, b) => b.id - a.id)
        .map((item) => ({ id: item.id, name: item.name }));
    },
    async contactsFor(ids: number[]) {
      return contacts.filter((item) => ids.includes(item.transportId));
    },
  };
}

const body = {
  name: ' New Lines ',
  email: '  ',
  gstNo: 'GST9',
  contacts: [{ contactPerson: 'Ravi', contactNumber: '8888888888', type: 'OFFICE' }],
  state: 'UP',
  city: 'Kanpur',
  pincode: '208001',
  addressLine1: 'Gate 2',
  addressLine2: null,
  status: 'ACTIVE' as const,
  userId: 7,
};

describe('transport service', () => {
  it('returns the Java duplicate-name message', async () => {
    const service = createTransportService(memoryStore());
    await expect(service.add({ ...body, name: 'sharma roadlines' })).rejects.toMatchObject({
      code: 1005,
      message: 'Duplicate entryDuplicate entry found for: transport name',
      httpStatus: 200,
    });
  });

  it('uses different not-found messages for update and delete', async () => {
    const service = createTransportService(memoryStore([]));
    await expect(service.update(9, body)).rejects.toMatchObject({
      code: 1008,
      message: 'Transport not found',
    });
    await expect(service.remove(9, 1)).rejects.toMatchObject({
      code: 1008,
      message: 'Transport not foundTransport not found',
    });
  });

  it('lists active transports with the enum name and without pin code', async () => {
    const service = createTransportService(memoryStore([transport(), transport({ id: 5, status: 3 })]));
    const page = await service.list(0, 5);
    expect(page.page).toBe(1);
    expect(page.content).toHaveLength(1);
    expect(page.content[0]).toMatchObject({
      id: 4,
      status: 'ACTIVE',
      contacts: [{ contactNumber: '9999999999' }],
    });
    expect(page.content[0]).not.toHaveProperty('pinCode');
    expect(page.content[0]).not.toHaveProperty('pincode');
  });

  it('returns an empty page for a blank search', async () => {
    const service = createTransportService(memoryStore());
    await expect(service.search('  ', 1, 10)).resolves.toMatchObject({
      content: [],
      page: 2,
      size: 10,
      totalElements: 0,
      totalPages: 0,
      last: true,
    });
  });

  it('soft-deletes by setting the delete status', async () => {
    const store = memoryStore();
    const service = createTransportService(store);
    await expect(service.remove(4, 2)).resolves.toEqual({
      success: true,
      message: 'Transport marked as deleted',
    });
    expect(store.rows[0]?.status).toBe(3);
  });
});
