import { describe, expect, it } from 'vitest';

import { monthLabel, monthsBetween, normalizeIds, resolveRange } from '../src/modules/analytics/analytics.schema.js';
import { buildLedgerEntries } from '../src/modules/ledger/ledger.service.js';

describe('remaining API contracts', () => {
  it('uses the Java twelve-month analytics window', () => {
    expect(resolveRange(null, null, new Date(2026, 9, 17))).toEqual({
      fromDate: '2025-11-01',
      toDate: '2026-10-17',
    });
    expect(normalizeIds([])).toBeNull();
    expect(normalizeIds([4, 8])).toEqual([4, 8]);
    expect(monthLabel(2026, 10)).toBe("Oct'26");
    expect(monthsBetween('2026-10-01', '2026-12-01')).toEqual([
      { year: 2026, month: 10 },
      { year: 2026, month: 11 },
      { year: 2026, month: 12 },
    ]);
  });

  it('posts bills and credits on opposite sides and keeps a running balance', () => {
    const customer = buildLedgerEntries(
      [{ date: '2026-10-01', invoiceNo: 'INV-1', amount: 100000n }],
      [{ date: '2026-10-02', billNumber: 'R-1', particular: 'UPI', amount: 40000n }],
      'CUSTOMER',
    );
    expect(customer).toEqual([
      {
        date: '2026-10-01',
        invoiceNo: 'INV-1',
        particular: 'Bill',
        debit: 0,
        credit: 1000,
        runningBalance: 1000,
      },
      {
        date: '2026-10-02',
        invoiceNo: 'R-1',
        particular: 'UPI',
        debit: 400,
        credit: 0,
        runningBalance: 600,
      },
    ]);

    const supplier = buildLedgerEntries(
      [{ date: '2026-10-01', invoiceNo: 'INV-1', amount: 100000n }],
      [{ date: '2026-10-01', billNumber: 'R-1', particular: 'CASH', amount: 25000n }],
      'SUPPLIER',
    );
    expect(supplier[0]).toMatchObject({ particular: 'Bill', debit: 1000, credit: 0, runningBalance: -1000 });
    expect(supplier[1]).toMatchObject({ particular: 'CASH', debit: 0, credit: 250, runningBalance: -750 });
  });
});
