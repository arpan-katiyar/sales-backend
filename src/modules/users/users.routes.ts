import { Router } from 'express';
import { z } from 'zod';

import { ROLES } from '../../common/constants.js';
import { requireRoles } from '../../common/middleware/authenticate.middleware.js';
import { validateBody, validateParams, validateQuery } from '../../common/middleware/validate.middleware.js';
import { addUserSchema, changePasswordSchema } from '../auth/auth.schema.js';
import { addUser, changePassword, deleteUser, getUserDetail, listUsers, searchUsers } from './users.controller.js';

const userIdParamSchema = z.object({
  userId: z.coerce.number().int().positive(),
});

const userSearchQuerySchema = z.object({
  keyword: z.string().default(''),
});

export const usersRouter = Router();

usersRouter.post('/user/add', requireRoles(ROLES.ADMIN), validateBody(addUserSchema), addUser);
usersRouter.get('/users/get', listUsers);
usersRouter.get('/users/search', validateQuery(userSearchQuerySchema), searchUsers);
usersRouter.post('/user/delete/:userId', requireRoles(ROLES.ADMIN), validateParams(userIdParamSchema), deleteUser);
usersRouter.get('/get/user/detail/:userId', validateParams(userIdParamSchema), getUserDetail);
usersRouter.put(
  '/admin/change/password',
  validateBody(changePasswordSchema),
  changePassword,
);
