import { AppError } from '../../common/errors/app-error.js';
import { logger } from '../../common/logger.js';
import { toPagedResponse, type PagedResponse } from '../../common/paged.js';
import {
  TransportDataAccessError,
  transportRepository,
  type TransportContactInput,
  type TransportContactRow,
  type TransportRow,
  type TransportWriteInput,
} from './transports.repository.js';

const DUPLICATE = 1005;
const NOT_FOUND = 1008;
const DB_ERROR = 1028;

const STATUS_NAME: Record<number, 'ACTIVE' | 'INACTIVE' | 'DELETE'> = {
  1: 'ACTIVE',
  2: 'INACTIVE',
  3: 'DELETE',
};

export type TransportContactResponse = {
  contactPerson: string | null;
  contactNumber: string | null;
  type: string | null;
};

export type TransportResponse = {
  id: number;
  name: string;
  email: string | null;
  gstNo: string | null;
  state: string | null;
  city: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'DELETE' | null;
  contacts: TransportContactResponse[];
};

export type TransportBody = {
  name: string;
  email?: string | null;
  gstNo?: string | null;
  contacts?: TransportContactInput[] | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  status?: 'ACTIVE' | 'INACTIVE' | 'DELETE' | null;
  userId: number;
};

type TransportStore = Pick<
  typeof transportRepository,
  | 'existsByName'
  | 'findById'
  | 'insert'
  | 'update'
  | 'markDeleted'
  | 'pageActive'
  | 'searchActive'
  | 'listActiveLite'
  | 'contactsFor'
>;

function normalize(value?: string | null): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

function toWriteInput(input: TransportBody, status: number | null): TransportWriteInput {
  return {
    name: input.name.trim(),
    email: normalize(input.email),
    gstNo: normalize(input.gstNo),
    state: input.state ?? null,
    city: input.city ?? null,
    pinCode: input.pincode ?? null,
    addressLine1: input.addressLine1 ?? null,
    addressLine2: input.addressLine2 ?? null,
    status,
    contacts: input.contacts ?? [],
    userId: input.userId,
  };
}

function statusCode(status: TransportBody['status']): number | null {
  if (status === 'ACTIVE') {
    return 1;
  }
  if (status === 'INACTIVE') {
    return 2;
  }
  if (status === 'DELETE') {
    return 3;
  }
  return null;
}

function toContact(row: TransportContactRow): TransportContactResponse {
  return {
    contactPerson: row.contactPerson,
    contactNumber: row.contactNumber,
    type: row.type,
  };
}

function toResponse(row: TransportRow, contacts: TransportContactRow[]): TransportResponse {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    gstNo: row.gstNo,
    state: row.state,
    city: row.city,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    status: row.status == null ? null : (STATUS_NAME[row.status] ?? null),
    contacts: contacts.map(toContact),
  };
}

async function withContacts(store: TransportStore, rows: TransportRow[]): Promise<TransportResponse[]> {
  const contacts = await store.contactsFor(rows.map((row) => row.id));
  const grouped = new Map<number, TransportContactRow[]>();
  for (const contact of contacts) {
    const current = grouped.get(contact.transportId) ?? [];
    current.push(contact);
    grouped.set(contact.transportId, current);
  }
  return rows.map((row) => toResponse(row, grouped.get(row.id) ?? []));
}

function duplicateName(): AppError {
  return new AppError(DUPLICATE, 'Duplicate entryDuplicate entry found for: transport name', 200);
}

function dataAccess(): AppError {
  return new AppError(DB_ERROR, 'Something went wrong. Please try again later.', 500);
}

export function createTransportService(store: TransportStore) {
  return {
    async add(input: TransportBody): Promise<{ success: true; message: string; id: number }> {
      const name = input.name.trim();
      if (await store.existsByName(name)) {
        throw duplicateName();
      }
      try {
        const id = await store.insert(toWriteInput(input, 1));
        return { success: true, message: 'Transport added successfully', id };
      } catch (error) {
        if (error instanceof TransportDataAccessError) {
          throw dataAccess();
        }
        logger.error({ err: error }, 'Error while adding transport');
        throw error;
      }
    },

    async update(
      id: number,
      input: TransportBody,
    ): Promise<{ success: true; message: string; id: number }> {
      const existing = await store.findById(id);
      if (!existing) {
        throw new AppError(NOT_FOUND, 'Transport not found', 200);
      }
      const name = input.name.trim();
      if (await store.existsByName(name, id)) {
        throw duplicateName();
      }
      try {
        await store.update(id, toWriteInput(input, statusCode(input.status) ?? existing.status));
        return { success: true, message: 'Transport updated successfully', id };
      } catch (error) {
        if (error instanceof TransportDataAccessError) {
          throw dataAccess();
        }
        logger.error({ err: error }, 'Error while updating transport');
        throw error;
      }
    },

    async remove(id: number, userId: number): Promise<{ success: true; message: string }> {
      const existing = await store.findById(id);
      if (!existing) {
        throw new AppError(NOT_FOUND, 'Transport not foundTransport not found', 200);
      }
      await store.markDeleted(id, userId);
      return { success: true, message: 'Transport marked as deleted' };
    },

    async list(page: number, size: number): Promise<PagedResponse<TransportResponse>> {
      const { rows, total } = await store.pageActive(page, size);
      return toPagedResponse(await withContacts(store, rows), page, size, total);
    },

    async search(
      keyword: string,
      page: number,
      size: number,
    ): Promise<PagedResponse<TransportResponse>> {
      const trimmed = keyword.trim();
      if (!trimmed) {
        return toPagedResponse([], page, size, 0);
      }
      const { rows, total } = await store.searchActive(trimmed, page, size);
      return toPagedResponse(await withContacts(store, rows), page, size, total);
    },

    async listLite(): Promise<Array<{ id: number; name: string }>> {
      return store.listActiveLite();
    },
  };
}

export const transportService = createTransportService(transportRepository);
