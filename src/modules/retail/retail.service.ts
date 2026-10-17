import { AppError } from '../../common/errors/app-error.js';
import { configurationsRepository } from '../configurations/configurations.repository.js';
import {
  ACTIVE_STATUS,
  BOOLEAN_CONFIG,
  apiSuccess,
  assertPage,
  rethrow,
  springPage,
  todayIso,
} from '../entries/common.js';
import { retailRepository } from './retail.repository.js';
import type { RetailSupplierWrite } from './retail.repository.js';
import { retailerNotFound, retailSupplierNotFound } from './retail.schema.js';
import type {
  DepositBody,
  RetailCreateBody,
  RetailSupplierAddBody,
  RetailUpdateBody,
} from './retail.schema.js';

async function assertRetailEnabled(): Promise<void> {
  const config = await configurationsRepository.findByKey('RETAIL_FEATURE');
  if (!config) {
    return;
  }
  if (config.configType !== BOOLEAN_CONFIG || config.configValue?.toLowerCase() !== 'true') {
    throw new AppError(1036, 'Invalid configuration value');
  }
}

async function requireCustomer(id: number | null): Promise<void> {
  if (id == null) {
    return;
  }
  if (!(await retailRepository.customerExists(id))) {
    throw new AppError(1016, `customer not found for id  : Customer Id = ${id}`);
  }
}

async function requireStaff(id: number | null): Promise<void> {
  if (id == null) {
    return;
  }
  if (!(await retailRepository.staffExists(id))) {
    throw new AppError(1029, `Staff not found  : Staff Id = ${id}`);
  }
}

async function requireSupplier(id: number, activeOnly: boolean): Promise<void> {
  if (!(await retailRepository.supplierExists(id, activeOnly))) {
    throw new AppError(1017, `supplier not found : Supplier Id = ${id}`);
  }
}

function supplierWrite(
  supplierId: number,
  totalAmount: number | null,
  depositAmount: number | null,
  depositDate: string | null,
): RetailSupplierWrite {
  const deposit = depositAmount ?? 0;
  return {
    supplierId,
    totalAmount,
    depositAmount: deposit,
    balanceAmount: totalAmount == null ? null : totalAmount - deposit,
    depositDate: depositDate ?? todayIso(),
    createDeposit: deposit > 0,
  };
}

function supplierResponse(row: {
  id: number;
  supplierId: number | null;
  supplierName: string | null;
  supplierCity: string | null;
  totalAmount: number | null;
  depositAmount: number | null;
  balanceAmount: number | null;
}) {
  if (row.supplierId == null) {
    throw new Error('Missing retail supplier');
  }
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplierName,
    supplierCity: row.supplierCity,
    totalAmount: row.totalAmount,
    depositAmount: row.depositAmount,
    balanceAmount: row.balanceAmount,
  };
}

export const retailService = {
  async create(body: RetailCreateBody, userId: number) {
    try {
      await assertRetailEnabled();
      await requireCustomer(body.referredByCustomerId);
      await requireStaff(body.staffId);
      for (const supplier of body.suppliers) {
        await requireSupplier(supplier.supplierId, false);
      }
      await retailRepository.create({
        name: body.name,
        date: body.date,
        referredByCustomerId: body.referredByCustomerId,
        staffId: body.staffId,
        commission: body.commission,
        suppliers: body.suppliers.map((supplier) =>
          supplierWrite(supplier.supplierId, supplier.totalAmount, supplier.depositAmount, body.date),
        ),
        userId,
      });
      return apiSuccess('Retail created successfully');
    } catch (error) {
      rethrow(error);
    }
  },

  async update(id: number, body: RetailUpdateBody, userId: number) {
    try {
      await assertRetailEnabled();
      const current = await retailRepository.findById(id);
      if (!current) {
        throw retailerNotFound(id);
      }
      await requireCustomer(body.referredByCustomerId);
      await requireStaff(body.staffId);
      await retailRepository.updateRetailer(id, { ...body, userId });
      return apiSuccess('Retail updated successfully');
    } catch (error) {
      rethrow(error);
    }
  },

  async getById(id: number) {
    try {
      await assertRetailEnabled();
      const retailer = await retailRepository.detail(id);
      if (!retailer || retailer.status !== ACTIVE_STATUS) {
        throw retailerNotFound(id);
      }
      const suppliers = await retailRepository.activeSuppliers([id]);
      if (suppliers.length === 0) {
        throw retailerNotFound(id);
      }
      return apiSuccess('Retail fetched successfully', {
        id: retailer.id,
        name: retailer.name,
        date: retailer.date,
        referredByCustomerId: retailer.customerId,
        customerName: retailer.customerName,
        staffId: retailer.staffId,
        staffName: retailer.staffName,
        suppliers: suppliers.map(supplierResponse),
        commission: retailer.commission,
      });
    } catch (error) {
      rethrow(error);
    }
  },

  async search(
    fromDate: string | null,
    toDate: string | null,
    customerId: number | null,
    staffId: number | null,
    supplierId: number | null,
    page: number,
    size: number,
  ) {
    try {
      await assertRetailEnabled();
      const pageIndex = assertPage(page, size, false);
      const result = await retailRepository.search({
        fromDate,
        toDate,
        customerId,
        staffId,
        supplierId,
        pageIndex,
        size,
      });
      const suppliers = await retailRepository.activeSuppliers(result.rows.map((row) => row.id));
      const content = result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        customerName: row.customerName,
        staffName: row.staffName,
        date: row.date,
        suppliers: suppliers.filter((supplier) => supplier.retailId === row.id && supplier.status === ACTIVE_STATUS).map(supplierResponse),
      }));
      return apiSuccess('Retail fetched successfully', springPage(content, pageIndex, size, result.total));
    } catch (error) {
      rethrow(error);
    }
  },

  async addDeposit(body: DepositBody, userId: number) {
    try {
      await assertRetailEnabled();
      for (const deposit of body.deposits) {
        const retailSupplier = await retailRepository.findRetailSupplier(deposit.retailSupplierId);
        if (!retailSupplier) {
          throw retailSupplierNotFound(deposit.retailSupplierId);
        }
        if (deposit.amount == null) {
          throw new Error('Missing deposit amount');
        }
        const currentDeposit = retailSupplier.depositAmount ?? 0;
        const totalAmount = retailSupplier.totalAmount ?? 0;
        const updatedDeposit = currentDeposit + deposit.amount;
        await retailRepository.addDeposit(deposit.retailSupplierId, {
          depositDate: deposit.depositDate,
          amount: deposit.amount,
          depositAmount: updatedDeposit,
          balanceAmount: totalAmount - updatedDeposit,
          userId,
        });
      }
      return apiSuccess('Add Deposit successfully');
    } catch (error) {
      rethrow(error);
    }
  },

  async depositHistory(retailId: number) {
    try {
      await assertRetailEnabled();
      const retailer = await retailRepository.findActive(retailId);
      if (!retailer) {
        throw retailerNotFound(retailId);
      }
      const suppliers = await retailRepository.activeSuppliers([retailId]);
      const deposits = await retailRepository.activeDeposits(suppliers.map((supplier) => supplier.id));
      return apiSuccess(
        'Deposit history fetched successfully',
        suppliers.map((supplier) => {
          const history = deposits
            .filter((deposit) => deposit.retailSupplierId === supplier.id)
            .sort((left, right) => {
              if (left.depositDate == null || right.depositDate == null) {
                throw new Error('Missing deposit date');
              }
              return right.depositDate.localeCompare(left.depositDate);
            });
          const { id, ...party } = supplierResponse(supplier);
          return {
            retailSupplierId: id,
            ...party,
            deposits: history.map((deposit) => ({
              date: deposit.depositDate,
              amount: deposit.amount,
            })),
          };
        }),
      );
    } catch (error) {
      rethrow(error);
    }
  },

  async remove(retailId: number, userId: number) {
    try {
      await assertRetailEnabled();
      const retailer = await retailRepository.findById(retailId);
      if (!retailer) {
        throw retailerNotFound(retailId);
      }
      await retailRepository.deactivateRetailer(retailId, userId);
      return apiSuccess('Retail deleted successfully');
    } catch (error) {
      rethrow(error);
    }
  },

  async updateSupplier(retailSupplierId: number, totalAmount: number, userId: number) {
    try {
      await assertRetailEnabled();
      const current = await retailRepository.findRetailSupplier(retailSupplierId);
      if (!current) {
        throw retailSupplierNotFound(retailSupplierId);
      }
      if (current.depositAmount == null) {
        throw new Error('Missing deposit amount');
      }
      await retailRepository.updateRetailSupplier(
        retailSupplierId,
        totalAmount,
        totalAmount - current.depositAmount,
        userId,
      );
      return apiSuccess('Retail supplier updated successfully');
    } catch (error) {
      rethrow(error);
    }
  },

  async removeSupplier(retailSupplierId: number, userId: number) {
    try {
      await assertRetailEnabled();
      const current = await retailRepository.findRetailSupplier(retailSupplierId);
      if (!current) {
        throw retailSupplierNotFound(retailSupplierId);
      }
      await retailRepository.deactivateSupplier(retailSupplierId, userId);
      return apiSuccess('Retail supplier deleted successfully');
    } catch (error) {
      rethrow(error);
    }
  },

  async addSupplier(body: RetailSupplierAddBody, userId: number) {
    try {
      await assertRetailEnabled();
      const retailer = await retailRepository.findActive(body.retailId);
      if (!retailer) {
        throw retailerNotFound(body.retailId);
      }
      await requireSupplier(body.supplierId, true);
      if (await retailRepository.activeSupplierLink(body.retailId, body.supplierId)) {
        throw new AppError(1034, 'Supplier already added to this retailer');
      }
      await retailRepository.addSupplier(
        body.retailId,
        supplierWrite(body.supplierId, body.totalAmount, body.depositAmount, body.depositDate),
        userId,
      );
      return apiSuccess('Retail supplier added successfully');
    } catch (error) {
      rethrow(error);
    }
  },
};
