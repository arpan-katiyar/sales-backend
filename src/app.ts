import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { env } from './config/env.js';
import { logger } from './common/logger.js';
import { errorHandler } from './common/middleware/error-handler.middleware.js';
import { health } from './modules/health/health.controller.js';
import { apiRouter } from './routes/index.js';

const require = createRequire(import.meta.url);
const pinoHttp = require('pino-http') as (options: {
  logger: typeof logger;
  genReqId: (req: IncomingMessage, res: ServerResponse) => string;
}) => express.RequestHandler;

export const app = express();

app.disable('x-powered-by');
app.use(
  pinoHttp({
    logger,
    genReqId: (_req, res) => {
      const requestId = randomUUID();
      res.setHeader('X-Request-Id', requestId);
      return requestId;
    },
  }),
);
app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }),
);
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));

app.get('/health', health);
app.use('/csm/api/v1', apiRouter);

app.use(errorHandler);
