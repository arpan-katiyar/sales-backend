import { Router } from 'express';

import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../common/middleware/validate.middleware.js';
import {
  addSupplier,
  deleteSupplier,
  getAllSuppliers,
  getSupplierById,
  getSuppliers,
  searchSuppliers,
  updateSupplier,
} from './suppliers.controller.js';
import {
  addSupplierSchema,
  deleteSupplierSchema,
  supplierFilterQuerySchema,
  supplierIdParamSchema,
  supplierPageQuerySchema,
  supplierSearchQuerySchema,
  updateSupplierSchema,
} from './suppliers.schema.js';

export const suppliersRouter = Router();

suppliersRouter.post('/supplier/add', validateBody(addSupplierSchema), addSupplier);
suppliersRouter.get('/suppliers/get', validateQuery(supplierPageQuerySchema), getSuppliers);
suppliersRouter.get('/suppliers/get/all', validateQuery(supplierFilterQuerySchema), getAllSuppliers);
suppliersRouter.put('/supplier/delete', validateBody(deleteSupplierSchema), deleteSupplier);
suppliersRouter.get('/suppliers/search/v2', validateQuery(supplierSearchQuerySchema), searchSuppliers);
suppliersRouter.get('/suppliers/get/id/:id', validateParams(supplierIdParamSchema), getSupplierById);
suppliersRouter.put(
  '/suppliers/update/id/:id',
  validateParams(supplierIdParamSchema),
  validateBody(updateSupplierSchema),
  updateSupplier,
);
