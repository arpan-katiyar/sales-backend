import { Router } from 'express';

import {
  validateBody,
  validateParams,
  validateQuery,
} from '../../common/middleware/validate.middleware.js';
import {
  addStaff,
  deleteStaff,
  getAllStaff,
  getStaff,
  getStaffById,
  searchStaff,
  updateStaff,
} from './staff.controller.js';
import {
  addStaffSchema,
  deleteStaffSchema,
  staffIdParamSchema,
  staffPageQuerySchema,
  staffSearchQuerySchema,
  updateStaffSchema,
} from './staff.schema.js';

export const staffRouter = Router();

staffRouter.post('/staff/add', validateBody(addStaffSchema), addStaff);
staffRouter.get('/staffs/get', validateQuery(staffPageQuerySchema), getStaff);
staffRouter.get('/staffs/get/all', getAllStaff);
staffRouter.put('/staff/delete', validateBody(deleteStaffSchema), deleteStaff);
staffRouter.get('/staffs/search', validateQuery(staffSearchQuerySchema), searchStaff);
staffRouter.get('/staff/:staffId', validateParams(staffIdParamSchema), getStaffById);
staffRouter.put(
  '/staff/:staffId',
  validateParams(staffIdParamSchema),
  validateBody(updateStaffSchema),
  updateStaff,
);
