import { Router } from 'express';

import { validateQuery } from '../../common/middleware/validate.middleware.js';
import { downloadLedger, getLedger } from './ledger.controller.js';
import { ledgerQuerySchema } from './ledger.schema.js';

export const ledgerRouter = Router();

ledgerRouter.get('/ledger', validateQuery(ledgerQuerySchema), getLedger);
ledgerRouter.get('/ledger/download', validateQuery(ledgerQuerySchema), downloadLedger);
