import { Router } from 'express';

import { parseMultipart } from '../../common/files/uploads.js';
import { validateParams, validateQuery } from '../../common/middleware/validate.middleware.js';
import {
  addPurchase,
  copySuppliers,
  deletePurchase,
  downloadPurchases,
  getPurchase,
  searchPurchases,
  updatePurchase,
} from './purchases.controller.js';
import {
  purchaseDownloadQuerySchema,
  purchaseIdParamSchema,
  purchaseSearchQuerySchema,
} from './purchases.schema.js';

export const purchasesRouter = Router();

purchasesRouter.post('/purchase/entry/add', parseMultipart, addPurchase);
purchasesRouter.get('/purchase/entries/search', validateQuery(purchaseSearchQuerySchema), searchPurchases);
purchasesRouter.patch(
  '/purchase/entry/update/:id',
  parseMultipart,
  validateParams(purchaseIdParamSchema),
  updatePurchase,
);
purchasesRouter.delete('/purchase/entry/delete/:id', validateParams(purchaseIdParamSchema), deletePurchase);
purchasesRouter.get('/purchase/get/details/:id', validateParams(purchaseIdParamSchema), getPurchase);
purchasesRouter.post('/purchase/copy-suppliers', copySuppliers);
purchasesRouter.get('/purchase/entries/download', validateQuery(purchaseDownloadQuerySchema), downloadPurchases);
