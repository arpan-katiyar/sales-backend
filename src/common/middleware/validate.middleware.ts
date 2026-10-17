import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

import { AppError } from '../errors/app-error.js';

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join('; ');
      next(new AppError(400, message, 200));
      return;
    }
    req.body = parsed.data;
    next();
  };
}

export function validateParams<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join('; ');
      next(new AppError(400, message, 200));
      return;
    }
    Object.assign(req.params, parsed.data);
    next();
  };
}

export function validateQuery<T>(schema: ZodType<T>) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      const message = parsed.error.issues.map((issue) => issue.message).join('; ');
      next(new AppError(400, message, 200));
      return;
    }
    Object.defineProperty(req, 'query', {
      value: parsed.data,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    next();
  };
}
