import { describe, expect, it } from 'vitest';

import { formatAddress, formatCode } from '../src/modules/parties/party.js';
import { createCustomerService } from '../src/modules/customers/customers.service.js';
import type { CustomerRow } from '../src/modules/customers/customers.repository.js';
import { createSupplierService } from '../src/modules/suppliers/suppliers.service.js';
import type { SupplierRow } from '../src/modules/suppliers/suppliers.repository.js';

function customer(overrides: Partial<CustomerRow> = {}): CustomerRow {
  return {
    id: 3,
    code: 'C000003',
    name: 'Aman Traders',
    groupName: 'Aman Traders',
    gstNo: 'GST1',
    referencedBy: null,
    addressLine1: 'Line 1',
    addressLine2: 'Line 2',
    city: 'Lucknow',
    pinCode: '226001',
    msme: 'SMALL',
    remark: null,
    status: 1,
    createdAt: new Date(),
    createdBy: 1,
    updatedAt: new Date(),
    updatedBy: 1,
    email: null,
    state: 'UP',
    ...overrides,
  };
}

function supplier(overrides: Partial<SupplierRow> = {}): SupplierRow {
  return {
    id: 8,
    code: 'S000008',
    name: 'Sharma Mills',
    email: null,
    groupName: 'Sharma Mills',
    gstNo: 'GST9',
    commissionScheme: 'FLAT',
    commissionRate: '2.50',
    addressLine1: 'Gate',
    addressLine2: 'Road',
    city: 'Kanpur',
    pinCode: '208001',
    msme: 'MICRO',
    remark: null,
    status: 1,
    createdAt: new Date('2026-10-02T00:00:00.000Z'),
    createdBy: 1,
    updatedAt: new Date(),
    updatedBy: 1,
    referenceBy: null,
    state: 'UP',
    ...overrides,
  };
}

describe('party helpers', () => {
  it('formats codes and addresses the way the Java mappers do', () => {
    expect(formatCode('C', 2087)).toBe('C002088');
    expect(formatCode('S', null)).toBe('S000001');
    expect(formatAddress('Line 1', 'Line 2', ', ')).toBe('Line 1, Line 2');
    expect(formatAddress('Gate', 'Road', ' ')).toBe('Gate Road');
  });
});

describe('customer service', () => {
  const store = {
    async maxCodeSuffix() {
      return 3;
    },
    async existsByCode(code: string) {
      return code === 'C000004';
    },
    async insert() {
      return undefined;
    },
    async pageActive() {
      return { rows: [customer()], total: 1 };
    },
    async listByFilter() {
      return [customer()];
    },
    async search() {
      return { rows: [customer()], total: 1 };
    },
    async contactsFor() {
      return [
        {
          id: 1,
          contactPerson: 'Ravi',
          mobileNumber: '9999999999',
          supplierId: null,
          customerId: 3,
          type: 'PRIMARY',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 1,
          updatedBy: 1,
        },
      ];
    },
    async findByCode() {
      return null;
    },
    async findDetail() {
      return null;
    },
    async update() {
      return undefined;
    },
    async deactivate() {
      return undefined;
    },
  };

  it('keeps the customer list page zero-based and joins the address with a comma', async () => {
    const service = createCustomerService(store);
    const page = await service.list(0, 8);
    expect(page.page).toBe(0);
    expect(page.content[0]).toMatchObject({
      customerName: 'Aman Traders',
      customerGstNo: 'GST1',
      address: 'Line 1, Line 2',
      contacts: [{ mobileNumber: '9999999999' }],
    });
  });

  it('uses a one-based page for search and an empty page for a blank keyword', async () => {
    const service = createCustomerService(store);
    await expect(service.search('  ', 0, 10)).resolves.toMatchObject({
      content: [],
      page: 1,
      totalPages: 0,
      last: true,
    });
  });

  it('returns the duplicate code message and the wrapped missing-customer error', async () => {
    const service = createCustomerService(store);
    await expect(service.add({ customerName: 'Aman', preferredTransportIds: [], userId: 1 })).rejects.toMatchObject({
      code: 1005,
      message: 'Duplicate entryDuplicate entry found for: code',
    });
    await expect(service.getById(99)).rejects.toMatchObject({
      code: 1006,
      message: 'Unexpected error occur while Unexpected error while fetching customer',
    });
    await expect(service.remove('C000099', 1)).rejects.toMatchObject({
      code: 1006,
      message: 'Unexpected error occur while deleting customer',
    });
  });

  it('defaults a blank group and MSME when adding', async () => {
    let saved: { groupName: string | null; msme: string | null; code: string } | undefined;
    const service = createCustomerService({
      ...store,
      async existsByCode() {
        return false;
      },
      async insert(input) {
        saved = { groupName: input.groupName, msme: input.msme, code: input.code };
      },
    });
    await service.add({ customerName: 'New Buyer', customerGroup: '  ', userId: 1 });
    expect(saved).toEqual({ groupName: 'New Buyer', msme: 'SMALL', code: 'C000004' });
  });
});

describe('supplier service', () => {
  const store = {
    async maxCodeSuffix() {
      return 8;
    },
    async existsByCode() {
      return false;
    },
    async insert() {
      return undefined;
    },
    async pageActive() {
      return { rows: [supplier(), supplier({ id: 2, status: 2 })], total: 1 };
    },
    async listByFilter() {
      return [supplier()];
    },
    async search() {
      return { rows: [supplier()], total: 1 };
    },
    async contactsFor() {
      return [
        {
          id: 4,
          contactPerson: 'A',
          mobileNumber: '8888888888',
          supplierId: 8,
          customerId: null,
          type: null,
          createdAt: null,
          updatedAt: null,
          createdBy: null,
          updatedBy: null,
        },
      ];
    },
    async findByCode() {
      return null;
    },
    async findDetail() {
      return null;
    },
    async update() {
      return undefined;
    },
    async deactivate() {
      return undefined;
    },
  };

  it('returns a one-based page, a space-joined address, and the first mobile', async () => {
    const service = createSupplierService(store);
    const page = await service.list(0, 8);
    expect(page.page).toBe(1);
    expect(page.content[0]).toMatchObject({
      supplierName: 'Sharma Mills',
      supplierGstNo: 'GST9',
      address: 'Gate Road',
      mobile: '8888888888',
    });
  });

  it('returns a message instead of an error when the supplier code is missing', async () => {
    const service = createSupplierService(store);
    await expect(service.remove('S009999', 1)).resolves.toEqual({
      message: 'Unexpected error occurred while deleting supplier: S009999',
    });
  });

  it('uses the summary field names', async () => {
    const service = createSupplierService(store);
    await expect(service.listAll('ACTIVE')).resolves.toEqual([
      {
        id: 8,
        supplierName: 'Sharma Mills',
        supplierGroup: 'Sharma Mills',
        supplierGstNo: 'GST9',
        supplierMsme: 'MICRO',
        city: 'Kanpur',
      },
    ]);
  });
});
