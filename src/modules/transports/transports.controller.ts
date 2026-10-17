import type { Request, Response } from 'express';

import { AppError } from '../../common/errors/app-error.js';
import { transportService } from './transports.service.js';
import type { TransportBody } from './transports.service.js';

function requireUserId(req: Request): number {
  if (!req.user) {
    throw new AppError(401, 'Missing or invalid session', 401);
  }
  return req.user.userId;
}

function bodyOf(req: Request): Omit<TransportBody, 'userId'> {
  return req.body as Omit<TransportBody, 'userId'>;
}

export async function addTransport(req: Request, res: Response): Promise<void> {
  const result = await transportService.add({ ...bodyOf(req), userId: requireUserId(req) });
  res.status(200).json(result);
}

export async function updateTransport(req: Request, res: Response): Promise<void> {
  const result = await transportService.update(Number(req.params.id), {
    ...bodyOf(req),
    userId: requireUserId(req),
  });
  res.status(200).json(result);
}

export async function deleteTransport(req: Request, res: Response): Promise<void> {
  const result = await transportService.remove(Number(req.params.id), requireUserId(req));
  res.status(200).json(result);
}

export async function getTransports(req: Request, res: Response): Promise<void> {
  const { page, size } = req.query as unknown as { page: number; size: number };
  res.status(200).json(await transportService.list(page, size));
}

export async function searchTransports(req: Request, res: Response): Promise<void> {
  const { keyword, page, size } = req.query as unknown as {
    keyword: string;
    page: number;
    size: number;
  };
  res.status(200).json(await transportService.search(keyword, page, size));
}

export async function getAllTransports(_req: Request, res: Response): Promise<void> {
  res.status(200).json(await transportService.listLite());
}
