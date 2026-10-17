import { Router } from 'express';

import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../common/middleware/validate.middleware.js';
import {
  addTransport,
  deleteTransport,
  getAllTransports,
  getTransports,
  searchTransports,
  updateTransport,
} from './transports.controller.js';
import {
  transportBodySchema,
  transportIdParamSchema,
  transportPageQuerySchema,
  transportSearchQuerySchema,
} from './transports.schema.js';

export const transportsRouter = Router();

transportsRouter.get('/transports/search', validateQuery(transportSearchQuerySchema), searchTransports);
transportsRouter.get('/transports/getAll', getAllTransports);
transportsRouter.get('/transports/get/all', validateQuery(transportPageQuerySchema), getTransports);
transportsRouter.post('/transports/add', validateBody(transportBodySchema), addTransport);
transportsRouter.put(
  '/transports/update/:id',
  validateParams(transportIdParamSchema),
  validateBody(transportBodySchema),
  updateTransport,
);
transportsRouter.delete('/transports/delete/:id', validateParams(transportIdParamSchema), deleteTransport);
