import { AppError } from '../../common/errors/app-error.js';
import { logger } from '../../common/logger.js';
import { toPagedResponse, type PagedResponse } from '../../common/paged.js';
import {
  StaffDuplicateError,
  staffRepository,
  type StaffRow,
} from './staff.repository.js';

const DATA_NOT_FOUND = 1111;
const UNEXPECTED = 1006;
const DATA_ACCESS = 1007;

export type StaffResponse = {
  staffId: number;
  staffName: string;
  phone: string | null;
  joiningDate: string | null;
};

type StaffStore = Pick<
  typeof staffRepository,
  'insert' | 'findById' | 'pageActive' | 'listActive' | 'searchActive' | 'update' | 'deactivate'
>;

function formatDate(value: StaffRow['joiningDate']): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const date = value as Date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toStaffResponse(row: StaffRow): StaffResponse {
  return {
    staffId: row.id,
    staffName: row.name,
    phone: row.phone,
    joiningDate: formatDate(row.joiningDate),
  };
}

function notFound(): AppError {
  return new AppError(DATA_NOT_FOUND, 'Data not found. ', 200);
}

export function createStaffService(store: StaffStore) {
  return {
    async add(input: {
      staffName: string;
      phone?: string | null;
      joiningDate: string;
      userId: number;
    }): Promise<{ message: string }> {
      try {
        await store.insert({
          name: input.staffName,
          phone: input.phone ?? null,
          joiningDate: input.joiningDate,
          userId: input.userId,
        });
        return { message: 'Staff added successfully' };
      } catch (error) {
        logger.error({ err: error }, 'Error while adding staff');
        throw new AppError(UNEXPECTED, 'Unexpected error occur while  adding staff', 200);
      }
    },

    async list(page: number, size: number): Promise<PagedResponse<StaffResponse>> {
      const { rows, total } = await store.pageActive(page, size);
      return toPagedResponse(rows.map(toStaffResponse), page, size, total);
    },

    async listActive(): Promise<StaffResponse[]> {
      const rows = await store.listActive();
      return rows.map(toStaffResponse);
    },

    async search(
      keyword: string,
      page: number,
      size: number,
    ): Promise<PagedResponse<StaffResponse>> {
      const trimmed = keyword.trim();
      if (!trimmed) {
        return toPagedResponse([], page, size, 0);
      }
      const { rows, total } = await store.searchActive(trimmed, page, size);
      return toPagedResponse(rows.map(toStaffResponse), page, size, total);
    },

    async getById(staffId: number): Promise<StaffResponse> {
      const row = await store.findById(staffId);
      if (!row) {
        throw notFound();
      }
      return toStaffResponse(row);
    },

    async update(
      staffId: number,
      input: { staffName: string; phone?: string | null; joiningDate?: string | null; userId: number },
    ): Promise<{ message: string }> {
      const existing = await store.findById(staffId);
      if (!existing) {
        throw notFound();
      }
      try {
        await store.update(staffId, {
          name: input.staffName,
          phone: input.phone ?? null,
          joiningDate: input.joiningDate ?? formatDate(existing.joiningDate) ?? existing.joiningDate,
          userId: input.userId,
        });
      } catch (error) {
        if (error instanceof StaffDuplicateError) {
          throw new AppError(
            DATA_ACCESS,
            'Data access error occurred.Something went wrong while updating the staff. Please try again.',
            200,
          );
        }
        logger.error({ err: error }, 'Error while updating staff');
        throw new AppError(UNEXPECTED, 'Unexpected error occur while  updating staff', 200);
      }
      return { message: 'Staff updated successfully' };
    },

    async deactivate(staffId: number, userId: number): Promise<{ message: string }> {
      const existing = await store.findById(staffId);
      if (!existing) {
        throw notFound();
      }
      await store.deactivate(staffId, userId);
      return { message: `Staff ID: ${staffId} became INACTIVE` };
    },
  };
}

export const staffService = createStaffService(staffRepository);
