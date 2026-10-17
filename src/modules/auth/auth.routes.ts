import { Router } from 'express';

import { validateBody } from '../../common/middleware/validate.middleware.js';
import { login, logout, me, refresh } from './auth.controller.js';
import { loginSchema } from './auth.schema.js';

export const authPublicRouter = Router();
authPublicRouter.post('/login', validateBody(loginSchema), login);
authPublicRouter.post('/auth/refresh', refresh);
authPublicRouter.post('/auth/logout', logout);

export const authProtectedRouter = Router();
authProtectedRouter.get('/auth/me', me);
