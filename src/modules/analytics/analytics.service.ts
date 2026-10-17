import { roundPaisaToRupee } from '../../common/utils/money.js';
import { apiSuccess, rethrow } from '../entries/common.js';
import { analyticsRepository } from './analytics.repository.js';
import type { AmountRow } from './analytics.repository.js';
import { monthLabel, monthsBetween, normalizeIds, resolveRange } from './analytics.schema.js';

type Dataset = {
  label: string;
  data: number[];
  unit: string;
};

type Chart = {
  labels: string[];
  datasets: Dataset[];
};

const METRICS = [
  { label: 'Bill Amount', unit: '₹', pick: (row: MonthPoint) => row.billAmount },
  { label: 'Credit Amount', unit: '₹', pick: (row: MonthPoint) => row.creditAmount },
  { label: 'Bill Count', unit: 'COUNT', pick: (row: MonthPoint) => row.billCount },
  { label: 'Credit Count', unit: 'COUNT', pick: (row: MonthPoint) => row.creditCount },
] as const;

type MonthPoint = {
  month: string;
  billAmount: number;
  creditAmount: number;
  billCount: number;
  creditCount: number;
};

function paisaAmount(value: string | number | bigint | null | undefined): number {
  if (value == null || value === '') {
    return 0;
  }
  return roundPaisaToRupee(typeof value === 'bigint' ? value : BigInt(value));
}

function amountMap(rows: AmountRow[]): Map<number, number> {
  return new Map(rows.filter((row): row is AmountRow & { id: number } => row.id != null).map((row) => [row.id, paisaAmount(row.amount)]));
}

export const analyticsService = {
  async monthly(body: { fromDate?: unknown; toDate?: unknown; supplierIds?: number[] | null; customerIds?: number[] | null }) {
    try {
      const range = resolveRange(body.fromDate, body.toDate);
      const supplierIds = normalizeIds(body.supplierIds);
      const customerIds = normalizeIds(body.customerIds);
      const [bills, credits] = await Promise.all([
        analyticsRepository.monthlyBills(range.fromDate, range.toDate, supplierIds, customerIds),
        analyticsRepository.monthlyCredits(range.fromDate, range.toDate, supplierIds, customerIds),
      ]);
      const points = new Map<string, MonthPoint>();
      for (const month of monthsBetween(range.fromDate, range.toDate)) {
        const key = `${month.year}-${month.month}`;
        points.set(key, {
          month: monthLabel(month.year, month.month),
          billAmount: 0,
          creditAmount: 0,
          billCount: 0,
          creditCount: 0,
        });
      }
      for (const row of bills) {
        const key = `${row.year}-${row.month}`;
        const current = points.get(key) ?? {
          month: monthLabel(row.year, row.month),
          billAmount: 0,
          creditAmount: 0,
          billCount: 0,
          creditCount: 0,
        };
        current.billAmount = paisaAmount(row.amount);
        current.billCount = row.count;
        points.set(key, current);
      }
      for (const row of credits) {
        const key = `${row.year}-${row.month}`;
        const current = points.get(key) ?? {
          month: monthLabel(row.year, row.month),
          billAmount: 0,
          creditAmount: 0,
          billCount: 0,
          creditCount: 0,
        };
        current.creditAmount = paisaAmount(row.amount);
        current.creditCount = row.count;
        points.set(key, current);
      }
      const records = [...points.values()];
      return apiSuccess('Monthly analytics fetched successfully', {
        labels: records.map((row) => row.month),
        datasets: METRICS.map((metric) => ({
          label: metric.label,
          data: records.map((row) => metric.pick(row)),
          unit: metric.unit,
        })),
      });
    } catch (error) {
      rethrow(error);
    }
  },

  async staff(body: { fromDate?: unknown; toDate?: unknown }) {
    try {
      const range = resolveRange(body.fromDate, body.toDate);
      const [supplierCounts, customerCounts, names] = await Promise.all([
        analyticsRepository.staffSupplierCounts(range.fromDate, range.toDate),
        analyticsRepository.staffCustomerCounts(range.fromDate, range.toDate),
        analyticsRepository.staffNames(),
      ]);
      const supplierMap = new Map(supplierCounts.filter((row) => row.staffId != null).map((row) => [row.staffId as number, row.count]));
      const customerMap = new Map(customerCounts.filter((row) => row.staffId != null).map((row) => [row.staffId as number, row.count]));
      const ids = [...new Set([...supplierMap.keys(), ...customerMap.keys()])].filter((id) => names.has(id));
      ids.sort((left, right) => (names.get(left) ?? '').localeCompare(names.get(right) ?? ''));
      const labels = ids.map((id) => names.get(id) ?? '');
      const chart = (label: string, data: number[]): Chart => ({
        labels,
        datasets: [{ label, data, unit: 'COUNT' }],
      });
      return apiSuccess('Staff analytics fetched successfully', {
        supplierVsStaff: chart('Supplier Count', ids.map((id) => supplierMap.get(id) ?? 0)),
        customerVsStaff: chart('Customer Count', ids.map((id) => customerMap.get(id) ?? 0)),
        supplierAndCustomerVsStaff: chart(
          'Total Count',
          ids.map((id) => (supplierMap.get(id) ?? 0) + (customerMap.get(id) ?? 0)),
        ),
      });
    } catch (error) {
      rethrow(error);
    }
  },

  async suppliers(body: { fromDate?: unknown; toDate?: unknown; supplierIds?: number[] | null }) {
    try {
      const range = resolveRange(body.fromDate, body.toDate);
      const supplierIds = normalizeIds(body.supplierIds);
      let bills = await analyticsRepository.supplierBills(range.fromDate, range.toDate, supplierIds);
      if (supplierIds == null && bills.length > 20) {
        bills = bills.slice(0, 20);
      }
      const activeIds = bills.map((row) => row.id).filter((id): id is number => id != null);
      const [credits, names] = await Promise.all([
        analyticsRepository.supplierCredits(range.fromDate, range.toDate, activeIds),
        analyticsRepository.supplierNames(),
      ]);
      const creditsById = amountMap(credits);
      return apiSuccess('Supplier amount analytics fetched successfully', {
        supplierVsAmount: amountChart(
          bills,
          names,
          creditsById,
          'Bill Amount',
          'Credit Amount',
        ),
      });
    } catch (error) {
      rethrow(error);
    }
  },

  async customers(body: { fromDate?: unknown; toDate?: unknown; customerIds?: number[] | null }) {
    try {
      const range = resolveRange(body.fromDate, body.toDate);
      const customerIds = normalizeIds(body.customerIds);
      let bills = await analyticsRepository.customerBills(range.fromDate, range.toDate, customerIds);
      if (customerIds == null && bills.length > 20) {
        bills = bills.slice(0, 20);
      }
      const activeIds = bills.map((row) => row.id).filter((id): id is number => id != null);
      const [credits, names] = await Promise.all([
        analyticsRepository.customerCredits(range.fromDate, range.toDate, activeIds),
        analyticsRepository.customerNames(),
      ]);
      return apiSuccess('Customer amount analytics fetched successfully', {
        customerVsAmount: amountChart(bills, names, amountMap(credits), 'Bill Amount', 'Credit Amount'),
      });
    } catch (error) {
      rethrow(error);
    }
  },
};

function amountChart(
  bills: AmountRow[],
  names: Map<number, string | null>,
  credits: Map<number, number>,
  billLabel: string,
  creditLabel: string,
): Chart {
  const labels: string[] = [];
  const billAmounts: number[] = [];
  const creditAmounts: number[] = [];
  for (const bill of bills) {
    if (bill.id == null || !names.has(bill.id)) {
      continue;
    }
    labels.push(names.get(bill.id) ?? '');
    billAmounts.push(paisaAmount(bill.amount));
    creditAmounts.push(credits.get(bill.id) ?? 0);
  }
  return {
    labels,
    datasets: [
      { label: billLabel, data: billAmounts, unit: '₹' },
      { label: creditLabel, data: creditAmounts, unit: '₹' },
    ],
  };
}
