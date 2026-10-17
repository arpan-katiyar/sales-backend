import { Router } from 'express';

import { authenticate } from '../common/middleware/authenticate.middleware.js';
import { authProtectedRouter, authPublicRouter } from '../modules/auth/auth.routes.js';
import { configurationsRouter } from '../modules/configurations/configurations.routes.js';
import { customersRouter } from '../modules/customers/customers.routes.js';
import { staffRouter } from '../modules/staff/staff.routes.js';
import { suppliersRouter } from '../modules/suppliers/suppliers.routes.js';
import { transportsRouter } from '../modules/transports/transports.routes.js';
import { usersRouter } from '../modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.use(authPublicRouter);
apiRouter.use(authenticate);
apiRouter.use(authProtectedRouter);
apiRouter.use(usersRouter);
apiRouter.use(configurationsRouter);
apiRouter.use(staffRouter);
apiRouter.use(transportsRouter);
apiRouter.use(customersRouter);
apiRouter.use(suppliersRouter);
