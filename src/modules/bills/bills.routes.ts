import { Router } from 'express';

import { parseMultipart } from '../../common/files/uploads.js';
import { validateParams, validateQuery } from '../../common/middleware/validate.middleware.js';
import { addBill, deleteBill, getBill, searchBills, updateBill } from './bills.controller.js';
import { billIdParamSchema, billNumberParamSchema, billSearchQuerySchema } from './bills.schema.js';

export const billsRouter = Router();

billsRouter.post('/bill/entry/add', parseMultipart, addBill);
billsRouter.patch('/bill/entry/update/:id', parseMultipart, validateParams(billIdParamSchema), updateBill);
billsRouter.get('/bill/entries/search', validateQuery(billSearchQuerySchema), searchBills);
billsRouter.delete('/bill/entry/delete/:billNumber', validateParams(billNumberParamSchema), deleteBill);
billsRouter.get('/bill/:billNumber', validateParams(billNumberParamSchema), getBill);
