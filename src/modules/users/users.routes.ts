import { Router } from 'express';

import { ROLES } from '../../common/constants.js';
import { requireRoles } from '../../common/middleware/authenticate.middleware.js';
import { validateBody } from '../../common/middleware/validate.middleware.js';
import { addUserSchema, changePasswordSchema } from '../auth/auth.schema.js';
import { addUser, changePassword } from './users.controller.js';

export const usersRouter = Router();

usersRouter.post('/user/add', requireRoles(ROLES.ADMIN), validateBody(addUserSchema), addUser);
usersRouter.put(
  '/admin/change/password',
  validateBody(changePasswordSchema),
  changePassword,
);
