import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

const FIVE_MB = 5 * 1024 * 1024;
const TEN_MB = 10 * 1024 * 1024;

const parser = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: FIVE_MB,
    files: 30,
  },
}).any();

export function parseMultipart(req: Request, res: Response, next: NextFunction): void {
  parser(req, res, (error: unknown) => {
    if (error) {
      next(error instanceof Error ? error : new Error('Upload failed'));
      return;
    }
    const files = Array.isArray(req.files) ? req.files : [];
    const total = files.reduce((sum, file) => sum + file.size, 0);
    if (total > TEN_MB) {
      next(new Error('Maximum upload size exceeded'));
      return;
    }
    next();
  });
}
