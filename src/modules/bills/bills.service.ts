import { AppError } from '../../common/errors/app-error.js';
import { deleteStoredFile, uploadFiles } from '../../common/files/storage.js';
import {
  basisPointToPercent,
  percentToBasisPoint,
  roundPaisaToRupee,
  rupeeNumber,
  toPaisa,
} from '../../common/utils/money.js';
import {
  assertPage,
  billImageShouldRemove,
  rethrow,
  springPage,
} from '../entries/common.js';
import type { UploadedFile } from '../entries/common.js';
import { billRepository } from './bills.repository.js';
import type { BillItemInput } from './bills.repository.js';
import type { BillAddBody, BillItemBody, BillUpdateBody } from './bills.schema.js';

const BILTY_FOLDER = 'bilty';

function items(rows: BillItemBody[]): BillItemInput[] {
  return rows.map((row) => ({
    pieces: row.pieces,
    grossAmount: toPaisa(row.grossAmount),
    discountPercent: percentToBasisPoint(row.discountPercent),
    discountAmount: toPaisa(row.discountAmount),
    addOnAmount: toPaisa(row.addOnAmount),
    ecrAmount: toPaisa(row.ecrAmount),
    gstPercent: percentToBasisPoint(row.gstPercent),
    gstAmount: toPaisa(row.gstAmount),
  }));
}

export const billService = {
  async add(body: BillAddBody, images: UploadedFile[] | undefined, userId: number) {
    try {
      const uploaded = images && images.length > 0 ? await uploadFiles(images, BILTY_FOLDER) : [];
      const billNumber = await billRepository.add({
        date: body.date,
        receivedDate: body.receivedDate,
        invoiceNo: body.order,
        supplierId: body.supplierId,
        customerId: body.customerId,
        transportName: body.transportName,
        lrNumber: body.lrNumber,
        remarks: body.remarks,
        taxableValue: toPaisa(body.taxableValue),
        billAmount: toPaisa(body.billAmount),
        items: items(body.billItems),
        images: uploaded,
        userId,
      });
      return { message: `Bill added successfully: ${billNumber}` };
    } catch (error) {
      rethrow(error);
    }
  },

  async update(id: number, body: BillUpdateBody, images: UploadedFile[] | undefined, userId: number) {
    try {
      const current = await billRepository.findById(id);
      if (!current) {
        throw new AppError(1010, `Bill Not Found : with id ${id}`);
      }
      const transport = body.transport?.trim() ?? '';
      let transportId: number | null = null;
      let clearTransport = false;
      if (transport === '') {
        clearTransport = true;
      } else {
        transportId = await billRepository.findTransportId(transport);
        if (transportId == null) {
          throw new AppError(1008, 'Transport not foundTransport not found');
        }
      }
      const currentImages = await billRepository.findImages(id);
      const removed = currentImages.filter((image) => billImageShouldRemove(body.existingImageKeys, image.objectKey));
      for (const image of removed) {
        await deleteStoredFile(image.objectKey);
      }
      const uploaded = images && images.length > 0 ? await uploadFiles(images, BILTY_FOLDER) : [];
      const received = body.receivedDate?.trim() ?? '';
      await billRepository.update(id, {
        date: body.date,
        ...(received !== '' ? { receivedDate: received } : {}),
        invoiceNo: body.order,
        ...(body.supplierId != null ? { supplierId: body.supplierId } : {}),
        ...(body.customerId != null ? { customerId: body.customerId } : {}),
        transportId,
        clearTransport,
        lrNumber: body.lrNumber,
        remarks: body.remarks,
        taxableValue: toPaisa(body.taxableValue),
        billAmount: toPaisa(body.billAmount),
        items: items(body.billItems),
        removedImageIds: removed.map((image) => image.id),
        images: uploaded,
        userId,
      });
      return { message: 'Bill updated successfully!' };
    } catch (error) {
      rethrow(error);
    }
  },

  async search(
    fromDate: string | null,
    toDate: string | null,
    supplierId: number | null,
    customerId: number | null,
    page: number,
    size: number,
  ) {
    try {
      const pageIndex = assertPage(page, size, false);
      const result = await billRepository.search({
        fromDate,
        toDate,
        supplierId,
        customerId,
        pageIndex,
        size,
      });
      const content = result.rows.map((row) => {
        if (row.supplierId == null || row.customerId == null) {
          throw new Error('Missing bill party');
        }
        return {
          id: row.id,
          billNumber: row.billNumber,
          date: row.date,
          receivedDate: row.receivedDate,
          invoiceNo: row.invoiceNo,
          supplierName: row.supplierName,
          customerName: row.customerName,
          billAmount: rupeeNumber(row.billAmount),
          supplierCity: row.supplierCity,
          customerCity: row.customerCity,
        };
      });
      return {
        ...springPage(content, pageIndex, size, result.total),
        totalAmount: roundPaisaToRupee(result.amount),
      };
    } catch (error) {
      rethrow(error);
    }
  },

  async getByBillNumber(billNumber: string) {
    try {
      const bill = await billRepository.findByBillNumber(billNumber);
      if (!bill) {
        throw new AppError(1010, `Bill Not Found : ${billNumber}`);
      }
      const [details, images, parties, transport] = await Promise.all([
        billRepository.findDetails(bill.id),
        billRepository.findImages(bill.id),
        billRepository.findParty(bill.supplierId, bill.customerId),
        billRepository.findTransportName(bill.transportId),
      ]);
      if (!parties.supplier || !parties.customer) {
        throw new Error('Missing bill party');
      }
      return {
        id: bill.id,
        billNumber: bill.billNumber,
        date: bill.date,
        receivedDate: bill.receivedDate,
        invoiceNo: bill.invoiceNo,
        billAmount: rupeeNumber(bill.billAmount),
        taxableValue: rupeeNumber(bill.taxableValue),
        transport,
        lrNumber: bill.lrNumber,
        remarks: bill.remarks,
        supplierId: parties.supplier.id,
        supplierName: parties.supplier.name,
        supplierGroup: parties.supplier.groupName,
        supplierGstNo: parties.supplier.gstNo,
        supplierMsme: parties.supplier.msme,
        customerId: parties.customer.id,
        customerName: parties.customer.name,
        customerGroup: parties.customer.groupName,
        customerGstNo: parties.customer.gstNo,
        customerMsme: parties.customer.msme,
        items: details.map((detail) => ({
          pieces: detail.pieces,
          grossAmount: rupeeNumber(detail.grossAmount),
          discountAmount: rupeeNumber(detail.discountAmount),
          addOnAmount: rupeeNumber(detail.addOnAmount),
          ecrAmount: rupeeNumber(detail.ecrAmount),
          gstAmount: rupeeNumber(detail.gstAmount),
          discountPercent: basisPointToPercent(detail.discountPercent),
          gstPercent: basisPointToPercent(detail.gstPercent),
        })),
        publicUrls: images.map((image) => image.publicUrl),
        objectKeys: images.map((image) => image.objectKey),
        originalFileNames: images.map((image) => image.originalFileName),
      };
    } catch (error) {
      rethrow(error);
    }
  },

  async remove(billNumber: string) {
    try {
      const bill = await billRepository.findByBillNumber(billNumber);
      if (!bill) {
        throw new AppError(1010, `Bill Not Found : ${billNumber}`);
      }
      await billRepository.remove(bill.id);
      return { message: 'Bill deleted successfully', billNumber };
    } catch (error) {
      rethrow(error);
    }
  },
};
