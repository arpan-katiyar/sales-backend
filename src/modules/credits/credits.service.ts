import { AppError } from '../../common/errors/app-error.js';
import { roundPaisaToRupee, rupeeNumber, toPaisa } from '../../common/utils/money.js';
import {
  assertPage,
  drawCode,
  drawName,
  isDatabaseError,
  paymentCode,
  paymentName,
  rethrow,
  springPage,
} from '../entries/common.js';
import { creditRepository } from './credits.repository.js';
import { creditNotFound } from './credits.schema.js';
import type { CreditAddBody, CreditUpdateBody } from './credits.schema.js';

type Party = { id: number; name: string | null; city: string | null };

function partyMap(rows: Party[]): Map<number, Party> {
  return new Map(rows.map((row) => [row.id, row]));
}

function requireParty(party: Party | undefined): Party {
  if (!party) {
    throw new Error('Missing credit party');
  }
  return party;
}

export const creditService = {
  async add(body: CreditAddBody, userId: number) {
    try {
      await creditRepository.insert({
        paymentType: paymentCode(body.paymentType),
        billNumber: body.billNumber,
        date: body.date,
        referenceNumber: body.referenceNumber,
        referenceDate: body.referenceDate,
        receivedAmount: toPaisa(body.receivedAmount),
        drawType: body.drawType ? drawCode(body.drawType) : null,
        remark: body.remark,
        supplierId: body.supplierId,
        customerId: body.customerId,
        slipNumber: body.slipNumber,
        userId,
      });
      return { message: 'Credit entry successfully added.' };
    } catch {
      throw new AppError(1006, 'Unexpected error occur while Unable to add credit');
    }
  },

  async list() {
    try {
      const rows = await creditRepository.list();
      return rows.map((row) => {
        const receivedAmount = rupeeNumber(row.receivedAmount);
        if (receivedAmount == null) {
          throw new Error('Missing received amount');
        }
        return {
          paymentType: paymentName(row.paymentType),
          billNumber: row.billNumber,
          date: row.date,
          referenceNumber: row.referenceNumber,
          referenceDate: row.referenceDate,
          receivedAmount,
          remark: row.remark,
          supplierId: row.supplierId,
          customerId: row.customerId,
          slipNumber: row.slipNumber,
        };
      });
    } catch (error) {
      if (isDatabaseError(error)) {
        const message = error instanceof Error ? error.message : '';
        throw new AppError(1007, `Data access error occurred.${message}`);
      }
      throw new AppError(1006, 'Unexpected error occur while  fetching credit entries.');
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
      const pageIndex = assertPage(page, size, true);
      const result = await creditRepository.search({
        fromDate,
        toDate,
        supplierId,
        customerId,
        pageIndex,
        size,
      });
      const parties = await creditRepository.parties({
        supplierIds: [...new Set(result.rows.map((row) => row.supplierId).filter((id): id is number => id != null && id > 0))],
        customerIds: [...new Set(result.rows.map((row) => row.customerId).filter((id): id is number => id != null && id > 0))],
      });
      const suppliers = partyMap(parties.suppliers);
      const customers = partyMap(parties.customers);
      const content = result.rows.map((row) => {
        const supplier = requireParty(row.supplierId != null && row.supplierId > 0 ? suppliers.get(row.supplierId) : undefined);
        const customer = requireParty(row.customerId != null && row.customerId > 0 ? customers.get(row.customerId) : undefined);
        const receivedAmount = rupeeNumber(row.receivedAmount);
        if (receivedAmount == null) {
          throw new Error('Missing received amount');
        }
        return {
          id: row.id,
          supplierId: row.supplierId,
          customerId: row.customerId,
          paymentType: paymentName(row.paymentType),
          billNumber: row.billNumber,
          date: row.date,
          referenceNumber: row.referenceNumber,
          referenceDate: row.referenceDate,
          receivedAmount,
          supplierName: supplier.name,
          customerName: customer.name,
          customerCity: customer.city,
          supplierCity: supplier.city,
          slipNumber: row.slipNumber,
          drawType: drawName(row.drawType),
          remark: row.remark,
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

  async update(id: number, body: CreditUpdateBody, userId: number) {
    try {
      const current = await creditRepository.findById(id);
      if (!current) {
        throw creditNotFound(id);
      }
      await creditRepository.update(id, {
        ...(body.supplierId != null ? { supplierId: body.supplierId } : {}),
        ...(body.customerId != null ? { customerId: body.customerId } : {}),
        ...(body.paymentType != null ? { paymentType: paymentCode(body.paymentType) } : {}),
        referenceNumber: body.referenceNumber,
        date: body.date,
        referenceDate: body.referenceDate,
        slipNumber: body.slipNumber,
        ...(body.drawType != null ? { drawType: drawCode(body.drawType) } : {}),
        receivedAmount: toPaisa(body.receivedAmount),
        remark: body.remark,
        userId,
      });
      return { message: 'Credit updated successfully', id };
    } catch (error) {
      rethrow(error);
    }
  },

  async remove(id: number) {
    try {
      const current = await creditRepository.findById(id);
      if (!current) {
        throw creditNotFound(id);
      }
      await creditRepository.remove(id);
      return { message: 'credit Entry deleted successfully', id };
    } catch (error) {
      rethrow(error);
    }
  },

  async getById(id: number) {
    try {
      const row = await creditRepository.findById(id);
      if (!row) {
        throw creditNotFound(id);
      }
      const parties = await creditRepository.parties({
        supplierIds: row.supplierId != null && row.supplierId > 0 ? [row.supplierId] : [],
        customerIds: row.customerId != null && row.customerId > 0 ? [row.customerId] : [],
      });
      const supplier = parties.suppliers[0] ?? null;
      const customer = parties.customers[0] ?? null;
      const receivedAmount = rupeeNumber(row.receivedAmount);
      if (receivedAmount == null) {
        throw new Error('Missing received amount');
      }
      return {
        id: row.id,
        paymentType: paymentName(row.paymentType),
        billNumber: row.billNumber,
        date: row.date,
        referenceNumber: row.referenceNumber,
        referenceDate: row.referenceDate,
        receivedAmount,
        drawType: drawName(row.drawType),
        remark: row.remark,
        slipNumber: row.slipNumber,
        supplierId: row.supplierId,
        supplierName: supplier?.name ?? null,
        supplierCity: supplier?.city ?? null,
        customerId: row.customerId,
        customerName: customer?.name ?? null,
        customerCity: customer?.city ?? null,
      };
    } catch (error) {
      rethrow(error);
    }
  },
};
