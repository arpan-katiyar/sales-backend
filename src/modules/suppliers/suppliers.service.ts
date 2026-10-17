import { AppError } from '../../common/errors/app-error.js';
import { logger } from '../../common/logger.js';
import {
  BankNotFoundError,
  DATA_ACCESS,
  DUPLICATE_CODE,
  UNEXPECTED,
  decimalToNumber,
  formatAddress,
  formatCode,
  isBlank,
  isMysqlError,
  statusName,
  toPage,
  toPreferredTransport,
  trimToNull,
  type BankInput,
  type ContactInput,
  type Msme,
  type StatusFilter,
} from '../parties/party.js';
import {
  supplierRepository,
  type SupplierContactRow,
  type SupplierRow,
} from './suppliers.repository.js';

type SupplierStore = Pick<
  typeof supplierRepository,
  | 'maxCodeSuffix'
  | 'existsByCode'
  | 'insert'
  | 'pageActive'
  | 'listByFilter'
  | 'search'
  | 'contactsFor'
  | 'findByCode'
  | 'findDetail'
  | 'update'
  | 'deactivate'
>;

export type SupplierAddBody = {
  supplierName: string;
  email?: string | null;
  referenceBy?: string | null;
  supplierGroup?: string | null;
  supplierGstNo?: string | null;
  supplierMsme?: Msme | null;
  commissionScheme?: string | null;
  commissionRate?: number | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  state?: string | null;
  city?: string | null;
  pinCode?: string | null;
  remark?: string | null;
  contacts?: ContactInput[] | null;
  bankDetails?: BankInput[] | null;
  preferredTransportIds: number[];
  userId: number;
};

export type SupplierUpdateBody = {
  supplierName?: string | null;
  email?: string | null;
  groupName?: string | null;
  gstNo?: string | null;
  commissionScheme?: string | null;
  commissionRate?: number | null;
  referenceBy?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  state?: string | null;
  city?: string | null;
  pinCode?: string | null;
  msme?: Msme | null;
  remark?: string | null;
  contacts?: ContactInput[] | null;
  bankDetails?: BankInput[] | null;
  preferredTransportIds?: number[] | null;
  userId: number;
};

function duplicateCode(): AppError {
  return new AppError(DUPLICATE_CODE, 'Duplicate entryDuplicate entry found for: code', 200);
}

function unexpected(suffix: string): AppError {
  return new AppError(UNEXPECTED, `Unexpected error occur while ${suffix}`, 200);
}

function rate(value?: number | null): string | null {
  return value == null ? null : String(value);
}

function banks(items: BankInput[] | null | undefined, trim: boolean): BankInput[] | null {
  if (items == null) {
    return null;
  }
  return items.map((bank) => ({
    id: bank.id ?? null,
    bankName: trim ? trimToNull(bank.bankName) : (bank.bankName ?? null),
    ifscCode: trim ? trimToNull(bank.ifscCode) : (bank.ifscCode ?? null),
    branchName: trim ? trimToNull(bank.branchName) : (bank.branchName ?? null),
    accountName: trim ? trimToNull(bank.accountName) : (bank.accountName ?? null),
    accountNumber: trim ? trimToNull(bank.accountNumber) : (bank.accountNumber ?? null),
  }));
}

function listItem(row: SupplierRow, contactRows: SupplierContactRow[]) {
  return {
    id: row.id,
    code: row.code,
    supplierName: row.name,
    supplierGstNo: row.gstNo,
    address: formatAddress(row.addressLine1, row.addressLine2, ' '),
    city: row.city,
    mobile: contactRows[0]?.mobileNumber ?? null,
  };
}

function groupContacts(rows: SupplierContactRow[]): Map<number, SupplierContactRow[]> {
  const grouped = new Map<number, SupplierContactRow[]>();
  for (const row of rows) {
    if (row.supplierId == null) {
      continue;
    }
    const current = grouped.get(row.supplierId) ?? [];
    current.push(row);
    grouped.set(row.supplierId, current);
  }
  return grouped;
}

export function createSupplierService(store: SupplierStore) {
  return {
    async add(input: SupplierAddBody): Promise<{ message: string }> {
      try {
        const code = formatCode('S', await store.maxCodeSuffix());
        if (await store.existsByCode(code)) {
          throw duplicateCode();
        }
        const name = input.supplierName;
        await store.insert({
          code,
          name,
          email: input.email ?? null,
          groupName: isBlank(input.supplierGroup) ? name : (input.supplierGroup ?? null),
          gstNo: input.supplierGstNo ?? null,
          commissionScheme: input.commissionScheme ?? null,
          commissionRate: rate(input.commissionRate),
          referenceBy: input.referenceBy ?? null,
          addressLine1: input.addressLine1 ?? null,
          addressLine2: input.addressLine2 ?? null,
          state: input.state ?? null,
          city: input.city ?? null,
          pinCode: input.pinCode ?? null,
          msme: input.supplierMsme ?? 'SMALL',
          remark: input.remark ?? null,
          contacts: input.contacts ?? null,
          banks: banks(input.bankDetails, false),
          transportIds: input.preferredTransportIds,
          userId: input.userId,
        });
        return { message: 'Supplier added successfully' };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error({ err: error }, 'Error while adding supplier');
        const detail = error instanceof Error ? error.message : 'null';
        throw unexpected(detail);
      }
    },

    async list(page: number, size: number) {
      const { rows, total } = await store.pageActive(page, size);
      const grouped = groupContacts(await store.contactsFor(rows.map((row) => row.id)));
      return toPage(
        rows.map((row) => listItem(row, grouped.get(row.id) ?? [])),
        page,
        size,
        total,
        true,
      );
    },

    async listAll(filter: StatusFilter) {
      const rows = await store.listByFilter(filter);
      return rows.map((row) => ({
        id: row.id,
        supplierName: row.name,
        supplierGroup: row.groupName,
        supplierGstNo: row.gstNo,
        supplierMsme: row.msme,
        city: row.city,
      }));
    },

    async search(keyword: string, page: number, size: number, sortBy: string, sortDir: string) {
      const trimmed = keyword.trim();
      if (!trimmed) {
        return toPage([], page, size, 0, true);
      }
      const { rows, total } = await store.search(trimmed, page, size, sortBy, sortDir);
      const grouped = groupContacts(await store.contactsFor(rows.map((row) => row.id)));
      return toPage(
        rows.map((row) => listItem(row, grouped.get(row.id) ?? [])),
        page,
        size,
        total,
        true,
      );
    },

    async getById(id: number) {
      try {
        const detail = await store.findDetail(id);
        if (!detail) {
          throw unexpected('Unexpected error while fetching supplier');
        }
        return {
          success: true,
          message: 'Supplier fetched successfully',
          data: {
            id: detail.supplier.id,
            code: detail.supplier.code,
            supplierName: detail.supplier.name,
            email: detail.supplier.email,
            groupName: detail.supplier.groupName,
            gstNo: detail.supplier.gstNo,
            commissionScheme: detail.supplier.commissionScheme,
            commissionRate: decimalToNumber(detail.supplier.commissionRate),
            referenceBy: detail.supplier.referenceBy,
            addressLine1: detail.supplier.addressLine1,
            addressLine2: detail.supplier.addressLine2,
            state: detail.supplier.state,
            city: detail.supplier.city,
            pinCode: detail.supplier.pinCode,
            msme: detail.supplier.msme,
            bankDetails: detail.bankRows.map((bank) => ({
              id: bank.id,
              bankName: bank.bankName,
              ifscCode: bank.ifscCode,
              branchName: bank.branchName,
              accountName: bank.accountName,
              accountNumber: bank.accountNumber,
            })),
            remark: detail.supplier.remark,
            status: statusName(detail.supplier.status),
            contacts: detail.contactRows.map((contact) => ({
              contactPerson: contact.contactPerson,
              mobileNumber: contact.mobileNumber,
              type: contact.type,
            })),
            preferredTransports: detail.transportRows.map((transport) =>
              toPreferredTransport(transport.id, transport.name),
            ),
          },
        };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        if (isMysqlError(error)) {
          throw new AppError(DATA_ACCESS, 'Data access error occurred.Database error while fetching supplier', 200);
        }
        logger.error({ err: error }, 'Error while fetching supplier');
        throw unexpected('Unexpected error while fetching supplier');
      }
    },

    async update(id: number, input: SupplierUpdateBody) {
      try {
        const detail = await store.findDetail(id);
        if (!detail) {
          throw unexpected('Unexpected error while updating supplier');
        }
        const name = input.supplierName ?? null;
        await store.update(id, {
          name,
          email: input.email ?? null,
          groupName: isBlank(input.groupName) ? name : (input.groupName ?? null),
          gstNo: input.gstNo ?? null,
          commissionScheme: input.commissionScheme ?? null,
          commissionRate: rate(input.commissionRate),
          referenceBy: input.referenceBy ?? null,
          addressLine1: input.addressLine1 ?? null,
          addressLine2: input.addressLine2 ?? null,
          state: input.state ?? null,
          city: input.city ?? null,
          pinCode: input.pinCode ?? null,
          msme: input.msme ?? 'SMALL',
          remark: input.remark ?? null,
          contacts: input.contacts ?? null,
          banks: banks(input.bankDetails, true),
          transportIds: input.preferredTransportIds ?? null,
          userId: input.userId,
        });
        return { success: true as const, message: 'Supplier updated successfully', data: null };
      } catch (error) {
        if (isMysqlError(error)) {
          throw new AppError(
            DATA_ACCESS,
            'Data access error occurred.Database error while updating supplier',
            200,
          );
        }
        if (error instanceof BankNotFoundError) {
          throw unexpected('Unexpected error while updating supplier');
        }
        if (error instanceof AppError) {
          throw error;
        }
        logger.error({ err: error }, 'Error while updating supplier');
        throw unexpected('Unexpected error while updating supplier');
      }
    },

    async remove(code: string | null, userId: number): Promise<{ message: string }> {
      try {
        if (code == null) {
          return { message: 'Unexpected error occurred while deleting supplier: null' };
        }
        const existing = await store.findByCode(code);
        if (!existing) {
          return { message: `Unexpected error occurred while deleting supplier: ${code}` };
        }
        await store.deactivate(existing.id, userId);
        return { message: `Supplier with code: ${code} successfully deleted` };
      } catch (error) {
        if (isMysqlError(error)) {
          return { message: `Database error occurred while deleting supplier: ${code}` };
        }
        logger.error({ err: error }, 'Error while deleting supplier');
        return { message: `Unexpected error occurred while deleting supplier: ${code}` };
      }
    },
  };
}

export const supplierService = createSupplierService(supplierRepository);
