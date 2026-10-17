export const ACTIVE_STATUS = 1;
export const INACTIVE_STATUS = 2;

export const DUPLICATE_CODE = 1005;
export const UNEXPECTED = 1006;
export const DATA_ACCESS = 1007;

export type StatusFilter = 'ALL' | 'ACTIVE' | 'INACTIVE';
export type Msme = 'MICRO' | 'SMALL' | 'MEDIUM';

export type ContactInput = {
  contactPerson?: string | null;
  mobileNumber?: string | null;
  type?: string | null;
};

export type BankInput = {
  id?: number | null;
  bankName?: string | null;
  ifscCode?: string | null;
  branchName?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
};

export type ContactResponse = {
  contactPerson: string | null;
  mobileNumber: string | null;
  type: string | null;
};

export type BankResponse = {
  id: number;
  bankName: string | null;
  ifscCode: string | null;
  branchName: string | null;
  accountName: string | null;
  accountNumber: string | null;
};

export type PreferredTransportResponse = {
  id: number;
  name: string;
  gstNo: null;
  contactNumber: null;
  city: null;
  address: null;
  status: null;
};

export class BankNotFoundError extends Error {
  constructor() {
    super('Bank detail not found');
    this.name = 'BankNotFoundError';
  }
}

export function isMysqlError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string' &&
    error.code.startsWith('ER_')
  );
}

export function isBlank(value?: string | null): boolean {
  return value == null || value.trim() === '';
}

export function trimToNull(value?: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function formatCode(prefix: 'C' | 'S', maxSuffix: number | null): string {
  const next = (maxSuffix ?? 0) + 1;
  return `${prefix}${String(next).padStart(6, '0')}`;
}

export function formatAddress(
  line1: string | null,
  line2: string | null,
  separator: string,
): string {
  return [line1, line2].filter((part) => part != null && part.trim() !== '').join(separator);
}

export function statusName(status: number | null): 'ACTIVE' | 'INACTIVE' | 'DELETE' | null {
  if (status === 1) {
    return 'ACTIVE';
  }
  if (status === 2) {
    return 'INACTIVE';
  }
  if (status === 3) {
    return 'DELETE';
  }
  return null;
}

export function decimalToNumber(value: string | number | null): number | null {
  if (value == null || value === '') {
    return null;
  }
  return Number(value);
}

export function toPreferredTransport(id: number, name: string): PreferredTransportResponse {
  return {
    id,
    name,
    gstNo: null,
    contactNumber: null,
    city: null,
    address: null,
    status: null,
  };
}

export function toPage<T>(
  content: T[],
  pageIndex: number,
  size: number,
  totalElements: number,
  oneBased: boolean,
) {
  const totalPages = size > 0 ? Math.ceil(totalElements / size) : 0;
  return {
    content,
    page: oneBased ? pageIndex + 1 : pageIndex,
    size,
    totalElements,
    totalPages,
    last: totalPages === 0 || pageIndex >= totalPages - 1,
  };
}

export function uniqueIds(ids: number[]): number[] {
  return [...new Set(ids)];
}
