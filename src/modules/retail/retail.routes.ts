import { Router } from 'express';

import { validateParams, validateQuery } from '../../common/middleware/validate.middleware.js';
import {
  addDeposit,
  addRetailSupplier,
  createRetail,
  deleteRetail,
  deleteRetailSupplier,
  depositHistory,
  getRetail,
  searchRetail,
  updateRetail,
  updateRetailSupplier,
} from './retail.controller.js';
import {
  retailIdParamSchema,
  retailPathIdParamSchema,
  retailSearchQuerySchema,
  retailSupplierParamSchema,
} from './retail.schema.js';

export const retailRouter = Router();

retailRouter.post('/retail/create', createRetail);
retailRouter.put('/retail/:id', validateParams(retailIdParamSchema), updateRetail);
retailRouter.get('/retail/get/:id', validateParams(retailIdParamSchema), getRetail);
retailRouter.get('/retail/search', validateQuery(retailSearchQuerySchema), searchRetail);
retailRouter.post('/retail-supplier-deposits', addDeposit);
retailRouter.get('/retail/:retailId/deposits', validateParams(retailPathIdParamSchema), depositHistory);
retailRouter.delete('/retail/:retailId', validateParams(retailPathIdParamSchema), deleteRetail);
retailRouter.put(
  '/retail-suppliers/:retailSupplierId',
  validateParams(retailSupplierParamSchema),
  updateRetailSupplier,
);
retailRouter.delete(
  '/retail-suppliers/:retailSupplierId',
  validateParams(retailSupplierParamSchema),
  deleteRetailSupplier,
);
retailRouter.post('/retail-suppliers', addRetailSupplier);
