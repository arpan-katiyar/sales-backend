import { Router } from 'express';

import { validateParams, validateQuery } from '../../common/middleware/validate.middleware.js';
import {
  addCredit,
  deleteCredit,
  getCredit,
  listCredits,
  searchCredits,
  updateCredit,
} from './credits.controller.js';
import { creditIdParamSchema, creditSearchQuerySchema } from './credits.schema.js';

export const creditsRouter = Router();

creditsRouter.post('/credit/entry/add', addCredit);
creditsRouter.get('/credit/entries/get', listCredits);
creditsRouter.get('/credit/entries/search', validateQuery(creditSearchQuerySchema), searchCredits);
creditsRouter.patch('/credit/entry/update/:id', validateParams(creditIdParamSchema), updateCredit);
creditsRouter.delete('/credit/entry/delete/:id', validateParams(creditIdParamSchema), deleteCredit);
creditsRouter.get('/credit/details/:id', validateParams(creditIdParamSchema), getCredit);
