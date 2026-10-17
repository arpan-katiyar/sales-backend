import { AppError } from '../../common/errors/app-error.js';
import { logger } from '../../common/logger.js';
import {
  BankNotFoundError,
  DATA_ACCESS,
  DUPLICATE_CODE,
  UNEXPECTED,
  formatAddress,
  formatCode,
  isBlank,
  isMysqlError,
  statusName,
  toPage,
  toPreferredTransport,
  trimToNull,
  type BankInput,
  type BankResponse,
  type ContactInput,
  type ContactResponse,
  type Msme,
  type PreferredTransportResponse,
  type StatusFilter,
} from '../parties/party.js';
import {
  customerRepository,
  type CustomerBankRow,
  type CustomerContactRow,
  type CustomerRow,
} from './customers.repository.js';

type CustomerStore = Pick<
  typeof customerRepository,
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

export type CustomerAddBody = {
  customerName: string;
  email?: string | null;
  customerGroup?: string | null;
  customerGstNo?: string | null;
  customerMsme?: Msme | null;
  referencedBy?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  state?: string | null;
  city?: string | null;
  pinCode?: string | null;
  remark?: string | null;
  contacts?: ContactInput[] | null;
  bankDetails?: BankInput[] | null;
  preferredTransportIds?: number[] | null;
  userId: number;
};

export type CustomerUpdateBody = {
  customerName?: string | null;
  email?: string | null;
  groupName?: string | null;
  gstNo?: string | null;
  referencedBy?: string | null;
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

function dataAccess(suffix: string): AppError {
  return new AppError(DATA_ACCESS, `Data access error occurred.${suffix}`, 200);
}

function toContact(row: CustomerContactRow): ContactResponse {
  return {
    contactPerson: row.contactPerson,
    mobileNumber: row.mobileNumber,
    type: row.type,
  };
}

function toBank(row: CustomerBankRow): BankResponse {
  return {
    id: row.id,
    bankName: row.bankName,
    ifscCode: row.ifscCode,
    branchName: row.branchName,
    accountName: row.accountName,
    accountNumber: row.accountNumber,
  };
}

function listItem(row: CustomerRow, contactRows: CustomerContactRow[]) {
  return {
    id: row.id,
    code: row.code,
    customerName: row.name,
    customerGstNo: row.gstNo,
    address: formatAddress(row.addressLine1, row.addressLine2, ', '),
    city: row.city,
    contacts: contactRows.map(toContact),
  };
}

function trimmedBanks(banks: BankInput[] | null | undefined, trim: boolean): BankInput[] | null {
  if (banks == null) {
    return null;
  }
  return banks.map((bank) => ({
    id: bank.id ?? null,
    bankName: trim ? trimToNull(bank.bankName) : (bank.bankName ?? null),
    ifscCode: trim ? trimToNull(bank.ifscCode) : (bank.ifscCode ?? null),
    branchName: trim ? trimToNull(bank.branchName) : (bank.branchName ?? null),
    accountName: trim ? trimToNull(bank.accountName) : (bank.accountName ?? null),
    accountNumber: trim ? trimToNull(bank.accountNumber) : (bank.accountNumber ?? null),
  }));
}

export function createCustomerService(store: CustomerStore) {
  return {
    async add(input: CustomerAddBody): Promise<{ message: string }> {
      try {
        const code = formatCode('C', await store.maxCodeSuffix());
        if (await store.existsByCode(code)) {
          throw duplicateCode();
        }
        const name = input.customerName;
        await store.insert({
          code,
          name,
          email: input.email ?? null,
          groupName: isBlank(input.customerGroup) ? name : (input.customerGroup ?? null),
          gstNo: input.customerGstNo ?? null,
          referencedBy: input.referencedBy ?? null,
          addressLine1: input.addressLine1 ?? null,
          addressLine2: input.addressLine2 ?? null,
          state: input.state ?? null,
          city: input.city ?? null,
          pinCode: input.pinCode ?? null,
          msme: input.customerMsme ?? 'SMALL',
          remark: input.remark ?? null,
          contacts: input.contacts ?? null,
          banks: trimmedBanks(input.bankDetails, false),
          transportIds:
            input.preferredTransportIds && input.preferredTransportIds.length > 0
              ? input.preferredTransportIds
              : [],
          userId: input.userId,
        });
        return { message: 'Customer added successfully' };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        logger.error({ err: error }, 'Error while adding customer');
        throw unexpected(' adding customer');
      }
    },

    async list(page: number, size: number) {
      try {
        const { rows, total } = await store.pageActive(page, size);
        const contactRows = await store.contactsFor(rows.map((row) => row.id));
        const grouped = groupContacts(contactRows);
        return toPage(
          rows.map((row) => listItem(row, grouped.get(row.id) ?? [])),
          page,
          size,
          total,
          false,
        );
      } catch (error) {
        if (isMysqlError(error)) {
          const message = error instanceof Error ? error.message : '';
          throw dataAccess(message);
        }
        logger.error({ err: error }, 'Error while fetching customers');
        throw unexpected(' fetching customers');
      }
    },

    async listAll(filter: StatusFilter) {
      try {
        const rows = await store.listByFilter(filter);
        return rows.map((row) => ({
          id: row.id,
          customerName: row.name,
          customerGroup: row.groupName,
          customerGstNo: row.gstNo,
          customerMsme: row.msme,
          city: row.city,
        }));
      } catch (error) {
        if (isMysqlError(error)) {
          throw dataAccess('Database error while retrieving customers');
        }
        logger.error({ err: error }, 'Error while fetching all customers');
        throw unexpected('Unexpected error in customer retrieval');
      }
    },

    async search(keyword: string, page: number, size: number) {
      const trimmed = keyword.trim();
      if (!trimmed) {
        return toPage([], page, size, 0, true);
      }
      try {
        const { rows, total } = await store.search(trimmed, page, size);
        const contactRows = await store.contactsFor(rows.map((row) => row.id));
        const grouped = groupContacts(contactRows);
        return toPage(
          rows.map((row) => listItem(row, grouped.get(row.id) ?? [])),
          page,
          size,
          total,
          true,
        );
      } catch (error) {
        logger.error({ err: error }, 'Error while searching customers');
        throw unexpected('Unexpected error in customer search');
      }
    },

    async getById(id: number) {
      try {
        const detail = await store.findDetail(id);
        if (!detail) {
          throw unexpected('Unexpected error while fetching customer');
        }
        const data: {
          id: number;
          code: string | null;
          customerName: string | null;
          email: string | null;
          groupName: string | null;
          gstNo: string | null;
          referencedBy: string | null;
          addressLine1: string | null;
          addressLine2: string | null;
          state: string | null;
          city: string | null;
          pinCode: string | null;
          msme: string | null;
          remark: string | null;
          status: ReturnType<typeof statusName>;
          contacts: ContactResponse[];
          preferredTransports: PreferredTransportResponse[];
          bankDetails: BankResponse[];
        } = {
          id: detail.customer.id,
          code: detail.customer.code,
          customerName: detail.customer.name,
          email: detail.customer.email,
          groupName: detail.customer.groupName,
          gstNo: detail.customer.gstNo,
          referencedBy: detail.customer.referencedBy,
          addressLine1: detail.customer.addressLine1,
          addressLine2: detail.customer.addressLine2,
          state: detail.customer.state,
          city: detail.customer.city,
          pinCode: detail.customer.pinCode,
          msme: detail.customer.msme,
          remark: detail.customer.remark,
          status: statusName(detail.customer.status),
          contacts: detail.contactRows.map(toContact),
          preferredTransports: detail.transportRows.map((transport) =>
            toPreferredTransport(transport.id, transport.name),
          ),
          bankDetails: detail.bankRows.map(toBank),
        };
        return { success: true, message: 'Customer fetched successfully', data };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        if (isMysqlError(error)) {
          throw dataAccess('Database error while fetching customer');
        }
        logger.error({ err: error }, 'Error while fetching customer');
        throw unexpected('Unexpected error while fetching customer');
      }
    },

    async update(id: number, input: CustomerUpdateBody): Promise<{ success: true; message: string; data: null }> {
      try {
        const detail = await store.findDetail(id);
        if (!detail) {
          throw unexpected('Unexpected error while updating customer');
        }
        const name = input.customerName ?? null;
        await store.update(id, {
          name,
          email: input.email ?? null,
          groupName: isBlank(input.groupName) ? name : (input.groupName ?? null),
          gstNo: input.gstNo ?? null,
          referencedBy: input.referencedBy ?? null,
          addressLine1: input.addressLine1 ?? null,
          addressLine2: input.addressLine2 ?? null,
          state: input.state ?? null,
          city: input.city ?? null,
          pinCode: input.pinCode ?? null,
          msme: input.msme ?? 'SMALL',
          remark: input.remark ?? null,
          contacts: input.contacts ?? null,
          banks: trimmedBanks(input.bankDetails, true),
          transportIds: input.preferredTransportIds ?? null,
          userId: input.userId,
        });
        return { success: true, message: 'Customer updated successfully', data: null };
      } catch (error) {
        if (error instanceof BankNotFoundError || isMysqlError(error)) {
          if (isMysqlError(error)) {
            throw dataAccess('Database error while updating customer');
          }
          throw unexpected('Unexpected error while updating customer');
        }
        if (error instanceof AppError) {
          throw error;
        }
        logger.error({ err: error }, 'Error while updating customer');
        throw unexpected('Unexpected error while updating customer');
      }
    },

    async remove(code: string | null, userId: number): Promise<{ message: string }> {
      try {
        if (code == null) {
          throw unexpected('deleting customer');
        }
        const existing = await store.findByCode(code);
        if (!existing) {
          throw unexpected('deleting customer');
        }
        await store.deactivate(existing.id, userId);
        return { message: `Customer with code: ${code} successfully deleted` };
      } catch (error) {
        if (error instanceof AppError) {
          throw error;
        }
        if (isMysqlError(error)) {
          const message = error instanceof Error ? error.message : '';
          throw dataAccess(message);
        }
        logger.error({ err: error }, 'Error while deleting customer');
        throw unexpected('deleting customer');
      }
    },
  };
}

function groupContacts(rows: CustomerContactRow[]): Map<number, CustomerContactRow[]> {
  const grouped = new Map<number, CustomerContactRow[]>();
  for (const row of rows) {
    if (row.customerId == null) {
      continue;
    }
    const current = grouped.get(row.customerId) ?? [];
    current.push(row);
    grouped.set(row.customerId, current);
  }
  return grouped;
}

export const customerService = createCustomerService(customerRepository);
