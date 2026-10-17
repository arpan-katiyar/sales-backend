import { AppError } from '../../common/errors/app-error.js';
import { deleteStoredFile, uploadFiles } from '../../common/files/storage.js';
import { apiSuccess, assertPage, purchaseImageShouldRemove, rethrow, springPage } from '../entries/common.js';
import type { StoredFile, UploadedFile } from '../entries/common.js';
import { buildPurchaseExcelFilename, generatePurchaseExcel } from './purchase-excel.js';
import { purchaseRepository } from './purchases.repository.js';
import type { PurchaseFilter } from './purchases.repository.js';
import type { CopySuppliersBody, PurchaseAddBody, PurchaseUpdateBody } from './purchases.schema.js';

const PURCHASE_FOLDER = 'orderForm';
const MAX_IMAGES = 3;

type HistoryRow = {
  id: number;
  date: string | null;
  staffId: number | null;
  remarks: string | null;
  supplierId: number | null;
  supplierName: string | null;
  supplierCity: string | null;
  customerId: number | null;
  customerName: string | null;
  customerCity: string | null;
};

function assertImageCount(files: UploadedFile[]): void {
  if (files.length > MAX_IMAGES) {
    throw new AppError(1013, 'Maximum 2 images allowed');
  }
}

async function requireSupplier(id: number): Promise<void> {
  if (!(await purchaseRepository.supplierExists(id))) {
    throw new AppError(1017, `supplier not found${id}`);
  }
}

async function requireCustomer(id: number): Promise<void> {
  if (!(await purchaseRepository.customerExists(id))) {
    throw new AppError(1016, `customer not found for id ${id}`);
  }
}

async function toHistory(rows: HistoryRow[]) {
  const names = await purchaseRepository.staffNames([
    ...new Set(rows.map((row) => row.staffId).filter((id): id is number => id != null)),
  ]);
  return rows.map((row) => {
    if (row.customerId == null) {
      throw new Error('Missing purchase customer');
    }
    return {
      id: row.id,
      date: row.date,
      staffName: row.staffId == null ? null : (names.get(row.staffId) ?? null),
      supplierName: row.supplierId == null ? null : row.supplierName,
      customerName: row.customerName,
      customerCity: row.customerCity,
      supplierCity: row.supplierId == null ? null : row.supplierCity,
      customerId: row.customerId,
      remarks: row.remarks,
    };
  });
}

export const purchaseService = {
  async add(body: PurchaseAddBody, files: UploadedFile[], userId: number) {
    try {
      if (body.customerId != null) {
        await requireCustomer(body.customerId);
      }
      const prepared: {
        date: string | null;
        staffId: number | null;
        supplierId: number | null;
        customerId: number | null;
        remarks: string | null;
        images: StoredFile[];
        userId: number;
      }[] = [];
      for (const supplier of body.suppliers) {
        if (supplier.supplierId != null) {
          await requireSupplier(supplier.supplierId);
        }
        const images =
          supplier.supplierId == null ? [] : files.filter((file) => file.fieldname === `supplier_${supplier.supplierId}_images`);
        assertImageCount(images);
        prepared.push({
          date: body.date,
          staffId: body.staffId,
          supplierId: supplier.supplierId,
          customerId: body.customerId,
          remarks: supplier.remarks,
          images: images.length > 0 ? await uploadFiles(images, PURCHASE_FOLDER) : [],
          userId,
        });
      }
      await purchaseRepository.addMany(prepared);
      return { message: 'Purchase entries saved successfully' };
    } catch (error) {
      rethrow(error);
    }
  },

  async search(filter: PurchaseFilter, page: number, size: number) {
    try {
      const pageIndex = assertPage(page, size, true);
      const result = await purchaseRepository.search(filter, pageIndex, size);
      return springPage(await toHistory(result.rows), pageIndex, size, result.total);
    } catch (error) {
      rethrow(error);
    }
  },

  async update(id: number, body: PurchaseUpdateBody, files: UploadedFile[], userId: number) {
    try {
      const current = await purchaseRepository.findById(id);
      if (!current) {
        throw new AppError(1012, `Purchase entry not found${id}`);
      }
      if (body.supplierId != null) {
        await requireSupplier(body.supplierId);
      }
      if (body.customerId != null) {
        await requireCustomer(body.customerId);
      }
      const images =
        body.supplierId == null ? [] : files.filter((file) => file.fieldname === `supplier_${body.supplierId}_images`);
      assertImageCount(images);
      const currentImages = await purchaseRepository.findImages(id);
      const removed = currentImages.filter((image) => purchaseImageShouldRemove(body.existingImageKeys, image.objectKey));
      for (const image of removed) {
        await deleteStoredFile(image.objectKey);
      }
      const uploaded = images.length > 0 ? await uploadFiles(images, PURCHASE_FOLDER) : [];
      await purchaseRepository.update(id, {
        ...(body.date != null ? { date: body.date } : {}),
        ...(body.staffId != null ? { staffId: body.staffId } : {}),
        ...(body.supplierId != null ? { supplierId: body.supplierId } : {}),
        ...(body.customerId != null ? { customerId: body.customerId } : {}),
        ...(body.remarks != null ? { remarks: body.remarks } : {}),
        removedImageIds: removed.map((image) => image.id),
        images: uploaded,
        userId,
      });
      return { message: 'Purchase entry updated successfully' };
    } catch (error) {
      rethrow(error);
    }
  },

  async remove(id: number) {
    try {
      const current = await purchaseRepository.findById(id);
      if (!current) {
        throw new AppError(1012, `Purchase entry not found: ${id}`);
      }
      await purchaseRepository.remove(id);
      return { message: 'Purchase entry deleted successfully', id };
    } catch (error) {
      rethrow(error);
    }
  },

  async getById(id: number) {
    try {
      const row = await purchaseRepository.findDetail(id);
      if (!row) {
        throw new AppError(1012, `Purchase entry not found${id}`);
      }
      const images = await purchaseRepository.findImages(id);
      const names = await purchaseRepository.staffNames(row.staffId == null ? [] : [row.staffId]);
      return apiSuccess('Purchase details fetched successfully', {
        id: row.id,
        date: row.date,
        staffId: row.staffId,
        staffName: row.staffId == null ? null : (names.get(row.staffId) ?? null),
        customerId: row.customerId,
        customerName: row.customerName,
        remarks: row.remarks,
        supplier:
          row.supplierId == null
            ? null
            : {
                supplierId: row.supplierId,
                supplierName: row.supplierName,
                images: images.map((image) => ({
                  key: image.objectKey,
                  url: image.publicUrl,
                  fileName: image.originalFileName,
                })),
              },
      });
    } catch (error) {
      rethrow(error);
    }
  },

  async copySuppliers(body: CopySuppliersBody) {
    try {
      const rows = await purchaseRepository.copySuppliers(body);
      const unique: { supplierId: number; supplierName: string | null }[] = [];
      const seen = new Set<number>();
      for (const row of rows) {
        if (row.supplierId == null || seen.has(row.supplierId)) {
          continue;
        }
        seen.add(row.supplierId);
        unique.push({ supplierId: row.supplierId, supplierName: row.supplierName });
      }
      const banks = await purchaseRepository.banksForSuppliers(unique.map((row) => row.supplierId));
      return apiSuccess('Copy Supplier Details PerCustomer fetched successfully', {
        suppliers: unique.map((supplier) => ({
          supplierName: supplier.supplierName,
          bankDetails: banks
            .filter((bank) => bank.supplierId === supplier.supplierId)
            .map((bank) => ({
              id: bank.id,
              bankName: bank.bankName,
              ifscCode: bank.ifscCode,
              branchName: bank.branchName,
              accountName: bank.accountName,
              accountNumber: bank.accountNumber,
            })),
        })),
      });
    } catch (error) {
      rethrow(error);
    }
  },

  async download(filter: PurchaseFilter) {
    try {
      const rows = await toHistory(await purchaseRepository.list(filter));
      const excelRows = rows.map((row) => ({
        date: row.date,
        staffName: row.staffName,
        supplierName: row.supplierName,
        customerName: row.customerName,
        remarks: row.remarks,
      }));
      const file = await generatePurchaseExcel(excelRows, filter.fromDate, filter.toDate);
      return {
        file,
        filename: buildPurchaseExcelFilename(excelRows, filter.fromDate, filter.toDate),
      };
    } catch (error) {
      rethrow(error);
    }
  },
};
