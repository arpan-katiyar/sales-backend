import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

import { logger } from '../logger.js';
import { AppError } from '../errors/app-error.js';

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (error instanceof AppError) {
    res.status(error.httpStatus).json({
      code: error.code,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (error instanceof ZodError) {
    const message = error.issues.map((issue) => issue.message).join('; ');
    res.status(200).json({
      code: 400,
      message,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  logger.error({ err: error, requestId: req.id, path: req.path }, 'Unhandled exception');
  res.status(200).json({
    code: 500,
    message: 'Something went wrong. Please try again later.',
    timestamp: new Date().toISOString(),
  });
}
