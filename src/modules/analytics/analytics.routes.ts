import { Router } from 'express';

import { validateBody } from '../../common/middleware/validate.middleware.js';
import { customerAnalytics, monthlyAnalytics, staffAnalytics, supplierAnalytics } from './analytics.controller.js';
import {
  customerAmountSchema,
  monthlyAnalyticsSchema,
  staffAnalyticsSchema,
  supplierAmountSchema,
} from './analytics.schema.js';

export const analyticsRouter = Router();

analyticsRouter.post('/analytics/monthly', validateBody(monthlyAnalyticsSchema), monthlyAnalytics);
analyticsRouter.post('/analytics/monthly ', validateBody(monthlyAnalyticsSchema), monthlyAnalytics);
analyticsRouter.post('/analytics/staff', validateBody(staffAnalyticsSchema), staffAnalytics);
analyticsRouter.post('/analytics/supplier/amount', validateBody(supplierAmountSchema), supplierAnalytics);
analyticsRouter.post('/analytics/customer/amount', validateBody(customerAmountSchema), customerAnalytics);
