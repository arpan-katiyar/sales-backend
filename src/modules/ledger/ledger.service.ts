import { AppError } from '../../common/errors/app-error.js';
import { rupeeNumber } from '../../common/utils/money.js';
import { formatAddress } from '../parties/party.js';
import { apiSuccess, paymentName, rethrow } from '../entries/common.js';
import { ledgerRepository } from './ledger.repository.js';
import type { LedgerView } from './ledger.schema.js';

export type LedgerEntry = {
  date: string | null;
  invoiceNo: string | null;
  particular: string;
  debit: number;
  credit: number;
  runningBalance: number | null;
  sequence: number;
};

export type LedgerResult = {
  party: {
    id: number;
    name: string | null;
    email: string | null;
    phone: string | null;
    gstNo: string | null;
    address: string;
  };
  ledgerType: LedgerView;
  totalDebit: number;
  totalCredit: number;
  balance: number;
  entries: Array<Omit<LedgerEntry, 'sequence'>>;
};

function partyResponse(row: {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  gstNo: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
}) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    gstNo: row.gstNo,
    address: formatAddress(row.addressLine1, row.addressLine2, ', '),
  };
}

export function buildLedgerEntries(
  bills: Array<{ date: string | null; invoiceNo: string | null; amount: bigint | null }>,
  credits: Array<{ date: string | null; billNumber: string | null; particular: string; amount: bigint | null }>,
  view: LedgerView,
): LedgerResult['entries'] {
  const rows: LedgerEntry[] = [];
  bills.forEach((bill, index) => {
    const amount = rupeeNumber(bill.amount);
    if (amount == null) {
      throw new Error('Missing bill amount');
    }
    rows.push({
      date: bill.date,
      invoiceNo: bill.invoiceNo,
      particular: 'Bill',
      debit: view === 'SUPPLIER' ? amount : 0,
      credit: view === 'CUSTOMER' ? amount : 0,
      runningBalance: null,
      sequence: index,
    });
  });
  credits.forEach((credit, index) => {
    const amount = rupeeNumber(credit.amount);
    if (amount == null) {
      throw new Error('Missing credit amount');
    }
    rows.push({
      date: credit.date,
      invoiceNo: credit.billNumber,
      particular: credit.particular,
      debit: view === 'CUSTOMER' ? amount : 0,
      credit: view === 'SUPPLIER' ? amount : 0,
      runningBalance: null,
      sequence: bills.length + index,
    });
  });
  rows.sort((left, right) => {
    if (left.date == null || right.date == null) {
      throw new Error('Missing ledger date');
    }
    const compared = left.date.localeCompare(right.date);
    return compared === 0 ? left.sequence - right.sequence : compared;
  });
  let balancePaisa = 0n;
  return rows.map((row) => {
    const creditPaisa = BigInt(Math.round(row.credit * 100));
    const debitPaisa = BigInt(Math.round(row.debit * 100));
    balancePaisa += creditPaisa - debitPaisa;
    return {
      date: row.date,
      invoiceNo: row.invoiceNo,
      particular: row.particular,
      debit: row.debit,
      credit: row.credit,
      runningBalance: rupeeNumber(balancePaisa),
    };
  });
}

export const ledgerService = {
  async getLedger(supplierId: number, customerId: number, viewType: LedgerView) {
    try {
      const partyRow =
        viewType === 'CUSTOMER'
          ? await ledgerRepository.supplier(supplierId)
          : await ledgerRepository.customer(customerId);
      if (!partyRow) {
        throw viewType === 'CUSTOMER'
          ? new AppError(1017, `supplier not found ${supplierId}`)
          : new AppError(1016, `customer not found for id  ${customerId}`);
      }
      const [billRows, creditRows] = await Promise.all([
        ledgerRepository.bills(supplierId, customerId),
        ledgerRepository.credits(supplierId, customerId),
      ]);
      const entries = buildLedgerEntries(
        billRows.map((row) => ({ date: row.date, invoiceNo: row.invoiceNo, amount: row.amount })),
        creditRows.map((row) => {
          const particular = paymentName(row.paymentType);
          if (particular == null) {
            throw new Error('Missing payment type');
          }
          return {
            date: row.date,
            billNumber: row.billNumber,
            particular,
            amount: row.amount,
          };
        }),
        viewType,
      );
      const totalDebit = sumRupees(entries.map((entry) => entry.debit));
      const totalCredit = sumRupees(entries.map((entry) => entry.credit));
      const ledger = {
        party: partyResponse(partyRow),
        ledgerType: viewType,
        totalDebit,
        totalCredit,
        balance: rupeeNumber(asPaisa(totalCredit) - asPaisa(totalDebit)) ?? 0,
        entries,
      };
      return apiSuccess('Ledger fetched successfully', ledger);
    } catch (error) {
      rethrow(error);
    }
  },
};

function asPaisa(value: number): bigint {
  return BigInt(Math.round(value * 100));
}

function sumRupees(values: number[]): number {
  const total = values.reduce((sum, value) => sum + asPaisa(value), 0n);
  return rupeeNumber(total) ?? 0;
}

export function ledgerFilename(name: string | null, now = new Date()): string {
  if (name == null) {
    throw new Error('Missing party name');
  }
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const time = [now.getHours(), now.getMinutes(), now.getSeconds()].map((part) => String(part).padStart(2, '0')).join('');
  return `ledger_${name.replaceAll(/\s+/g, '_')}_${stamp}_${time}.xlsx`;
}
