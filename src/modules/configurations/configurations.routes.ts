import { Router } from 'express';

import { validateBody, validateParams } from '../../common/middleware/validate.middleware.js';
import { getConfigurations, updateConfiguration } from './configurations.controller.js';
import {
  updateConfigurationBodySchema,
  updateConfigurationParamsSchema,
} from './configurations.schema.js';

export const configurationsRouter = Router();

configurationsRouter.get('/admin/configurations', getConfigurations);
configurationsRouter.patch(
  '/admin/configurations/:configurationId',
  validateParams(updateConfigurationParamsSchema),
  validateBody(updateConfigurationBodySchema),
  updateConfiguration,
);
