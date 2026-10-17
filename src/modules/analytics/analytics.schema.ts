import { z } from 'zod';

import { isIsoDate, optionalDate } from '../entries/common.js';

const idList = z.array(z.number().int()).nullable().optional();

export const monthlyAnalyticsSchema = z.object({
  fromDate: z.unknown().optional(),
  toDate: z.unknown().optional(),
  supplierIds: idList,
  customerIds: idList,
});

export const staffAnalyticsSchema = z.object({
  fromDate: z.unknown().optional(),
  toDate: z.unknown().optional(),
});

export const supplierAmountSchema = z.object({
  fromDate: z.unknown().optional(),
  toDate: z.unknown().optional(),
  supplierIds: idList,
});

export const customerAmountSchema = z.object({
  fromDate: z.unknown().optional(),
  toDate: z.unknown().optional(),
  customerIds: idList,
});

export type AnalyticsRange = {
  fromDate: string;
  toDate: string;
};

export function normalizeIds(ids: number[] | null | undefined): number[] | null {
  return ids == null || ids.length === 0 ? null : ids;
}

export function resolveRange(fromDate: unknown, toDate: unknown, today = new Date()): AnalyticsRange {
  const end = optionalDate(toDate) ?? formatDay(today);
  const start = optionalDate(fromDate) ?? shiftMonths(end, 11);
  return { fromDate: start, toDate: end };
}

function formatDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function shiftMonths(iso: string, months: number): string {
  if (!isIsoDate(iso)) {
    throw new Error('Invalid date');
  }
  const [year, month] = iso.split('-').map(Number);
  const shifted = new Date(year ?? 1970, (month ?? 1) - 1 - months, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, '0')}-01`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month - 1]}'${String(year % 100).padStart(2, '0')}`;
}

export function monthsBetween(fromDate: string, toDate: string): Array<{ year: number; month: number }> {
  const start = splitMonth(fromDate);
  const end = splitMonth(toDate);
  const months: Array<{ year: number; month: number }> = [];
  let cursor = start.year * 12 + (start.month - 1);
  const last = end.year * 12 + (end.month - 1);
  while (cursor <= last) {
    months.push({ year: Math.floor(cursor / 12), month: (cursor % 12) + 1 });
    cursor += 1;
  }
  return months;
}

function splitMonth(iso: string): { year: number; month: number } {
  const [year, month] = iso.split('-').map(Number);
  return { year: year ?? 1970, month: month ?? 1 };
}
