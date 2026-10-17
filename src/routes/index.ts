import { Router } from 'express';

import { authenticate } from '../common/middleware/authenticate.middleware.js';
import { authProtectedRouter, authPublicRouter } from '../modules/auth/auth.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.use(authPublicRouter);
apiRouter.use(authenticate);
apiRouter.use(authProtectedRouter);
apiRouter.use(usersRouter);
