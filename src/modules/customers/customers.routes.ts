import { Router } from 'express';

import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../common/middleware/validate.middleware.js';
import {
  addCustomer,
  deleteCustomer,
  getAllCustomers,
  getCustomerById,
  getCustomers,
  searchCustomers,
  updateCustomer,
} from './customers.controller.js';
import {
  addCustomerSchema,
  customerFilterQuerySchema,
  customerIdParamSchema,
  customerPageQuerySchema,
  customerSearchQuerySchema,
  deleteCustomerSchema,
  updateCustomerSchema,
} from './customers.schema.js';

export const customersRouter = Router();

customersRouter.post('/customer/add', validateBody(addCustomerSchema), addCustomer);
customersRouter.get('/customers/get', validateQuery(customerPageQuerySchema), getCustomers);
customersRouter.get('/customers/get/all', validateQuery(customerFilterQuerySchema), getAllCustomers);
customersRouter.put('/customer/delete', validateBody(deleteCustomerSchema), deleteCustomer);
customersRouter.get('/customers/search', validateQuery(customerSearchQuerySchema), searchCustomers);
customersRouter.get('/customers/get/id/:id', validateParams(customerIdParamSchema), getCustomerById);
customersRouter.put(
  '/customers/update/id/:id',
  validateParams(customerIdParamSchema),
  validateBody(updateCustomerSchema),
  updateCustomer,
);
